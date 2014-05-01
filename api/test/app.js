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
    console.log(process.env['ELASTICSEARCH_HOST']);
    var index_name = 'fbopen_api_test';

    client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'trace'
    });
    async.series([
      function (callback) {
        console.log('Starting series!!!');
        callback(null, 'pre');
      }, function (callback) {
        client.indices.delete({index: index_name}, callback);
      }, function (callback) {
        client.indices.create({index: index_name, body: {
          "settings": { "index": { "analysis": { "analyzer": { "default": { "type": "snowball" } } } } }
        }}, callback);
      }, function (callback) {
        client.indices.putMapping({index: index_name, type: 'opp', body: { "opp": { } }}, callback);
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
        child_cmd = 'elasticdump --input ' + path.resolve('./test/data/20140401.sample.json') + ' --output=http://localhost:9200/'+index_name+' --limit=10';
        // NOTE: if you have trouble with the test loading data properly, run the elasticdump command separately.
        // Make sure elasticdump says it has WRITTEN the objects.
        console.log(child_cmd);
        child_process.exec(child_cmd, callback);
      }, function (err, resp) {
        console.log(resp);
        done();
      }
    ]);
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
      expect(resp.body.docs[index]).to.have.property(field, value);
    };
  };

  it('should have 56 total opp records in the test index', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(num_found(55))
    .end(done)
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .end(done)
  });

  it('should return all open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(42))
    .end(done)
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=0')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .end(done)
  });

  it('should return all competed opps, whether open or closed', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(19))
    .end(done)
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=0')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .end(done)
  });

  it('should return **all** opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1&show_noncompeted=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(55))
    .end(done)
  });

  it('should return competed, open opps about "satellite"', function(done) {
    request(app)
    .get('/v0/opps?q=satellite')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(1))
    .expect(/satellite/)
    .end(done)
  });

  it('should return competed, open opps, filtered to "Aberdeen"', function(done) {
    request(app)
    .get('/v0/opps?fq=Aberdeen')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(1))
    .expect(/Aberdeen/)
    .end(done)
  });

  it('should return competed, open opps, filtered to "Aberdeen" and about "night vision"', function(done) {
    request(app)
    .get('/v0/opps?fq=Aberdeen&q="night vision"')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(1))
    .expect(/Aberdeen/)
    .expect(/night vision/i)
    .end(done)
  });

  //TODO: we need data from more sources, or to mark some test data as being from other sources, to properly test this
  it('should return results from FBO', function(done) {
    request(app)
    .get('/v0/opps?data_source=fbo&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(55))
    .end(done)
  });

  it('should return results from FBO, case insensitively', function(done) {
    request(app)
    .get('/v0/opps?data_source=FBO&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(55))
    .end(done)
  });

  it('should not return any results for missing dataset', function(done) {
    request(app)
    .get('/v0/opps?data_source=foobar&show_noncompeted=1&show_closed=1')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(0))
    .end(done)
  });

  it('should allow limiting results', function(done) {
    request(app)
    .get('/v0/opps?limit=2')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .expect(num_returned(2))
    // that this record has moved to the front will be confirmed in the test
    // "should allow paging results"
    .expect(record_with_field('solnbr', 1, 'spmym414q0334'))
    .end(done)
  });

  it('should allow paging results', function(done) {
    request(app)
    .get('/v0/opps?from=1&limit=2')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .expect(num_returned(2))
    .expect(record_with_field('solnbr', 0, 'spmym414q0334'))
    .end(done)
  });

  it('should accept a whitelist of fields to return', function(done) {
    request(app)
    .get('/v0/opps?fl=solnbr,close_dt')
    .expect(200)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(num_found(16))
    .expect(record_with_field('solnbr', 0, 'vcvh14-101'))
    .end(done)
  });
});
