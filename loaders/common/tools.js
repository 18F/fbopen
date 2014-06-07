var S = require('string');
var moment = require('moment');

var clean_date = function (raw_date) {
  // dates from FBO/grants.gov are MMDDYYYY or MMDDYY
  // Elasticsearch likes ISO date format YYYYMMDD
  var dt = moment(raw_date, ['MMDDYY', 'MMDDYYYY']);

  if (dt.isValid()) {
    dt_out = dt.format('YYYY-MM-DD');
    return dt_out;
  } else {
    simple_log('WARNING: momentjs could not convert [' + raw_date + '] into a valid date.', true);
    return false;
  }
};

module.exports = {
  clean_solnbr: function (solnbr) {
    return S(solnbr).trim().slugify().s;
  },
  clean_field_value: function (field, val) {
    // unescape entity codes; strip out all other HTML
    var field_value = S(val).decodeHTMLEntities().stripTags();

    if (field_value.isEmpty()) return '';

    field_value = field_value.s;

    if (S(field.toLowerCase()).endsWith('date') || S(field).endsWith('_dt')) {
      field_value = clean_date(field_value);
    }

    return field_value;
  }
};
