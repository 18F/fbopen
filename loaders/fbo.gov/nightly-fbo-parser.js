// nightly-fbo-parser.js

/*
	TO-DO:
	DONE 	* load nightly file
	* scheduled automatic nightly download
	DONE 	* parse and save nightly file to JSON
	DONE 	* load all PRESOLs and COMBINEs into Solr
	* figure out how to handle MODs -- some DESC describe the change while others re-describe the solicitation
		-- either way, requires Solr lookup to see whether we even have the listing (if we don't, we have to ignore the MOD)
	* download attachments
		-- this should be as simple as calling process-listing-links.sh < [links-YYYYMMDD.txt links file]

 */

var fs = require("fs");
var parser = require("./nightly-fbo-parser-def");
var jsftp = require('jsftp');
var S = require('string');
var moment = require('moment');
var date_format_lite = require('date-format-lite');
var solr = require('solr-client');

var log_file = 'nightly-fbo.log';

// Create Solr client
var solr_client = solr.createClient();
solr_client.autoCommit = true; // Switch on "auto commit"

// command line options
var optimist = require('optimist');
var argv = optimist
	.usage('Usage: nightly-fbo-parser [-d date] [-f] [-o]')
	.alias('d', 'date')
	.describe('d', 'optional date to download, in YYYYMMDD format; default = yesterday')
	.alias('f', 'force')
	.describe('f', 'Force download even if file already exists')
	.alias('o', 'download-only')
	.describe('o', 'Download file but do not process')
	.alias('h', 'Help')
	.argv;

if (argv.h) {
	console.log(optimist.help());
	process.exit(0);
}

var force_download = argv.f;


var datasource_id = 'FBO';
var field_map = {
	'DATE': 'posted_dt'
	, 'SUBJECT': 'title'
	, 'AGENCY': 'agency'
	, 'OFFICE': 'office'
	, 'LOCATION': 'location'
	, 'ZIP': 'zipcode'
	, 'SOLNBR': 'solnbr'
	, 'RESPDATE': 'close_dt'
	, 'DESC': 'description'
	, 'URL': 'listing_url'
}



var nightly_download_date_str = get_download_date_str(argv.d);
var nightly_filename = 'FBOFeed' + nightly_download_date_str;
var download_filename = 'nightly-downloads/' + nightly_filename + '.txt';
var nightly_json = 'nightly-downloads/' + nightly_filename + '.json';

simple_log('Starting nightly-fbo-parser for ' + nightly_filename, true);

// set up output file to store listings' links (to download attachments, separately; see [file TBD] )
var nightly_links_file = 'workfiles/links-' + nightly_download_date_str + '.txt';
var links_output_stream = fs.createWriteStream(nightly_links_file);

// download if we don't have it yet
var file_exists = fs.existsSync(nightly_json);

// test
if (file_exists) simple_log(nightly_json + ' already exists', true);

if (!file_exists || argv.f) {

	// test
	// simple_log('get_and_process_notices: ' + nightly_filename);

	get_and_process_notices(nightly_filename, download_filename);
	// process.exit(0);

} else {

	// test
	simple_log('loading from file: ' + nightly_json, true);

	notices_str = fs.readFileSync(nightly_json);
	notices = JSON.parse(notices_str);

	if (!argv.o) {
		process_notices(notices);
	} else {
		process.exit(0);
	}
	// process.exit(1);
}


function get_and_process_notices(nightly_filename, download_filename) {

	var ftp = new jsftp({ host: 'ftp.fbo.gov' });
	ftp.get(nightly_filename, download_filename, function(hadErr) {
		if (hadErr) {
			simple_log('ERROR: could not download file' + nightly_filename + '.', false);
			console.error('ERROR: could not download file' + nightly_filename + '.');
			process.exit(1);
		} else {

			simple_log('Downloaded ' + nightly_filename + '.', true);

			// parse it into JSON
			var notices = parser.parse(fs.readFileSync(download_filename, 'UTF-8'));
			
			// save to file
			fs.writeFileSync(nightly_json, JSON.stringify(notices, undefined, 2));

			simple_log('Parsed and saved to ' + nightly_json + '.', true);

			if (!argv.o) {
				process_notices(notices);
				return;
			} else {
				process.exit(0);
			}
		}

	});

	return;

} // get_and_process

function process_notices(notices) {

	// simple_log('process_notices() ...');

	// process it
	total_processed = 0;
	notice_count = 0;
	for (notice_idx in notices) {
		notice = notices[notice_idx][0];
		// simple_log('notice = ' + JSON.stringify(notice, undefined, 2));
		// simple_log('notice PRESOL = ' + JSON.stringify(notice.PRESOL, undefined, 2));
		// simple_log('solnbr = ' + notice.PRESOL.SOLNBR);
		for (notice_type in notice) {
			// simple_log('notice type = ' + notice_type);

			if (notice_type == 'PRESOL' || notice_type == 'COMBINE') {
				process_notice(notice_type, notice[notice_type]);
				total_processed++;
			}

		}
		notice_count++;
		
	}

	simple_log('Done, total posted = ' + total_processed + ' out of ' + notice_count + ' notices in the file.', true);

	// close up
	links_output_stream.end();

}

