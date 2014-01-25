//
// grants-nightly.js
//

// TO DO:
//
//
// *** ensure that FundingOppModSynopsis records are in mod/date order;
// if not, we will need to store, sort, and then process them in order,
// instead of processing them in the order in which we encounter them in the input file (as we do now)
//
// at a quick glance, it LOOKS like this will be unnecessary because the mods are all in order.


var fs = require("fs")
	, S = require('string')
	, _ = require('underscore')
	, bigXml = require('big-xml')
	, request = require('request')
	, moment = require('moment')
	, date_format_lite = require('date-format-lite')
	, optimist = require('optimist')
	;

var config = require('./grants-loader-config.js');

var log_file = config.log_file || 'grants-nightly.log';
var datasource_id = config.datasource_id || 'grants.gov';

var cdata_regex = /<!\[CDATA\[(.*)\]\]>/;

// command line options
var argv = optimist
	.usage('Usage: node grants-nightly.js [-f xmlfile] [-j jsondata]')
	.alias('f', 'file')
	.describe('f', 'optional XML file to process; default = downloads/GrantsDBExtract[YYYYMMDD].xml')
	.alias('j', 'jsondata')
	.describe('j', 'optional JSON file to use for id-to-URL mapping; default = downloads/grants-ids-latest.json')
	.alias('h', 'Help')
	.argv;

if (argv.h) { // show help
	console.log(optimist.help());
	process.exit(0);
}

if (argv.f) {
	xml_file = argv.f;
} else {
	xml_file = config.input_filename || 'downloads/GrantsDBExtract' + moment().subtract('days', 1).format('YYYYMMDD') + '.xml';
}

if (argv.j) {
	json_file = argv.j;
} else {
	json_file = config.json_filename || 'downloads/grants-ids-' + moment().subtract('days', 1).format('YYYYMMDD') + '.json';
}

simple_log('Processing ' + xml_file + ' using ' + json_file);

// exit if no JSON file is provided
var file_exists = fs.existsSync(json_file);
if (!file_exists) {
	simple_log('ERROR: no such file ' + json_file, false);
	console.error('ERROR: no such file ' + json_file);
	process.exit(1);
}

// exit if no XML file is provided
var file_exists = fs.existsSync(xml_file);
if (!file_exists) {
	simple_log('ERROR: no such file ' + xml_file, false);
	console.error('ERROR: no such file ' + xml_file);
	process.exit(1);
}

// load the JSON into memory
var json_data = JSON.parse(fs.readFileSync(json_file));
var oppHits = json_data.oppHits;
console.log('oppHits count = ' + oppHits.length);

// oppHits[0].id == unique ID, oppHits[0].number == solnbr

var xml_output_stream = fs.createWriteStream(config.xml_output_filename || 'workfiles/listings-solrized.xml');
xml_output_stream.write('<add>\n');

var reader = bigXml.createReader(xml_file, /^FundingOppSynopsis|FundingOppModSynopsis$/, { gzip: false});
var notice_idx = 0;
var notices_written = 0;

reader.on('record', function(record) {
	// if (notice_idx < 5) { // TESTING
	if (notice_idx % 1000 == 0) console.log('processed ' + notice_idx + ' records so far, written = ' + notices_written);
	process_notice(record, notice_idx++);
	// } // TESTING
});

reader.on('end', function() {
	console.log('\n\nTOTAL GRANT NOTICES READ = ' + notice_idx + ', TOTAL WRITTEN = ' + notices_written);
	close_streams();
});


var field_map = {
	'FundingOppNumber': 'solnbr' // note: if empty, ... ?
	, 'PostDate': 'posted_dt'
	, 'FundingOppTitle': 'title'
	, 'Agency': 'agency'
	, 'Office': 'office'
	, 'Location': 'location'
	, 'ApplicationsDueDate': 'close_dt'
	, 'FundingOppDescription': 'description'
	, 'AwardCeiling': 'AwardCeiling_i' // but note could be "None"; we'll ignore
	, 'AwardFloor': 'AwardFloor_i' // but note could be "None"; we'll ignore
	, 'ArchiveDate': 'ArchiveDate_dt'
	, 'AgencyContact': 'AgencyContact_t'
	, 'listing_url': 'listing_url' // constructed below
}

