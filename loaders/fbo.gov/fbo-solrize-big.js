//
// fbo-solrize-big.js
//
// From a weekly FBO XML dump file on STDIN, output JSON on STDOUT consisting of all the listings
// example inovocation:
// cat workfiles/FBOFullXML.xml| node fbo-solrize-big.js > workfiles/notices-weekly.json

var S = require('string');
var XmlSplitter = require('xml-splitter');
var moment = require('moment');

var xs = new XmlSplitter('/NOTICES/(COMBINE|PRESOL|MOD)')

var datasource_id = 'FBO';
// var notice_types_regex = /^(AWARD|COMBINE|FAIROPP|FSTD|ITB|JA|MOD|PRESOL|SNOTE|SRCSGT|SSALE)$/;
// var notice_types = new Array('AWARD', 'COMBINE', 'FAIROPP', 'FSTD', 'ITB', 'JA', 'MOD', 'PRESOL', 'SNOTE', 'SRCSGT', 'SSALE');

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
var award_counts = {};

var now = new Date();

xs.on('data', function(data, tag) {
    notice = process_notice(data, tag);
    if (notice) console.log(JSON.stringify(notice));
});

process.stdin.pipe(xs.stream);


/*
 * FUNCTIONS
 */

function process_notice(notice, notice_type) {
    var notice_new = {};

	for (key in notice) {
		// skip CHANGES and DOCUMENT_PACKAGES elements
		if (key.match(/^(CHANGES|DOCUMENT_PACKAGES)$/)) continue;

        var name = map_field_name(key);

		// is this another notice type element, embedded within a parent element,
		// e.g., a CHANGES element inside a COMBINE element?
		// TBD: compare key to notice_types or notice_types_regex; save and pass to write_solr_files
		// DOESN'T WORK; big_xml doesn't offer up non-final children.

		// special: EMAIL consists of two separate children: "ADDRESS" and "DESC"
		if (key == 'EMAIL') {

            if (notice[key]['ADDRESS']); notice_new[map_field_name('EMAIL_ADDRESS')] = format_value(notice[key]['ADDRESS']);
            if (notice[key]['DESC']); notice_new[map_field_name('EMAIL_DESC')] = format_value(notice[key]['DESC']);
		} else {
            // process all other fields

			notice_new[name] = clean_field_value(name, notice[key]);

			// special: id = SOLNBR + notice type (+ __AWARD__ + sequential/unique award it, for AWARDs)
			if (key == 'SOLNBR') {

				solnbr = clean_solnbr(format_value(notice[key])); // store the "extra-clean" (trimmed/slugified) solnbr value
                notice_new[name] = solnbr;

				// For awards, add the sequential number of this award.
				// NOTE: when importing from a daily update file, we will need to query for all existing first.
				// (This could be tricky.)
                // AKR NOTE/TODO: We should be able to do this via a script update in ES (we can increment a counter value with an insert/update)
                // removing for now. We can also make awards subrecords in Elasticsearch...
				// notice_solr_id = solnbr;
				// if (notice_type == 'AWARD') {
				// 	award_count = ++award_counts[solnbr] || (award_counts[solnbr] = 0);
				// 	notice_solr_id += '__AWARD__' + award_count;
				// }

				// notice_new['_id'] = datasource_id + ':' + notice_type + ":" + notice_solr_id;
				notice_new['_id'] = datasource_id + ':' + notice_type + ":" + solnbr;
			}
		} // if key == EMAIL // else
	} // for el in notice children

	// make sure there is a solnbr and an id (the latter required by Solr)
	if (typeof notice_new['solnbr'] == 'undefined' || notice_new['solnbr'] == '') return;

    // let's forget the date checking and get all the data, including historical
	//if (date_in_range(notice_new)) {
    notice_new['data_source'] = datasource_id;
    notice_new['notice_type'] = notice_type;
    return notice_new;
	//}

} // process_notice()


var date_min = new Date();
// thirty days?
date_min.setDate(date_min.getDate() - 30);

function date_in_range(notice) {
    console.log(notice['posted_dt']);
    if (notice['posted_dt'] && (moment(notice['posted_dt']) < date_min)) {
        return false;
    }
    if (notice['respdate_dt'] && (moment(notice['respdate_dt']) < now)) {
        return false;
    }

	return true; // default
}

function clean_field_value(key, value_hash) {
    value = format_value(value_hash);

	// get field value, and:
	// replace <p> and <br> tags with newlines

	var field_value = value
		.replace(/<\/*p>/g, '\n')
		.replace(/<br *\/*>/g, '\n')
		;

	// unescape entity codes; strip out all other HTML
	field_value = S(field_value).decodeHTMLEntities().stripTags().s;

	if (S(key).endsWith('_dt')) {
		field_value = format_date(field_value);
	}

	return field_value;	
}


function clean_solnbr(solnbr) {
	return S(solnbr).trim().slugify().s;
}

function format_value(value) {
    value_key = value['$cd'] ? '$cd' : '$t';
    if (value[value_key]) {
        return value[value_key];
    } else {
        return '';
    }
}

function map_field_name(name) {
    if (name in field_map) {
        name = field_map[name];
    } else {
        name = datasource_id + '_' + name; // prefix non-standard fields
        if (S(name).endsWith('DATE')) name += '_dt'; // signify date fields with a suffix
        name = name.toLowerCase();
    }

    return name;
}

function format_date(fbo_date) {
	// fbo_date is MMDDYYYY
	return moment(fbo_date, 'MMDDYYYY').format('YYYY-MM-DD');
} // format_date()



