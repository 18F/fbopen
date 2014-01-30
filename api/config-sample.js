// Create config.js, in this directory, based on this sample file.

var config = {}

config.app = {};
config.app.port = process.env.PORT || 3000;

config.solr = {};
config.solr.base_url = 'http://localhost:8983/solr/collection1/select'; // your FBOpen Solr endpoint

module.exports = config;
