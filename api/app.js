
/*
 *
 
 FBOpen API server v0

 Supports /opp ("opportunity") POST and GET
 and POSTing a new/updated set of tags for an opportunity

 *
 */

var express = require('express')

	// express.js standard scaffolding components (some overkill here)
	, routes = require('./routes')
	, http = require('http')
	, path = require('path')

	// other useful stuff
	, request = require('request')
	, qs = require('querystring')
	, solr = require('solr-client')
	, url = require('url')
	, moment = require('moment') // momentjs.com
	, S = require('string') // stringjs.com
	;

var app = express();

// Create Solr client
var solr_client = solr.createClient();
solr_client.autoCommit = true; // Switch on "auto commit"

// all environments
// (express.js standard scaffolding -- see http://expressjs.com/guide.html#executable )
// some of this is unused/overkill at the moment
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


app.get('/v0/', function(req, res) {
	res.send('FBOpen APi v0. See http://docs.fbopen.apiary.io for initial documentation.');
});

app.get('/v0/hello', function(req, res){
	res.send('Hello World');
});


app.post('/v0/opp/:doc_id/tags/:tags?', function(req, res) {

	// 'opp/' + solnbr + '/tags/' + tags_serial
	doc_id = req.params.doc_id;
	
	solr_doc = { 'id': doc_id }

	tags = req.params.tags;
	if (tags != undefined) {
		// console.log('tags.length = ' + tags.length);
		tags_array = tags.split(',');
		content_tags_array = [];
		content_tags_list = '{"set": ["' + tags_array.join('","') + '"]}';
	} else {
		content_tags_list = '{"set": [""]}';
	}

	// console.log('content_tags_list = ' + content_tags_list);
	solr_doc['content_tags'] = JSON.parse(content_tags_list);

	docs = [];
	docs.push(solr_doc);

	solr_client.update(docs, function(err, obj) {
		if (err) {
			// console.log(err);
			fail = {
				'status': 'fail'
				, 'message': 'solr_client.UPDATE failed: ' + err
			}
			res.send(fail);
		} else {
			// console.log('updated: ' + JSON.stringify(obj));
			success = {
				'status': 'success'
				, 'message': 'Ok'
				, 'data': doc_id
			}
			res.send(success);
		}
	});
});


// Queries
app.get('/v0/opp', function(req, res) {

	// console.log('request = ' + req.originalUrl);

	// execute the Solr query and return results

	var url_parts = url.parse(req.url, true);
	var querystring = qs.stringify(url_parts.query);
	// console.log('querystring = ' + querystring);

	// let caller trim down which fields are returned
	// (TO DO: allow for other (all?) non-default params)
	var fl;
	if (url_parts.query['fl']) {
		fl = url_parts.query['fl'];
	} else {
		fl = '*,score';
	}

	solr_url = 'http://localhost:8983/solr/collection1/select';

	if (url_parts.query['get_parent']) { // special request only for a parent url:
		solr_url += '?wt=json&fl=id,solnbr,title,listing_url&fq=solnbr:' + url_parts.query['solnbr'] + '&q=listing_url:*';
	} else { // standard query
		solr_url += '?wt=json&facet=true&facet.field=FBO_NAICS&facet.field=data_source'
		+ '&defType=edismax'
		+ '&fl='+ fl
		+ '&hl=true&hl.fl=description,content,summary&hl.fragsize=150&hl.mergeContiguous=true&hl.usePhraseHighlighter=true&hl.snippets=3&hl.simple.pre=<highlight>&hl.simple.post=</highlight>'
		+ '&' + querystring;
	}

	// console.log('solr_url = ' + solr_url);

	request(solr_url, function(err, resp, body) {
		res.set('Content-Type', 'application/json');
		if (!err && resp.statusCode == 200) {
			res.json(200, JSON.parse(body));
			// res.send(body);
		} else {
			res.json(resp.statusCode, { error: err });
		}
	});


});


// new opportunities POSTed
app.post('/v0/opp', function(req, res) {

	// console.log('request = ' + req.originalUrl);

	// validate the POSTed data and then add it to the Solr index

	/* 
		POSTed data should include at least the following required fields:
		data_source  "FBO", "grants.gov", "SBIR", etc.
		solnbr       (solicitation number, unique per data_source)
		listing_url  outbound link to the source or agency's page for this project
		title        title of solicitation
		close_dt     Close Date
	 */

	return_data = {};
	return_message = '';
	omitted_fields = [];

	if (has_required_fields(req)) {

		solr_doc = req.body;
		// console.log('solr_doc = ' + JSON.stringify(solr_doc));

		// convert date to proper format
		for (field in solr_doc) {

			// handle date fields
			if (S(field).endsWith('_dt') || S(field).endsWith('DATE')) {
				// console.log('converting date ' + field + ' = ' + solr_doc[field] + ' ...');
				dt_in = solr_doc[field];
				solr_doc[field] = solrize_date(dt_in);
			}

			// filter out certain standard-but-unwanted-for-now fields
			if (field == 'utf8' || field == 'commit') {
				delete solr_doc[field];
				omitted_fields.push(field);
			}
		}

		if (omitted_fields.length > 0) return_data.omitted_fields = omitted_fields;

		// create unique (?) Solr ID for this record
		solr_doc.id = solr_doc.data_source + ':' + solr_doc.solnbr;
		return_data.id = solr_doc.id;

		solr_client.add(solr_doc, function(err, obj) {
			if (err) {
				// console.log(err);
				fail = {
					'status': 'fail'
					, 'message': 'solr_client.add failed: ' + err
				}
				res.send(fail);
			} else {
				// console.log('added: ' + JSON.stringify(obj));
				success = {
					'status': 'success'
					, 'message': 'Ok'
					, 'data': return_data
				}
				res.send(success);
			}
		});

	} else {
		fail = {
			'status': 'fail'
			, 'message': 'missing one or more required fields'
		}
		res.send(fail);
	}

});

function solrize_date(date_string) {

	dt = moment(date_string);
	if (dt.isValid()) {
		dt_out = dt.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
		return dt_out;
	} else {
		console.log('momentjs could not convert [' + dt + '] into a date.');
		return false;
	}

}

// to add: much better validation
// e.g., https://github.com/ctavan/express-validator
function has_required_fields(req) {
	return (req.body.data_source 
		&& req.body.solnbr
		&& req.body.listing_url
		&& req.body.title
		&& req.body.close_dt 
	);

}
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

