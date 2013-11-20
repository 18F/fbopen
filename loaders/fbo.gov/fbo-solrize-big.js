//
// fbo-solrize-big.js
//
// From a weekly FBO XML dump file, outputs:
// 1) An XML file containing Solr-ingestible XML of all the listings (per filters below), and
// 2) A text file containing a one-per-line list of all the listings' links (for crawling separately)


var fs = require("fs");
var S = require('string');

// var jsxml = require("node-jsxml");
// var Namespace = jsxml.Namespace,
//     QName = jsxml.QName,
//     XML = jsxml.XML,
//     XMLList = jsxml.XMLList;

var bigXml = require('big-xml');
var date_lite = require('date-format-lite');

// pass only basename: 'FBOFullXML-1k' - ?

var config = require('./fbopen-loader-config.js');

var fileinfo = {
	// input_filename : '/Users/aaron/Downloads/FBOFullXML-1k.xml'
	// , xml_output_filename : 'FBOFullXML-1k-solrized.xml'
	// , links_output_filename : 'FBOFullXML-1k-links.txt'
	// , xml_output_filepath : 'fbo-solrized-1k/'
	// input_filename : '/Users/aaron/Downloads/FBOFullXML-formatted.xml'
	input_filename : config.input_filename || 'FBOFullXML.xml'
	, xml_output_filename : config.xml_output_filename || 'FBOFullXML-solrized.xml'
	, links_output_filename : config.links_output_filename || 'FBOFullXML-links.txt'
	, xml_output_filepath : config.xml_output_filepath || 'fbo-solrized/'
}

process.argv.forEach(function(val, idx, array) {
	// first two args are "node" and this file
	if (idx == 2) fileinfo.input_filename = process.argv[2];
	if (idx == 3) fileinfo.xml_output_filename = process.argv[3];
	if (idx == 4) fileinfo.links_output_filename = process.argv[4];
	if (idx == 5) fileinfo.xml_output_filepath = process.argv[5];
});

console.log('fileinfo: input_filename = ' + fileinfo.input_filename 
	+ ', xml_output_filename = ' + fileinfo.xml_output_filename 
	+ ', links_output_filename = ' + fileinfo.links_output_filename
	+ ', xml_output_filepath = ' + fileinfo.xml_output_filepath
	+ '\n');

var datasource_id = 'FBO';
var notice_types_regex = /^(AWARD|COMBINE|FAIROPP|FSTD|ITB|JA|MOD|PRESOL|SNOTE|SRCSGT|SSALE)$/;
var notice_types = new Array('AWARD', 'COMBINE', 'FAIROPP', 'FSTD', 'ITB', 'JA', 'MOD', 'PRESOL', 'SNOTE', 'SRCSGT', 'SSALE');
// var xml;
var cdata_regex = /<!\[CDATA\[(.*)\]\]>/;

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
	, 'LINK': 'listing_url'
}


// There can be multiple awards per solicitation,
// so the unique Solr ID of each award can't be simply the solicitation number.
// For now, we'll simply count and increment the award ID for each SOLNBR as we go.
var award_counts = {}

Date.masks.default = 'YYYY-MM-DD';
var now = new Date();

// var links_filep = fs.openSync(fileinfo.links_output_filename, 'w');
var links_output_stream = fs.createWriteStream(fileinfo.links_output_filename);

var xml_output_stream = fs.createWriteStream(fileinfo.xml_output_filename);
xml_output_stream.write('<add>\n');

// Loop through the .xml and process each notice
var notice_idx = 0;
var notices_written = 0;

// NEW STRATEGY:
// First:
// - Read all notices (i.e., COMBINE and PRESOL elements).
// - Keep a running list of all SOLNBRs.
// Second:
// - Read all MODs. Update COMBINE records accordingly.
// Third:
// - Read all AWARDS. Load them all in.

// First get all notices
var reader = bigXml.createReader(fileinfo.input_filename, /^COMBINE|PRESOL$/, { gzip: false});
// var reader = bigXml.createReader(fileinfo.input_filename, /^COMBINE$/, { gzip: false});
// var reader = bigXml.createReader(fileinfo.input_filename, /^AWARD$/, { gzip: false});
// var reader = bigXml.createReader(fileinfo.input_filename, /^COMBINE|AWARD$/, { gzip: false});
reader.on('record', function(record) {
	console.log('processing record ' + record['tag'] + ', notice_idx = ' + notice_idx);
	process_notice(record, notice_idx++);
});

reader.on('end', function() {
	console.log('COMBINE+PRESOL notices read = ' + notice_idx + ', notices written = ' + notices_written);
	process_mods();
});

