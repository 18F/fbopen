/*
 *

 FBOpen API server v0

 Supports /opp ("opportunity") POST and GET
 and POSTing a new/updated set of tags for an opportunity

 *
 */

var express = require('express'),
  http = require('http'),
  https = require('https'),
  path = require('path'),
  http_auth = require('http-auth'),

  // other useful stuff
  ejs = require('./elastic.min.js'),
  es = require('elasticsearch'),
  S = require('string'), // stringjs.com
  util = require('util'),
  _u = require('underscore'),
  LogClass = require('./log_setup'),
  serve_favicon = require('serve-favicon'),
  errorhandler = require('errorhandler'),
  winston = require('winston'),
  express_winston = require('express-winston');

var config = require('./config');

var app = express();
module.exports = app;

// Create Elasticsearch client

var client = es.Client({
  host: config.elasticsearch.uri,
  log: LogClass,
  api_version: '1.1'
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(serve_favicon(__dirname + '/public/favicon.png'));

if ('development' === process.env.NODE_ENV) {
  app.use(errorhandler());
}

app.get('/v0/status', function(req, res) {
  // this route is used for server health checks, so it should always return 200
  // this line will force Express not to tell the client to use cache by returning 304
  req.headers['if-none-match'] = 'no-match-for-this';

  res.send('API is up!');
});

// http basic auth, if required in config
if (config.app.require_http_basic_auth) {
  var basic = http_auth.basic(config.app.http_basic_auth);
  app.use(http_auth.connect(basic));
}

// Allow cross-site queries (CORS)
app.get('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.options('*', function(req, res) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Requested-With, X-Prototype-Version, Authorization',
    'Content-Type': 'application/json;charset=utf-8'
  });
  res.send('supported options: GET, OPTIONS [non-CORS]');
});


app.get('/v0/?', function(req, res) {
  res.send('FBOpen API v0. See https://18f.github.io/fbopen for initial documentation.');
});

app.get('/v0/hello', function(req, res) {
  client.ping({
    requestTimeout: 10000,
    hello: "elasticsearch!"
  }, function (error) {
    if (error) {
      res.send('Elasticsearch cluster is not responding!');
    } else {
      res.send('All is well and Elasticsearch sends you its best wishes.');
    }
  });
});

// Queries
app.get('/v0/opps', function(req, res) {

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json;charset=utf-8');

  var q = req.query.q;
  var fq = req.query.fq;

  var queries = ejs.BoolQuery();
  var filters = ejs.AndFilter([]);

  //
  // special fields
  //

  if (!(req.query.show_noncompeted && S(req.query.show_noncompeted).toBoolean())) {
    // omit non-competed listings unless otherwise specified
    non_competed_bool_query = ejs.BoolQuery().should([
      ejs.MatchQuery('_all', 'single source').type('phrase'),
      ejs.MatchQuery('_all', 'sole source').type('phrase'),
      ejs.MatchQuery('_all', 'other than full and open competition').type('phrase')
    ]);

    var non_competed_flt = ejs.NotFilter(ejs.QueryFilter(non_competed_bool_query));

    filters.filters(non_competed_flt);
  }

  // omit or include closed listings
  // if it's not defined or it's false, add this filter
  if (!req.query.show_closed || S(req.query.show_closed).toBoolean() === false) {
    var show_closed = ejs.OrFilter([
      ejs.QueryFilter(ejs.MatchQuery("ext.Status", "Pipeline")), //bids.stat.gov data has no close date, only status field
      ejs.AndFilter([
        ejs.QueryFilter(ejs.RangeQuery('close_dt').gt(config.elasticsearch.now_str)),
        ejs.MissingFilter('ext.Status')
      ])
    ]);

    if (q !== '') {
      filters.filters(show_closed);
    } else {
      queries.should(show_closed);
    }
  }

  // filter by data source
  var data_source = req.query.data_source;
  if (!S(data_source).isEmpty()) {
    filters.filters(ejs.TermFilter('data_source', data_source.toLowerCase()));
  }

  // pagination
  var size = 10;
  if (req.query.limit) {
    if (parseInt(req.query.limit) <= config.app.max_rows) {
      size = req.query.limit;
    } else {
      res.json(400, {
        error: 'Sorry, param "limit" must be <= ' + config.app.max_rows
      });
      return;
    }
  }

  // default to using 'p' if present, as that will come from the webclient
  // calculate 'start' from 'p' and 'limit'
  var p = req.query.p;
  var start;
  if (!p) {
    start = req.query.start || 0;
  } else {
    start = (p - 1) * size;
  }

  // specify fields to be included in results
  var fieldlist;
  if (req.query.fl) {
    fieldlist = req.query.fl.split(',');
  }

  var results_callback = function(error, body, status_code) {
    // massage results into the format we want
    var results_out = {};
    results_out.status = status_code;

    if (status_code !== 200) {
      results_out.error = error;
      return res.json(results_out);
    }

    if (_u.has(body, 'hits') && _u.has(body.hits, 'total')) {
      results_out.numFound = body.hits.total;
    } else {
      results_out.numFound = 0;
      return res.json(results_out);
    }

    // map highlights into docs, instead of separate data,
    // and do a few other cleanup manipulations
    var sorted_by_score = false;

    results_out.docs = _u.map(body.hits.hits, function(doc) {
      var doc_out = _u.omit(doc, '_id', '_source', '_index', 'fields');
      doc_out.id = doc._id;

      _u.extend(doc_out, doc._source);

      // if a fieldlist (fl) is specified, the fields are returned
      // under a "fields" key, and the values are returned as arrays
      // the following is to flatten that structure
      _u.each(_u.keys(doc.fields), function(key) {
        doc_out[key] = doc.fields[key][0];
      });

      // adjust score to 0-100
      if (doc._score !== null) {
        sorted_by_score = true;
        doc_out.score = Math.min(Math.round(doc._score * 100), 100);
      }

      // clean up fields
      doc_out.data_source = doc_out.data_source || '';
      if (doc_out.FBO_SETASIDE == 'N/A') doc_out.FBO_SETASIDE = '';

      // type-specific changes, until we've normalized the data import
      if (doc_out.FBO_CONTACT !== '') doc_out.contact = doc_out.FBO_CONTACT;
      if (doc_out.AgencyContact_t !== '') doc_out.contact = doc_out.AgencyContact_t;

      return doc_out;
    });

    // required by sort indicator
    results_out.sorted_by = sorted_by_score ? 'relevance' : 'due date (oldest first), opportunity #';
    // required by paging
    results_out.start = start;

    res.json(results_out);
  };


  var sorts = [];
  if (S(q).isEmpty()) {
    queries.should(ejs.MatchAllQuery());
    sorts.push({ close_dt: { order: 'asc', unmapped_type: 'date' }});
    sorts.push({ solnbr: { order: 'asc' }});
  } else {
    var qsq = ejs.QueryStringQuery(decodeURIComponent(q));
    var child_query = ejs.HasChildQuery(qsq, "opp_attachment");
    queries.should(qsq);
    queries.should(child_query);
  }

  if (!S(fq).isEmpty()) {
    filters.filters(ejs.QueryFilter(ejs.QueryStringQuery(fq)));
  } else {
    filters.filters(ejs.MatchAllFilter());
  }

  var highlight = ejs.Highlight(['description', 'FBO_OFFADD'])
    .preTags('<highlight>')
    .postTags('</highlight>');

  var request = ejs.Request()
    .highlight(highlight)
    .from(start)
    .size(size)
    .query(queries)
    .filter(filters);

  if (sorts.length > 0) request.sort(sorts);
  if (fieldlist) request.fields = fieldlist;

  request_json = request.toJSON();

  if (sorts.length > 0) request_json.sort = sorts;

  // console.log(util.inspect(request.query().bool.should, null));

  client.search({
    index: config.elasticsearch.index,
    type: "opp",
    body: request.toJSON()
  }, results_callback);
});


