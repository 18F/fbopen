var _ = require('underscore-contrib');
var util = require('util');

var results_formatter = function (body, start, res, api_version) {
  if (!(body.hits && body.hits.total)) {
    return res.json({numFound: 0});
  }

  var results_out = {};

  if (_.has(body, 'hits') && _.has(body.hits, 'total')) {
    results_out.numFound = body.hits.total;
  } else {
    return res.json({numFound: 0});
  }

  // map highlights into docs, instead of separate data,
  // and do a few other cleanup manipulations
  var sorted_by_score = false;

  results_out.docs = _.map(body.hits.hits, function(doc) {
    var doc_out = _.omit(doc, '_id', '_source', '_index', 'fields', '_score');
    doc_out.id = doc._id;

    _.extend(doc_out, doc._source);

    // if a fieldlist (fl) is specified, the fields are returned
    // under a "fields" key, and the values are returned as arrays
    // the following is to flatten that structure
    _.map(doc.fields, function(key, val) {
      doc_out[key] = _.flatten(val)[0];
    });

    // adjust score to 0-100
    if (doc._score !== null) {
      sorted_by_score = true;
      doc_out._score = Math.min(Math.round(doc._score * 100), 100);
    } else {
      doc_out._score = 0;
    }

    // clean up fields
    if (doc_out.ext.SETASIDE == 'N/A') doc_out.ext.SETASIDE = '';

    if (api_version == 'v0') {
      doc_out = backwards_compat(doc_out);
    }

    return doc_out;
  });

  results_out.maxScore = results_out.docs.reduce(function(prev, curr) {
    return Math.max((prev.score || prev._score), (curr.score || curr._score));
  });

  results_out.facets = {};

  // required by sort indicator
  results_out.sorted_by = sorted_by_score ? 'relevance' : 'due date (oldest first), opportunity #';
  // required by paging
  results_out.start = start;

  res.json(results_out);
};

var backwards_compat = function (doc_out) {
  if (doc_out.ext) {
    // at v1 we changed to always using the domain name consistently
    doc_out.data_source = (doc_out.data_source == 'fbo.gov') ? 'FBO' : doc_out.data_source;

    Object.keys(doc_out.ext).map(function(key) {
      doc_out[doc_out.data_source + '_' + key] = doc_out.ext[key];
    });
    delete doc_out.ext;
  }

  // rename/delete fields
  doc_out.score = doc_out._score;
  delete doc_out._score;

  doc_out.data_type = doc_out._type;
  delete doc_out._type;

  delete doc_out.sort;

  return doc_out;
}

module.exports = results_formatter;
