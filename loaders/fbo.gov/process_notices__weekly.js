//
// process_notices__weekly.js
//
// From a weekly FBO XML dump file on STDIN, output JSON on STDOUT consisting of
// all the listings. Example inovocation:
// cat workfiles/FBOFullXML.xml | node process_notices__weekly.js > workfiles/notices-weekly.json

var S = require('string');
var XmlSplitter = require('xml-splitter');
var moment = require('moment');
var tools = require('../common/tools');

var xs = new XmlSplitter('/NOTICES/(COMBINE|PRESOL|MOD)');

// var notice_types_regex = /^(AWARD|COMBINE|FAIROPP|FSTD|ITB|JA|MOD|PRESOL|SNOTE|SRCSGT|SSALE)$/;
// var notice_types = new Array('AWARD', 'COMBINE', 'FAIROPP', 'FSTD', 'ITB', 'JA', 'MOD', 'PRESOL', 'SNOTE', 'SRCSGT', 'SSALE');

var datasource_id = 'fbo.gov';

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
};

var now = new Date();

xs.on('data', function(data, tag) {
    notice = process_notice(data, tag);
    if (notice) console.log(JSON.stringify(notice));
});

process.stdin.pipe(xs.stream);

function process_notice(notice, notice_type) {
    var notice_new = { ext: {} };

	for (var key in notice) {
		if (key.match(/^(CHANGES|DOCUMENT_PACKAGES)$/)) continue;

    mapped_field = field_map[key];
    ext_field = key.toLowerCase();

		// special: EMAIL consists of two separate children: "ADDRESS" and "DESC"
		if (key == 'EMAIL') {
      if (notice[key].ADDRESS); notice_new.ext.email_address = format_value(notice[key].ADDRESS);
      if (notice[key].DESC); notice_new.ext.email_desc = format_value(notice[key].DESC);
		} else {
      // process all other fields

      if (mapped_field) {
        notice_new[mapped_field] = clean_field_value(mapped_field, notice[key]);
      } else {
        notice_new.ext[ext_field] = clean_field_value(ext_field, notice[key]);
      }

			if (key == 'SOLNBR') {
				solnbr = tools.clean_solnbr(format_value(notice[key]));
        notice_new[mapped_field] = tools.clean_solnbr(format_value(notice[key]));
				notice_new._id = datasource_id + ':' + notice_type + ":" + solnbr;
			}
		}
	}

	if (S(notice_new.solnbr).isEmpty()) return;

  notice_new.data_source = datasource_id;
  notice_new.notice_type = notice_type;
  return notice_new;
} // process_notice()

function clean_field_value(key, value_hash) {
  var field_value = format_value(value_hash)
    .replace(/<\/*p>/g, '\n')
    .replace(/<br *\/*>/g, '\n')
  ;

  field_value = tools.clean_field_value(key, field_value);

	return field_value;	
}

function format_value(value) {
    value_key = value['$cd'] ? '$cd' : '$t';
    if (value[value_key]) {
        return value[value_key];
    } else {
        return '';
    }
}
