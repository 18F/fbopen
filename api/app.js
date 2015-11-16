/*
 *

 FBOpen API server v0

 Supports /opp ("opportunity") POST and GET
 and POSTing a new/updated set of tags for an opportunity

 *
 */

var express = require('express'),
  http_auth = require('http-auth'),

  // other useful stuff
  ejs = require('./elastic.min.js'),
  es = require('elasticsearch'),
  S = require('string'), // stringjs.com
  //util = require('util'),
  _u = require('underscore'),
  LogClass = require('./log_setup'),
  serve_favicon = require('serve-favicon'),
  errorhandler = require('errorhandler'),
  winston = require('winston'),
  express_winston = require('express-winston'),
  config = require('./config'),
  raven = require('raven'),
  results_formatter = require('./formatter');


var app = express();
module.exports = app;

if (app.get('env') !== 'development') {
  // Set up Raven Sentry client
  app.locals.raven = new raven.Client(config.sentry_uri);
  app.locals.raven.patchGlobal();
}

// Create Elasticsearch client

app.locals.client = es.Client({
  host: config.elasticsearch.uri,
  log: LogClass,
  api_version: '1.1'
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(serve_favicon(__dirname + '/public/favicon.png'));

// http basic auth, if required in config
if (config.app.require_http_basic_auth) {
  var basic = http_auth.basic(config.app.http_basic_auth);
  app.use(http_auth.connect(basic));
}


app.get('/v0/status', function(req, res) {
  // this route is used for server health checks, so it should always return 200
  // this line will force Express not to tell the client to use cache by returning 304
  req.headers['if-none-match'] = 'no-match-for-this';

  res.send('API is up!');
});

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

app.get('/v0/hello', function(req, res, next) {
  app.locals.client.ping({
    requestTimeout: 10000,
    hello: "elasticsearch!"
  }, function (error) {
    if (error) {
      res.send('Elasticsearch cluster is not responding!');
      return next(error);
    }

    res.send('All is well and Elasticsearch sends you its best wishes.');
  });
});

// Queries
app.get('/:api_version(v[01])/opps', function(req, res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json;charset=utf-8');

  var queries = ejs.BoolQuery();
  var filters = ejs.AndFilter([]);

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
      ejs.QueryFilter(ejs.MatchQuery("ext.Status", "Pipeline")), //bids.state.gov data has no close date, only status field
      ejs.AndFilter([
        ejs.QueryFilter(ejs.RangeQuery('close_dt').gt(config.elasticsearch.now_str)),
        ejs.MissingFilter('ext.Status')
      ])
    ]);

    if (req.query.q !== '') {
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
  var start;
  if (!req.query.p) {
    start = req.query.start || 0;
  } else {
    start = (req.query.p - 1) * size;
  }

  var sorts = [];
  if (S(req.query.q).isEmpty()) {
    queries.should(ejs.MatchAllQuery());
    sorts.push({ close_dt: { order: 'asc', unmapped_type: 'date' }});
    sorts.push({ solnbr: { order: 'asc' }});
  } else {
    var qsq = ejs.QueryStringQuery(decodeURIComponent(req.query.q));
    var child_query = ejs.HasChildQuery(qsq, "opp_attachment");
    queries.should(qsq);
    queries.should(child_query);
  }

  if (!S(req.query.fq).isEmpty()) {
    filters.filters(ejs.QueryFilter(ejs.QueryStringQuery(req.query.fq)));
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

  // specify fields to be whitelisted in results
  if (req.query.fl) request.fields = req.query.fl;

  request_json = request.toJSON();

  // due to incompatibility between new sort syntax and the Elastic.js library
  // the sorts need to be added *after* the conversion to JSON
  if (sorts.length > 0) request_json.sort = sorts;

  // console.log(util.inspect(request.query().bool.should, null));

  app.locals.client.search({
    index: config.elasticsearch.index,
    type: "opp",
    body: request.toJSON()
  }).then(function(body) {
    results_formatter(body, start, res, req.params.api_version);
  }, function(error) {
    return next(error);
  });
});

app.get('/v1/opp/:id', function(req, res) {
  app.locals.client.search({
      index: config.elasticsearch.index,
      type: "opp",
      _id: req.params.id
    },
    function(err, body) {
      res.json(body);
    }
  );
});

app.get('/v1/agg/data_source', function(req, res) {
  app.locals.client.search({
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

app.get('/v1/agg/notice_type', function(req, res) {
  app.locals.client.search({
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

app.get('/v1/agg/data_source/notice_type', function(req, res) {
  app.locals.client.search({
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

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var server = app.listen(config.app.port, function() {
  var host = server.address().address;
  var port = server.address().port;
});