var skip_list = [ 'UserID', 'Password' ];


function process_notice(notice, notice_idx) {

	// collect fields and reformat them for Solr ingestion
	var notice_values = new Array(); // clean values
	var notice_fields = new Array(); // formatted fields for Solr-friendly XML
	var el, el_tag, el_value, solnbr, solnbr_raw, link_url, s_out, notice_type;
	var email_tag, email_child_el

	notice_type = notice['tag']; // always "FundingOppSynopsis" or "FundingOppModSynopsis"

	for (el_idx in notice['children']) {

		el = notice['children'][el_idx];
		el_tag = el['tag'];
		el_value = el['text'];

		// TESTING
		// console.log('tag ' + el_tag + ' == ' + el_value + '.');
		// if (el.tag == 'ObtainFundingOppText') {
		// 	console.log('.. FundingOppURL == ' + el.attrs.FundingOppURL);
		// }

		// skip certain fields
		if (skip_list.indexOf(el_tag) > -1) continue;

		// other than FundingOppNumber (below), skip empty fields
		if ((el_value === 'None' || el_value === '' || el_value === undefined) && el_tag != 'FundingOppNumber') {
			continue;
		}

		// handle this el
		notice_values[el_tag] = clean_field_value(el);
		notice_fields[el_tag] = format_notice_field(el_tag, clean_field_value(el));

		// special: id = SOLNBR + notice type (+ __AWARD__ + sequential/unique award it, for AWARDs)
		// ... AND use solnbr for lookup to construct listing_url
		if (el_tag == 'FundingOppNumber') {

			solnbr_raw = notice_values['FundingOppNumber'];
			solnbr = clean_solnbr(notice_values['FundingOppNumber']);
			notice_values['FundingOppNumber'] = solnbr; // store the "extra-clean" (trimmed/slugified) solnbr value

			// For awards, add the sequential number of this award.
			// NOTE: when importing from a daily update file, we will need to query for all existing first.
			// (This could be tricky.)
			notice_solr_id = solnbr;
			// if (notice_type == 'AWARD') {
			// 	award_count = ++award_counts[solnbr] || (award_counts[solnbr] = 0);
			// 	notice_solr_id += '__AWARD__' + award_count;
			// }

			notice_values['id'] = datasource_id + ':' + notice_solr_id;
			notice_fields['id'] = format_notice_field('id', notice_values['id']);

			// console.log('solnbr ' + solnbr + ': notice_type = ' + notice_type + ', id = ' + notice_fields['id']);

		}

		// handle any possible children (only ever runs one level deep)
		if (el['children'] != undefined) {
			if (el['children'].length > 0) {
				for (child_el in el['children']) {
					child_tag = child_el['tag'] + '_t'; // always assume strings
					notice_fields[child_tag] = format_notice_field(child_tag, clean_field_value(child_el));
				}
			}
		}

		// if (tag == 'LINK') {
		// 	 link_url = get_field_value(el);
		// }

	} // for el_idx in notice['children']

	// FOR NOW, only load grants that haven't closed yet
	if (moment(notice_values['ApplicationsDueDate'], 'YYYY-MM-DD[T]HH:mm:ss[Z]') > moment()) {

		// get the unique ID, via REST request, to construct the URL
		notice_values['listing_url'] = get_listing_url(solnbr_raw);
		notice_fields['listing_url'] = format_notice_field('listing_url', notice_values['listing_url']);

		// console.log('Writing one grant, close_dt = ' + notice_values['ApplicationsDueDate']);

		// create Solr-friendly XML for ingestion
		s_out = solr_add_string(notice_fields, notice['tag']);

		// write it out
		write_solr_files(notice_type, notice_values, notice_fields, notice_idx);
		
	}

}

