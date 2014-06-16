/*
 *
 
 FBOpen API server v0

 Supports /opp ("opportunity") POST and GET
 and POSTing a new/updated set of tags for an opportunity

 *
 */

var express = require('express')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , http_auth = require('http-auth')

  // other useful stuff
  , ejs = require('./elastic.min.js')
  , es = require('elasticsearch')
  , moment = require('moment') // momentjs.com
  , S = require('string') // stringjs.com
  , util = require('util')
  , _u = require('underscore')
  , LogClass = require('./log_to_bunyan')
  , body_parser = require('body-parser')
  , serve_favicon = require('serve-favicon')
  , errorhandler = require('errorhandler')
  , morgan = require('morgan')
  ;

var config = require('./config');

var app = express();
module.exports = app;

app.use(require('express-bunyan-logger')({
  name: 'api',
  streams: [{
    level: 'trace',
    path: config.logger.path
    // stream: process.stdout // for debugging
  }]
}));

// http basic auth, if required in config
if (config.app.require_http_basic_auth) {
	var basic = http_auth.basic(config.app.http_basic_auth);
	app.use(http_auth.connect(basic));
}

// Create Elasticsearch client
//
// Leaving these here for debug logging when needed:
// console.log("Elasticsearch host from within app:");
 //console.log(config.elasticsearch.host);
// console.log("Elasticsearch index from within app:");
 //console.log(config.elasticsearch.index);