// get all mods
function process_mods() {

	notice_idx = 0;
	notices_written = 0;

	// var mod_reader = bigXml.createReader(fileinfo.input_filename, /^MOD$/, { gzip: false});
	// mod_reader.on('record', function(record) {
	// 	console.log('processing record ' + record['tag'] + ', notice_idx = ' + notice_idx);
	// 	process_notice(record, notice_idx++);
	// });

	// mod_reader.on('end', function() {
	// 	console.log('MODs read = ' + notice_idx + ', notices written = ' + notices_written);
		process_awards();
	// });
}

// get all awards
function process_awards() {

	notice_idx = 0;
	notices_written = 0;

	var award_reader = bigXml.createReader(fileinfo.input_filename, /^AWARD$/, { gzip: false});
	award_reader.on('record', function(record) {
		console.log('processing record ' + record['tag'] + ', notice_idx = ' + notice_idx);
		process_notice(record, notice_idx++);
	});

	award_reader.on('end', function() {
		console.log('AWARD notices read = ' + notice_idx + ', notices written = ' + notices_written);
		close_streams();
	});
}

function close_streams() {
	xml_output_stream.end('</add>');
	links_output_stream.end();
}


/*
 * FUNCTIONS
 */

function process_notice(notice, notice_idx) {
	// collect fields and reformat them for Solr ingestion
	var notice_values = new Array(); // clean values
	var notice_fields = new Array(); // formatted fields for Solr-friendly XML
	var el, el_tag, el_value, solnbr, link_url, s_out, notice_type;
	var email_tag, email_child_el

	notice_type = notice['tag'];

	for (el_idx in notice['children']) {

		el = notice['children'][el_idx];
		el_tag = el['tag'];
		// console.log('... el_idx = ' + el_idx + ', el_tag ' + el_tag);

		// skip CHANGES and DOCUMENT_PACKAGES elements
		if (el_tag.match(/^(CHANGES|DOCUMENT_PACKAGES)$/)) continue;

		// is this another notice type element, embedded within a parent element,
		// e.g., a CHANGES element inside a COMBINE element?
		// TBD: compare el_tag to notice_types or notice_types_regex; save and pass to write_solr_files
		// DOESN'T WORK; big_xml doesn't offer up non-final children.

		// if (el_tag.match(notice_types_regex) != null) {
		// 	// console.log('found ' + el_tag + ' within ' + notice_type);
			// continue;
		// }

		// special: EMAIL consists of two separate children: "ADDRESS" and "DESC"
		if (el_tag == 'EMAIL') {
			if (el['children'].length > 0) {
				for (email_child_el in el['children']) {
					if (email_child_el['tag'] == 'ADDRESS') {
						email_tag = 'EMAIL_ADDRESS';
						notice_fields[email_tag] = format_notice_field(email_tag, clean_field_value(email_child_el));
					}
					if (email_child_el['tag'] == 'DESC') {
						email_tag = 'EMAIL_DESC';
						notice_fields[email_tag] = format_notice_field(email_tag, clean_field_value(email_child_el));
					}
				}
			}
		} else {

			el_value = el['text'];

			if (el_value == undefined) continue;

			notice_values[el_tag] = clean_field_value(el);
			notice_fields[el_tag] = format_notice_field(el_tag, clean_field_value(el));

			// special: id = SOLNBR + notice type (+ __AWARD__ + sequential/unique award it, for AWARDs)
			if (el_tag == 'SOLNBR') {

				solnbr = clean_solnbr(notice_values['SOLNBR']);
				notice_values['SOLNBR'] = solnbr; // store the "extra-clean" (trimmed/slugified) solnbr value

				// For awards, add the sequential number of this award.
				// NOTE: when importing from a daily update file, we will need to query for all existing first.
				// (This could be tricky.)
				notice_solr_id = solnbr;
				if (notice_type == 'AWARD') {
					award_count = ++award_counts[solnbr] || (award_counts[solnbr] = 0);
					notice_solr_id += '__AWARD__' + award_count;
				}

				notice_values['id'] = datasource_id + ':' + notice['tag'] + ":" + notice_solr_id;
				notice_fields['id'] = format_notice_field('id', notice_values['id']);

				// console.log('solnbr ' + solnbr + ': notice_type = ' + notice_type + ', id = ' + notice_fields['id']);

			}

			// if (tag == 'LINK') {
			// 	 link_url = get_field_value(el);
			// }

		} // if tag == EMAIL // else
	} // for el in notice children

	// make sure there is a solnbr and an id (the latter required by Solr)
	if (notice_values['SOLNBR'] === undefined || notice_values['SOLNBR'] == '') {
		console.log('WARNING: SKIPPED RECORD: No SOLNBR for ' + notice_fields['title'] + ', dated ' + notice_fields['posted_dt'] + ', notice_idx = ' + notice_idx);
		return;
	}
	// check for last N (30?) days and a future response date, OR it's an AWARD [don't date-filter those at all]
	// ... on second thought, NO. Let's load EVERYTHING, and filter on date in the queries. More data is better.

	// if (date_in_range(notice_fields) || notice_type == 'AWARD') {
	if (date_in_range(notice_values)) {

		// create Solr-friendly XML for ingestion
		s_out = solr_add_string(notice_fields, notice['tag']);

		write_solr_files(notice_type, notice_values, notice_fields, notice_idx);
	}

} // process_notice()


