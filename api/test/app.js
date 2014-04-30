var request = require('supertest'),
    chai = require('chai'),
    app = require('../app.js'),
    async = require('async'),
    path = require('path'),
    child_process = require('child_process'),
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

  var numFound = function(num) {
    return function(resp) {
      expect(resp.body).to.have.property('numFound', num);
    };
  };

  it('should have 56 total opp records in the test index', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1&show_closed=1')
    .expect(200, done)
    .expect('Content-Type', /json/)
    .expect(numFound(55))
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(16))
  });

  it('should return all open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=1')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(42))
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_noncompeted=0')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(16))
  });

  it('should return all competed opps, whether open or closed', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(19))
  });

  it('should return all competed, open opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=0')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(16))
  });

  it('should return **all** opps', function(done) {
    request(app)
    .get('/v0/opps?show_closed=1&show_noncompeted=1')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(55))
  });

  it('should return competed, open opps about "satellite"', function(done) {
    request(app)
    .get('/v0/opps?q=satellite')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(1))
    .expect(/satellite/)
  });

  it('should return competed, open opps, filtered to "Aberdeen"', function(done) {
    request(app)
    .get('/v0/opps?fq=Aberdeen')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(1))
    .expect(/Aberdeen/)
  });

  it('should return competed, open opps, filtered to "Aberdeen" and about "night vision"', function(done) {
    request(app)
    .get('/v0/opps?fq=Aberdeen&q="night vision"')
    .expect(200, done)
    .expect('Content-Type', 'application/json;charset=utf-8')
    .expect(numFound(1))
    .expect(/Aberdeen/)
    .expect(/night vision/i)
  });
});
