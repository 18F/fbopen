var util = require('util');
var datasource_id = 'fbo.gov';
var S = require('string');
var es = require('event-stream');
var u_ = require('underscore');
var tools = require('../common/tools');

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
};

var ext_field_map = {
  'EMAIL': 'email_address',
  'EMAIL2': 'email_address',
  'DESC3': 'email_desc'
};

es.pipeline(
    process.openStdin(),
    es.split(),
    es.parse(),
    es.map(function (data, callback) {
        parent_notice = data;
        key = Object.keys(parent_notice)[0];
        notice = parent_notice[key];
        if (u_.contains(['PRESOL', 'COMBINE', 'MOD'], key)) {
            notice_out = { 'ext': {} };
            notice_out.data_source = datasource_id;
            notice_out.is_mod = (key == 'MOD');

            if (notice_out.is_mod) {
                notice_out.notice_type = notice.NTYPE;
            } else {
                notice_out.notice_type = key;
            }

            notice_out.solnbr = tools.clean_solnbr(notice.SOLNBR);
            notice_out.id = datasource_id + ':' + notice_out.notice_type + ':' + notice_out.solnbr;

            var mapped_field;
            //util.log(util.inspect(notice));

            for (var field in notice) {
                //util.log("field: " + field);

                // skip solnbr, already handled above
                // skip ntype
                // skip YEAR because it gets combined with DATE instead (smh)
                // 'DESC2' is always "Link to Document"
                if (u_.contains(['SOLNBR', 'NTYPE', 'YEAR', 'DESC2'], field)) continue;

                // skip empty fields
                if (S(notice[field]).isEmpty()) continue;

                // get the proper field name: 
                // map some to core FBOpen fieldnames
                // add the rest to the 'ext' dict to indicate
                // extended fields

                mapped_field = field_map[field];
                field_out = ext_field_map[field] || field;

                val_in = notice[field];

                if (field == 'DATE') {
                    val_in = val_in + notice.YEAR;
                }

                // fix up data fields
                val_out = tools.clean_field_value(field_out, val_in);

                // add to the notice JSON
                if (mapped_field) {
                  notice_out[mapped_field] = val_out;
                } else {
                  notice_out.ext[field_out] = val_out;
                }
            }
            
            callback(null, notice_out);
        } else {
            callback();
        }
    }),
    es.stringify(),
    process.stdout
);