var date_min = new Date();
// thirty days?
date_min.setDate(now.getDate() - 30);

function date_in_range(notice_values) {


	var ret = true; // default

	// var postdate_orig = notice_fields['DATE'];
	var postdate_s = ((notice_values['DATE'] + '').substr(0, 10)) || '';
	// var respdate_orig = notice_fields['RESPDATE'];
	var respdate_s = ((notice_values['RESPDATE'] + '').substr(0, 10)) || '';

	// console.log('DATE = ' + notice_values['DATE'] + ', RESPDATE = ' + notice_values['RESPDATE']);
	// console.log('postdate_s = ' + postdate_s + ', respdate_s = ' + respdate_s);

	var postdate = new Date(postdate_s.substr(0, 4), postdate_s.substr(5, 2), postdate_s.substr(8, 2));
	var respdate = new Date(respdate_s.substr(0, 4), respdate_s.substr(5, 2), respdate_s.substr(8, 2));

	// console.log('postdate = ' + postdate.toString() + ', respdate = ' + respdate.toString() + ', date_min = ' + date_min.toString);

	if (postdate < date_min) {
		ret = false;
	}
	if (respdate < now) {
		ret = false;
	}

	return ret;

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
	if (S(tag).endsWith('DATE') || S(tag).endsWith('_dt')) {
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
			e_name = datasource_id + '_' + e_name; // prefix non-standard fields
			if (S(e_name).endsWith('DATE')) e_name += '_dt'; // make date fields date-friendly in Solr
		}
	}

	return '<field name="' + e_name + '">' + field_value + '</field>';

} // format_notice_field()


function solrize_date(fbo_date) {
	// fbo_date is MMDDYYYY
	// Solr date is yyyy-MM-dd'T'HH:mm:sss'Z
	var m, d, y;
	m = fbo_date.substr(0, 2);
	d = fbo_date.substr(2, 2);
	y = fbo_date.substr(4, 4);

	return y + "-" + m + "-" + d + "T00:00:00Z";

} // solrize_date()


function solr_add_string(notice_fields, notice_tag) {

	s_out = '<doc>\n' 
			+ '<field name="data_type">opp</field>\n'
			+ '<field name="data_source">' + datasource_id + '</field>\n'
			+ '<field name="notice_type">' + notice_tag + '</field>\n';

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


function write_solr_files(notice_type, notice_values, notice_fields, notice_idx) {

	// write the Solr-ingestible XML file
	// xml_output_filename = fileinfo.xml_output_filepath + notice_values['SOLNBR'] + '--' + notice_idx + '.xml';
	// INEFFICIENT; SKIP IT
	// fs.writeFile(xml_output_filename, '<add>\n' + s_out + '</add>', xml_output_cb(notice_values['SOLNBR']));

	// separately:
	// write to a single large file (faster ingestion?)
	// fs.appendFileSync(fileinfo.xml_output_filename, s_out);
	xml_output_stream.write(s_out, track_xml_completion());

	// write the link to a separate file, but only for certain types
	// fs.appendFileSync(fileinfo.links_output_filename, notice_values['LINK'] + '\n');
	if (notice_type != 'AWARD') {
		// OLD: just write the link
		// links_output_stream.write(notice_values['LINK'] + '\n');
		// NEW: write all info relevant to the attachment listing:
		// link, naics
		links_output_stream.write(notice_values['LINK'] + ' ' + notice_values['NAICS'] + '\n');
	}

} // write_solr_files()

function xml_output_cb(str) {
	console.log('wrote ' + str);
}

function track_xml_completion() {
	notices_written++;
}

// function get_child(record, depth) {
	
// 	indent_str = S(' ').repeat(depth).s;
// 	console.log(indent_str + 'tag: ' + record['tag']);

// 	if (record['text'] != undefined) {
// 		if ((record['text']).replace(/\s*/g, '').length > 0) console.log(indent_str + 'text: ' + record['text']);
// 	}

// 	if (record['children'] != undefined) {
// 		if (record['children'].length > 0) {
// 			for (child in record['children']) {
// 				console.log(indent_str + 'child: ');
// 				get_child(record['children'][child], depth + 2);
// 			}
// 		}
// 	}
// }

