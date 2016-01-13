// Create config.js, in this directory, based on this sample file.
var appEnv = require('cfenv').getAppEnv();

fs = require('fs');

var config = {};

config.app = {};

config.app.max_rows = 1000;

// allow or prohibit write operations (POST, PUT, DELETE)?
config.app.read_only = true;

// require basic authentication
config.app.require_http_basic_auth = false;
config.app.http_basic_auth = {
	realm: 'fbopen'
	, file: '/path/to/htpasswd_file' // username/password file created using htpasswd
};

// http
config.app.listen_http = true;
config.app.port = process.env.PORT || 3000;

// https
config.app.listen_https = false;

// logger
config.logger = {};
config.logger.path = __dirname + '/../log/api.log';

// settings from cloud foundry env
cf_services = JSON.parse((process.env.VCAP_SERVICES || '{}'));

// elasticsearch
// henceforth, all ES service instances shall be named "es-YYYYMMDD",
// with the date being the day they were instantiated
config.elasticsearch = appEnv.getServiceCreds("es-.*");
// the above defines the following keys: [ hostname, password, port, uri, username ]

// if running locally
if (!config.elasticsearch) {
  config.elasticsearch = {
    uri: 'http://localhost:9200',
    hostname: 'localhost',
    port: 9200
  };
}

console.log('[API] Discovered elasticsearch config: ', config.elasticsearch);

config.elasticsearch.index = process.env.ELASTICSEARCH_INDEX || 'fbopen';
// this is used to adjust the date math that's used for searching within the (statically-dated) test data
config.elasticsearch.now_str = process.env.ELASTICSEARCH_NOW || 'now';

// Sentry config
if (process.env.env !== 'development') {
  config.sentry_uri = appEnv.getServiceURL('sentry');

  if (!config.sentry_uri) {
    console.error('The Sentry URI could not be found.');
    process.exit(1);
  }
}

module.exports = config;