app.get('/v0/opp/:id', function(req, res) {
  client.search({
      index: config.elasticsearch.index,
      type: "opp",
      _id: req.params.id
    },
    function(err, body) {
      res.json(body);
    }
  );
});

app.get('/v0/agg/data_source', function(req, res) {
  client.search({
    index: config.elasticsearch.index,
    type: 'opp',
    body: {
      aggs: {
        data_sources: {
          terms: {
            field: 'data_source'
          }
        }
      }
    }
  }, function(err, body) {
    if (err) {
      res.json(err);
    } else {
      var data_sources =_u.map(body.aggregations.data_sources.buckets, function(d) {
        return d.key;
      });
      res.json({data_sources: data_sources});
    }
  });
});

app.get('/v0/agg/notice_type', function(req, res) {
  client.search({
    index: config.elasticsearch.index,
    type: 'opp',
    body: {
      aggs: {
        notice_types: {
          terms: {
            field: 'notice_type'
          }
        }
      }
    }
  }, function(err, body) {
    if (err) {
      res.json(err);
    } else {
      var notice_types = _u.map(body.aggregations.notice_types.buckets, function(n) {
        return n.key;
      });
      res.json({notice_types: notice_types});
    }
  });
});

app.get('/v0/agg/data_source/notice_type', function(req, res) {
  client.search({
    index: config.elasticsearch.index,
    type: 'opp',
    body: {
      aggs: {
        data_sources: {
          terms: {
            field: 'data_source'
          },
          aggs: {
            notice_types: {
              terms: {
                field: 'notice_type'
              }
            }
          }
        }
      }
    }
  }, function(err, body) {
    if (err) {
      res.json(err);
    } else {
      data = {};

      _u.map(body.aggregations.data_sources.buckets, function (n) {
        data[n.key] = _u.map(n.notice_types.buckets, function (m) {
          return m.key;
        });
      });
      res.json({data_sources: data});
    }
  });
});

// this needs to go after any calls to verbs
app.use(express_winston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
        colorize: true
    }),
    new winston.transports.File({
      filename: config.logger.path,
      json: true,
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
}));

express();

//if (config.app.listen_http) {
//  http.createServer(app).listen(config.app.port);
//}
//
//if (config.app.listen_https) {
//  https.createServer(config.ssl, app).listen(config.ssl.port);
//}
