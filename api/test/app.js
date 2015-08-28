var request = require('supertest'),
    chai = require('chai'),
    app = require('../app.js'),
    async = require('async'),
    path = require('path'),
    child_process = require('child_process'),
    util = require('util'),
    elasticsearch = require('elasticsearch');

describe("The FBOpen API", function() {
  var client;
  var expect = chai.expect;

  before(function(done) {
    console.log(process.env.ELASTICSEARCH_HOST);
    var index_name = 'fbopen_api_test';

    client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'trace'
    });
    async.series([
      function (callback) {
        client.indices.delete({index: index_name}, callback);
      }, function (callback) {
        client.indices.create({index: index_name, body: {
          "settings": { "index": { "analysis": { "analyzer": { "default": { "type": "snowball" }, "keyword-analyzer":{"tokenizer": "keyword", "filter":"lowercase" } } } } }
        }}, callback);
      }, function (callback) {
        client.indices.putMapping({index: index_name, type: 'opp', body: { "opp": { "properties": { "solnbr": {"analyzer": "keyword-analyzer", "type": "string"}} } }}, callback);
      }, function (callback) {
        client.indices.putMapping({index: index_name, type: 'opp_attachment', body: {
          "opp_attachment" : {
            "_parent": { "type": "opp" }, 
            "_source": { "excludes": [ "content" ] }, 
            "properties": {
              "content": { 
                "type": "attachment", 
                "fields": {
                  "content": { "store": "no" },
                  "author": { "store": "no" },
                  "title": { "store": "no", "analyzer": "english" },
                  "date": { "store": "no" },
                  "keywords": { "store": "no", "analyzer": "keyword" },
                  "_name": { "store": "no" },
                  "_content_type": { "store": "no" }
                } 
              } 
            }
          }
        }}, callback);
      }, function (callback) {
        console.log("Loading data with command...");
        child_cmd = 'elasticdump --input ' + path.resolve('./test/data/test_data.json') + ' --output=http://localhost:9200/'+index_name+' --limit=10';
        // NOTE: if you have trouble with the test loading data properly, run the elasticdump command separately.
        // Make sure elasticdump says it has WRITTEN the objects.
        console.log(child_cmd);
        child_process.exec(child_cmd, callback);
      }, function (err, resp) {
        //console.log(resp);
        if (err) console.log(err);
      }
    ]);
    done();
  });

  var num_found = function(num) {
    return function(resp) {
      expect(resp.body).to.have.property('numFound', num);
    };
  };

  var num_returned = function(num) {
    return function(resp) {
      expect(resp.body.docs).to.have.length(num);
    };
  };

  var record_with_field = function(field, index, value) {
    return function(resp) {
      console.log(util.inspect(resp.body));
      if (resp.body.docs) {
        // in case of multiple returned docs
        expect(resp.body.docs[index]).to.have.property(field, value);
      } else if (resp.body._source) {
        // in case of single returned doc
        expect(resp.body._source).to.have.property(field, value);
      }
    };
  };

  it('should have 409 total opp records in the test index', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(num_found(409))
    .end(done);
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .end(done);
  });

  it('should return all open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(377))
    .end(done);
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=0')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .end(done);
  });

  it('should return all competed opps, whether open or closed', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(389))
    .end(done);
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=0')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .end(done);
  });

  it('should return **all** opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1&show_noncompeted=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(409))
    .end(done);
  });

  it('should return competed, open opps about "computer"', function(done) {
    request(app)
    .get('/v0/opps?q=computer')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(13))
    .expect(/computer/)
    .end(done);
  });

  it('should return competed, open opps, filtered to "air force"', function(done) {
    request(app)
    .get('/v0/opps?fq="air%20force"')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(18))
    .expect(/air force/i)
    .end(done);
  });

  it('should return competed, open opps, filtered to "air force" and about "safety"', function(done) {
    request(app)
    .get('/v0/opps?fq="air%20force"&q="safety"')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(1))
    .expect(/air force/i)
    .expect(/safety/i)
    .end(done);
  });

  //TODO: we need data from more sources, or to mark some test data as being from other sources, to properly test this
  it('should return results from FBO', function(done) {
    request(app)
    .get('/v0/opps?data_source=fbo.gov&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(187))
    .end(done);
  });

  it('should return results from FBO, case insensitively', function(done) {
    request(app)
    .get('/v0/opps?data_source=FBO.gov&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(187))
    .end(done);
  });

  it('should not return any results for missing dataset', function(done) {
    request(app)
    .get('/v0/opps?data_source=foobar&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(0))
    .end(done);
  });

  it('should allow limiting results', function(done) {
    request(app)
    .get('/v0/opps?limit=2')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .expect(num_returned(2))
    // that this record has moved to the front will be confirmed in the test
    // "should allow paging results"
    .expect(record_with_field('solnbr', 1, 'DHS-14-MT-041-000-01'))
    .end(done);
  });

  it('should allow paging results with start/limit', function(done) {
    request(app)
    .get('/v0/opps?start=1&limit=2')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .expect(num_returned(2))
    .expect(record_with_field('solnbr', 0, 'DHS-14-MT-041-000-01'))
    .end(done);
  });

  it('should allow paging results with p', function(done) {
    request(app)
    .get('/v0/opps?p=2&limit=1')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .expect(num_returned(1))
    .expect(record_with_field('solnbr', 0, 'DHS-14-MT-041-000-01'))
    .end(done);
  });

  it('should accept a whitelist of fields to return', function(done) {
    request(app)
    .get('/v0/opps?fl=solnbr,close_dt')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(359))
    .expect(record_with_field('solnbr', 0, 'ag-0355-s-14-0006'))
    .end(done);
  });
 it('should order results such that first result matches solicitation number exactly when filtering to solnbr', function(done) {
    request(app)
    .get('/v0/opps?q=fa8571-14-r-0008')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(num_found(137))
    .expect(record_with_field('solnbr', 0, 'fa8571-14-r-0008'))
    .end(done);
  });
 it('should allow users to return a single record by id', function(done) {
    request(app)
    .get('/v0/opp/fbo.gov:COMBINE:fa8571-14-r-0008')
    .expect(200)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(record_with_field('solnbr', 0, 'fa8571-14-r-0008'))
    .end(done);
  });
  it('should have results for bids.state.gov data', function(done){
    request(app)
    .get('/v0/opps?data_source=bids.state.gov')
    .expect(200)
    .expect(num_found(24))
    .end(done);
  });
});