function clean_field_value(field_el) {

	// get field value, and:
	// remove "<![CDATA[" and "]]>" if necessary
	// replace <p> and <br> tags with newlines
	// remove HTML entity codes ("&xyz;") [note: is there a better function?]

	var field_value = field_el['text']
		.replace(cdata_regex, "$1")
		.replace(/<\/*p>/g, '\n')
		.replace(/<br *\/*>/g, '\n')
		;

	// unescape entity codes; strip out all other HTML
	field_value = S(field_value).escapeHTML().stripTags().s;

	if (field_value == '') return '';

	// make dates Solr-friendly
	tag = field_el['tag'];
	// if (tag == 'DATE' || tag == 'RESPDATE' || tag == 'ARCHDATE' || tag == 'AWDDATE') {
	if (S(tag).endsWith('DATE') 
		|| S(tag).endsWith('date') 
		|| S(tag).endsWith('Date') 
		|| S(tag).endsWith('_dt')) {
		
		// console.log('e_name = ' + e_name + ', pre-solrized date = [' + field_value + ']');
		field_value = solrize_date(field_value);
		// console.log('solrized = [' + field_value + ']');
	}

	return field_value;	
}


function clean_solnbr(solnbr) {
	return S(solnbr).trim().slugify().s;
}

function format_notice_field(e_name, field_value) {
	
	// return nothing for empty values
	if (field_value.length == 0 || field_value == undefined) return '';

	// OLD: make sure field names are unique in Solr
	// if (e_name != 'id') e_name = 'FBO_' + e_name;

	// NEW: map field names to Solr
	if (e_name != 'id') {
		mapped_field = field_map[e_name];
		if (mapped_field) {
			e_name = mapped_field;
		} else {
			// prefix non-standard fields with the datasource
			if (S(e_name).endsWith('DATE')) {
				e_name = datasource_id + '_' + e_name + '_dt'; // make date fields data-friendly in Solr
			} else {
				e_name = datasource_id + '_' + e_name + '_t'; // default = text field
			}
		}
	}

	return '<field name="' + e_name + '">' + field_value + '</field>';

} // format_notice_field()


function solrize_date(raw_date) {
	// dates from grants.gov are always MMDDYYYY
	// Solr date is yyyy-MM-dd'T'HH:mm:sss'Z
	var dt = moment(raw_date, ['MMDDYYYY', 'MMDDYY']);

	if (dt.isValid()) {
		// simple_log('fbo_date = ' + fbo_date + ', dt = ' + dt.format('YYYY-MM-DD'));
		dt_out = dt.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
		return dt_out;
	} else {
		simple_log('WARNING: momentjs could not convert [' + fbo_date + '] into a valid date.', true);
		return false;
	}

} // solrize_date()



function solr_add_string(notice_fields, notice_tag) {

	s_out = '<doc>\n' 
			+ '<field name="data_source">' + datasource_id + '</field>\n';

	// for now, just write it all out
	for (e in notice_fields) {
		if (notice_fields[e] != '' && notice_fields[e] != undefined) {
			s_out += notice_fields[e] + '\n';
			// console.log('s_out for ' + e + ' = ' + notice_fields[e]);
		}
	}
	s_out += '</doc>\n';

	return s_out;

} // solr_add_string()



function get_listing_url(solnbr_raw) {
	// oppHits[0].id == unique ID, oppHits[0].number == solnbr
	// simple_log('searching oppHits for solnbr_raw = ' + solnbr_raw, false);
	// oppHit = _.findWhere(oppHits, {number: solnbr});
	oppHit = _.findWhere(oppHits, {number: solnbr_raw});
	if (oppHit) {
		listing_url = 'http://www.grants.gov/web/grants/view-opportunity.html?oppId=' + oppHit.id;
		simple_log('Found id ' + oppHit.id + ' for solnbr ' + solnbr_raw, false);
	} else {
		listing_url = '';
		simple_log('Warning: could not find id matching solnbr ' + solnbr_raw, true);
	}
	return listing_url;
}


function write_solr_files(notice_type, notice_values, notice_fields, notice_idx) {
	xml_output_stream.write(s_out, track_xml_completion());
}


function track_xml_completion() {
	notices_written++;
}

function close_streams() {
	xml_output_stream.end('</add>');
}


function simple_log(str, console_too) {
	str = moment().format('YYYY-MM-DD hh:mm:ss') + ' ' + S(str).trim().s + '\n';
	fs.appendFileSync(log_file, str);
	// write to console, too
	if (console_too) console.log(str);
}