var client = es.Client({
  host: config.elasticsearch.host + ':' + config.elasticsearch.port,
  log: LogClass,
  api_version: '1.1'
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(serve_favicon(__dirname + '/public/favicon.png'));
app.use(body_parser());

if ('development' === process.env.NODE_ENV) {
  app.use(errorhandler());
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


app.get('/v0/', function(req, res) {
	res.send('FBOpen API v0. See http://docs.fbopen.apiary.io for initial documentation.');
});

app.get('/v0/hello', function(req, res){
    client.ping({
        requestTimeout: 10000,
        hello: "elasticsearch!"
    }, function (error) {
        if (error) {
            res.send('elasticsearch cluster is down!');
        } else {
            res.send('All is well');
        }
    });
});


// Queries
app.get('/v0/opps', function(req, res) {

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json;charset=utf-8');

	var q = req.param('q');
	var fq = req.param('fq');

  var queries = ejs.BoolQuery();
  var filters = ejs.AndFilter([]);

  //
  // special fields
  //

  if (! (req.param('show_noncompeted') && S(req.param('show_noncompeted')).toBoolean())) {
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
  if (!req.param('show_closed') || S(req.param('show_closed')).toBoolean() === false) {
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
  var data_source = req.param('data_source');
  if (!S(data_source).isEmpty()) {
    filters.filters(ejs.TermFilter('data_source', data_source.toLowerCase()));
  }

  // pagination
  var size = 10;
  if (req.param('limit')) {
    if (parseInt(req.param('limit')) <= config.app.max_rows) {
      size = req.param('limit');
    } else {
      res.json(400, { error: 'Sorry, param "limit" must be <= ' + config.app.max_rows });
      return;
    }
  }

  // default to using 'p' if present, as that will come from the webclient
  // calculate 'start' from 'p' and 'limit'
  var p = req.param('p');
  var start;
  if (!p) {
    start = req.param('start') || 0;
  } else {
    start = (p - 1) * size;
  }

  // specify fields to be included in results
  var fieldlist;
  if (req.param('fl')) {
    fieldlist = req.param('fl').split(',');
  }

  var results_callback = function (error, body, status) {
    // massage results into the format we want
    var results_out = {};
    if (_u.has(body, 'hits') && _u.has(body.hits, 'total')) {
      results_out.numFound = body.hits.total;
    } else {
      results_out.numFound = 0;
      return res.json(results_out);
    }

    // map highlights into docs, instead of separate data,
    // and do a few other cleanup manipulations
    var sorted_by_score = false;

    results_out.docs = _u.map(body.hits.hits, function (doc) {
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
    sorts.push(ejs.Sort('close_dt').asc());
    sorts.push(ejs.Sort('solnbr'));
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

  // console.log(util.inspect(request.query().bool.should, null));

  client.search({ index: config.elasticsearch.index, type: "opp", body: request.toJSON() }, results_callback);
});


app.get('/v0/opp/:id', function(req, res) {
  client.search(
    { index: config.elasticsearch.index, type:"opp", _id: req.params.id }, 
    function(err, body) { res.json(body) }
  );
});


// Allow POST operations only according to configuration
app.post('*', function(req, res, next) {
	if (config.app.read_only) {
		res.send(405);
	} else {
	  next();
	}
});

//// new opportunity POSTed
//app.post('/v0/opp', function(req, res) {
//
//	// console.log('request = ' + req.originalUrl);
//
//	// validate the POSTed data and then add it to the Solr index
//
//	// POSTed data should include at least the following required fields:
//	// data_source  "FBO", "grants.gov", "SBIR", etc.
//	// solnbr       (solicitation number, unique per data_source)
//	// listing_url  outbound link to the source or agency's page for this project
//	// title        title of solicitation
//	// close_dt     Close Date
//
//	return_data = {};
//	return_message = '';
//	omitted_fields = [];
//
//	if (has_required_fields(req)) {
//
//		solr_doc = req.body;
//		// console.log('solr_doc = ' + JSON.stringify(solr_doc));
//
//		// convert date to proper format
//		for (field in solr_doc) {
//
//			// handle date fields
//			if (S(field).endsWith('_dt') || S(field).endsWith('DATE')) {
//				// console.log('converting date ' + field + ' = ' + solr_doc[field] + ' ...');
//				dt_in = solr_doc[field];
//				solr_doc[field] = solrize_date(dt_in);
//			}
//
//			// filter out certain standard-but-unwanted-for-now fields
//			if (field == 'utf8' || field == 'commit') {
//				delete solr_doc[field];
//				omitted_fields.push(field);
//			}
//		}
//
//		if (omitted_fields.length > 0) return_data.omitted_fields = omitted_fields;
//
//		// create unique (?) Solr ID for this record
//		solr_doc.id = solr_doc.data_source + ':' + solr_doc.solnbr;
//		solr_doc.data_type = 'opp';
//		return_data.id = solr_doc.id;
//
//		client.add(solr_doc, function(err, obj) {
//			if (err) {
//				// console.log(err);
//				fail = {
//					'status': 'fail'
//					, 'message': 'client.add failed: ' + err
//				}
//				res.send(400, fail);
//			} else {
//				// console.log('added: ' + JSON.stringify(obj));
//				success = {
//					'status': 'success'
//					, 'message': 'Ok'
//					, 'data': return_data
//				}
//				res.send(success);
//			}
//		});
//	} else {
//		fail = {
//			'status': 'fail'
//			, 'message': 'missing one or more required fields'
//		}
//		res.send(400, fail);
//	}
//});

// function solrize_date(date_string) {
// 	dt = moment(date_string);
// 	if (dt.isValid()) {
// 		dt_out = dt.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
// 		return dt_out;
// 	} else {
// 		console.log('momentjs could not convert [' + dt + '] into a date.');
// 		return false;
// 	}
// }
// 
// // to add: much better validation
// // e.g., https://github.com/ctavan/express-validator
// function has_required_fields(req) {
// 	return (req.body.data_source 
// 		&& req.body.solnbr
// 		&& req.body.listing_url
// 		&& req.body.title
// 		&& req.body.close_dt 
// 	);
// }


// Tagging
//github.com/18F/fbopen/blob/esearch/loaders/test/test_attachment_load_and_search.sh
app.post('/v0/opp/:doc_id/tags/:tags?', function(req, res) {

	// 'opp/' + solnbr + '/tags/' + tags_serial
	doc_id = req.params.doc_id;
	
	solr_doc = { 'id': doc_id };

	tags = req.params.tags;
	if (tags !==  undefined) {
		// console.log('tags.length = ' + tags.length);
		tags_array = tags.split(',');
		content_tags_array = [];
		content_tags_list = '{"set": ["' + tags_array.join('","') + '"]}';
	} else {
		content_tags_list = '{"set": [""]}';
	}

	// console.log('content_tags_list = ' + content_tags_list);
	solr_doc.content_tags = JSON.parse(content_tags_list);

	docs = [];
	docs.push(solr_doc);

	client.update(docs, function(err, obj) {
		if (err) {
			// console.log(err);
			fail = {
				'status': 'fail'
				, 'message': 'client.UPDATE failed: ' + err
			};
			res.send(fail);
		} else {
			// console.log('updated: ' + JSON.stringify(obj));
			success = {
				'status': 'success'
				, 'message': 'Ok'
				, 'data': doc_id
			};
			res.send(success);
		}
	});
});


if (config.app.listen_http) {
	http.createServer(app).listen(config.app.port);
}

if (config.app.listen_https) {
	https.createServer(config.ssl, app).listen(config.ssl.port);
}
