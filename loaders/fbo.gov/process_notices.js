var moment = require('moment');
var S = require('string');
var fs = require('fs');
process.stdin.resume();
var stdin = process.stdin;

var notices = '';
stdin.on('data', function(chunk) {
	notices += chunk;
});
notices_json = {};
stdin.on('end', function() {
	notices_json = JSON.parse(notices);
});

var output = fs.openSync(process.argv[2], 'w');

function process_notices(links_output_stream, notices) {

	simple_log('process_notices() ...');

	// process it
	total_processed = 0;
	notice_count = 0;
	simple_log(notices);
	for (notice_idx in notices) {
		notice = notices[notice_idx][0];
		simple_log('notice = ' + JSON.stringify(notice, undefined, 2));
		simple_log('notice PRESOL = ' + JSON.stringify(notice.PRESOL, undefined, 2));
		simple_log('solnbr = ' + notice.PRESOL.SOLNBR);
		for (notice_type in notice) {
			simple_log('notice type = ' + notice_type);

			if (notice_type == 'PRESOL' || notice_type == 'COMBINE') {
				process_notice(notice_type, notice[notice_type]);
				total_processed++;
			}

		}
		notice_count++;
		
	}

	simple_log('Done, total posted = ' + total_processed + ' out of ' + notice_count + ' notices in the file.', true);
}
process_notices(output, notices_json);

function process_notice(links_output_stream, notice_type, notice) {

	// build JSON for the notice
	notice_json = build_notice_json(notice_type, notice);

	// log the listing link for attachment download
	links_output_stream.write(notice.URL + '\n');

	// post it to Solr
	// post_notice_to_solr(notice_json);

}

//function post_notice_to_solr(notice_json) {
//
//	solr_client.add(notice_json, function(err, obj) {
//		if (err) {
//			err_str = 'ERROR: solr_client.add failed on id = ' + notice_json.id + ', error = ' + err;
//			console.error(err_str);
//			simple_log(err_str, false);
//		} else {
//			simple_log('added: id = ' + notice_json.id + ', Solr returned ' + JSON.stringify(obj), false);
//		}
//	});
//}


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
	//fs.appendFileSync(log_file, str);
	// write to console, too
	console_too = true;
	if (console_too) console.log(str);
}