function process_notice(notice_type, notice) {

	// build JSON for the notice
	notice_json = build_notice_json(notice_type, notice);

	// log the listing link for attachment download
	links_output_stream.write(notice.URL + '\n');

	// post it to Solr
	post_notice_to_solr(notice_json);

}

function post_notice_to_solr(notice_json) {

	solr_client.add(notice_json, function(err, obj) {
		if (err) {
			err_str = 'ERROR: solr_client.add failed on id = ' + notice_json.id + ', error = ' + err;
			console.error(err_str);
			simple_log(err_str, false);
		} else {
			simple_log('added: id = ' + notice_json.id + ', Solr returned ' + JSON.stringify(obj), false);
		}
	});
}


function build_notice_json(notice_type, notice) {

	notice_out = {};
	notice_out.data_type = 'opp';
	notice_out.data_source = datasource_id;
	notice_out.notice_type = notice_type;

	notice_out.solnbr = clean_solnbr(notice.SOLNBR);
	notice_out.id = datasource_id + ':' + notice_type + ':' + notice_out.solnbr;

	var mapped_field;

	for (field in notice) {

		// skip solnbr, already handled above
		if (field == 'SOLNBR') continue;

		// skip YEAR because it gets combined with DATE instead (smh)
		if (field == 'YEAR') continue;

		// 'DESC2' is always "Link to Document"
		if (field == 'DESC2') continue;

		// skip empty fields
		if (notice[field] == '') continue;

		// get the proper field name: 
		// some are mapped to core FBOpen Solr fields, 
		// others simply prefixed "FBO_", 
		// and non-core date fields get "_dt" added.

		// simple_log('field = ' + field);

		mapped_field = field_map[field];
		if (mapped_field) {
			field_out = mapped_field;
		} else {
			field_out = datasource_id + '_' + field; // prefix non-standard fields
			if (S(field_out).endsWith('DATE')) field_out += '_dt'; // make date fields date-friendly in Solr
		}

		// exceptions
		if (field == 'EMAIL' || field == 'EMAIL2') {
			field_out = 'FBO_EMAIL_ADDRESS';
			// notice_out.FBO_EMAIL_ADDRESS = clean_field_value(field, notice[field]);
		}
		if (field == 'DESC3') { // email description always goes here (smh)
			field_out = 'FBO_EMAIL_DESC';
			// notice_out.FBO_EMAIL_DESC = clean_field_value(field, notice[field]);
		}

		val_in = notice[field];
		if (field == 'DATE') {
			val_in = val_in + notice.YEAR;
		}

		// fix up data fields
		val_out = clean_field_value(field, val_in);

		// add to the notice JSON
		notice_out[field_out] = val_out;

	}
	
	// TEST
	// simple_log('notice_out = ' + JSON.stringify(notice_out, undefined, 2));

	return notice_out;

}

function clean_field_value(field, val) {

	// get field value, and:
	// remove "<![CDATA[" and "]]>" if necessary
	// replace <p> and <br> tags with newlines
	// remove HTML entity codes ("&xyz;") [note: is there a better function?]

	// unescape entity codes; strip out all other HTML
	var field_value = S(val).escapeHTML().stripTags().s;

	if (field_value == '') return '';

	// make dates Solr-friendly
	// if (tag == 'DATE' || tag == 'RESPDATE' || tag == 'ARCHDATE' || tag == 'AWDDATE') {
	if (S(field).endsWith('DATE') || S(field).endsWith('_dt')) {
		// simple_log('e_name = ' + e_name + ', pre-solrized date = [' + field_value + ']');
		field_value = solrize_date(field_value);
		// simple_log('solrized = [' + field_value + ']');
	}

	return field_value;	
}


function clean_solnbr(solnbr) {
	return S(solnbr).trim().slugify().s;
}

function solrize_date(fbo_date) {
	// fbo_date is MMDDYYYY or MMDDYY
	// Solr date is yyyy-MM-dd'T'HH:mm:sss'Z
	var dt = moment(fbo_date, ['MMDDYY', 'MMDDYYYY']);

	if (dt.isValid()) {
		
		// simple_log('fbo_date = ' + fbo_date + ', dt = ' + dt.format('YYYY-MM-DD'));

		dt_out = dt.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
		return dt_out;
	} else {
		simple_log('WARNING: momentjs could not convert [' + fbo_date + '] into a valid date.', true);
		return false;
	}

} // solrize_date()



function get_download_date_str(dt_str) {

	if (dt_str) {
		download_date_str = dt_str;
	} else {
		var download_dt = moment().subtract('days', 1);
		var download_date_str = download_dt.format('YYYYMMDD');
	}

	// process.argv.forEach(function(val, idx, array) {
	// 	// first two args are "node" and this file
	// 	// next arg is an optional date
	// 	if (idx == 2) download_date_str = process.argv[2];
	// });

	return download_date_str;
}

function simple_log(str, console_too) {
	str = moment().format('YYYY-MM-DD hh:mm:ss') + ' ' + S(str).trim().s + '\n';
	fs.appendFileSync(log_file, str);
	// write to console, too
	if (console_too) console.log(str);
}
