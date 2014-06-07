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
  , tools = require('../common/tools')
	;

var config = require('./grants-loader-config.js');

var log_file = config.log_file || 'grants-nightly.log';
var datasource_id = config.datasource_id || 'grants.gov';
var datetime_now = moment();

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
	xml_file = config.input_filename || 'downloads/GrantsDBExtract' + datetime_now.subtract('days', 1).format('YYYYMMDD') + '.xml';
}

if (argv.j) {
	json_file = argv.j;
} else {
	json_file = config.json_filename || 'downloads/grants-ids-' + datetime_now.subtract('days', 1).format('YYYYMMDD') + '.json';
}

if (argv.o){
    output_file = argv.o;
} else {
    output_file = 'workfiles/grants.json';
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

var output_data = [];

// oppHits[0].id == unique ID, oppHits[0].number == solnbr

//var xml_output_stream = fs.createWriteStream(config.xml_output_filename || 'workfiles/listings-solrized.xml');
//xml_output_stream.write('<add>\n');
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
    fs.writeFile(output_file, output_data.join('\n'));
	console.log('\n\nTOTAL GRANT NOTICES READ = ' + notice_idx + ', TOTAL WRITTEN = ' + notices_written);
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
	, 'listing_url': 'listing_url' // constructed below
};

var multiple_list = ['EligibilityCategory', 'AgencyContact', 'FundingInstrumentType', 'FundingActivityCategory', 'CFDANumber'];
var skip_list = [ 'UserID', 'Password' ];

function process_notice(notice, notice_idx) {

  var es_obj = { 'ext': {} };
	// collect fields and reformat them for Solr ingestion
	var notice_values = new Array(); // clean values
	var notice_fields = new Array(); // formatted fields for Solr-friendly XML
	var el, el_tag, el_value, solnbr, solnbr_raw, link_url, s_out, notice_type;
	var email_tag, email_child_el;

	notice_type = notice['tag']; // always "FundingOppSynopsis" or "FundingOppModSynopsis"

	for (var el_idx in notice.children) {

		el = notice['children'][el_idx];
		el_tag = el['tag'];
    el_value = clean_field(el);

		// skip certain fields
		if (skip_list.indexOf(el_tag) > -1) continue;
        
		// other than FundingOppNumber (below), skip empty fields
    if ((el_value === 'None' || el_value === '' || el_value === undefined) && el_tag != 'FundingOppNumber') {
			continue;
		}
        
    //Add tag to json notice object
    if (el_tag in field_map){
        es_obj[field_map[el_tag]] = el_value;
    } else if (multiple_list.indexOf(el_tag) > -1) {
        if(es_obj['ext'][el_tag] !== undefined) {
            es_obj['ext'][el_tag].push(el_value);
        } else {
            es_obj['ext'][el_tag] = [el_value];
        }
    } else {
        es_obj['ext'][el_tag] = el_value;
    }

		// TESTING
		// console.log('tag ' + el_tag + ' == ' + el_value + '.');
		// if (el.tag == 'ObtainFundingOppText') {
		// 	console.log('.. FundingOppURL == ' + el.attrs.FundingOppURL);
		// }

		// handle this el
		notice_values[el_tag] = clean_field(el);
		// special: id = SOLNBR + notice type (+ __AWARD__ + sequential/unique award it, for AWARDs)
		// ... AND use solnbr for lookup to construct listing_url
		if (el_tag == 'FundingOppNumber') {

			solnbr_raw = el['text'];
			solnbr = tools.clean_solnbr(el_value);

			// For awards, add the sequential number of this award.
			notice_id = solnbr;
			// if (notice_type == 'AWARD') {
			// 	award_count = ++award_counts[solnbr] || (award_counts[solnbr] = 0);
			// 	notice_solr_id += '__AWARD__' + award_count;
			// }

      es_obj['id'] = datasource_id + ':' + notice_id;
      es_obj['data_source'] = datasource_id;

			// console.log('solnbr ' + solnbr + ': notice_type = ' + notice_type + ', id = ' + notice_fields['id']);
		}

	} // for el_idx in notice['children']


	// FOR NOW, only load grants that haven't closed yet
	if (moment(es_obj['close_dt'], 'YYYY-MM-DD') > datetime_now) {
		// get the unique ID, via REST request, to construct the URL
		es_obj['listing_url'] = get_listing_url(solnbr_raw);
    output_data.push(JSON.stringify(es_obj));
    track_output_completion();
	}
}


function clean_field(field_el) {
  // get field value, and:
  // remove "<![CDATA[" and "]]>" if necessary
  // replace <p> and <br> tags with newlines

  var field_value = field_el['text']
    .replace(cdata_regex, "$1")
    .replace(/<\/*p>/g, '\n')
    .replace(/<br *\/*>/g, '\n')
  ;

  return tools.clean_field_value(field_el.tag, field_value);
}


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

function track_output_completion() {
	notices_written++;
}

function simple_log(str, console_too) {
	str = moment().format('YYYY-MM-DD hh:mm:ss') + ' ' + S(str).trim().s + '\n';
	fs.appendFileSync(log_file, str);
	// write to console, too
	if (console_too) console.log(str);
}
