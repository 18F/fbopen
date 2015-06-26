// Create config.js, in this directory, based on this sample file.

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
config.logger.path = process.env.FBOPEN_ROOT + '/log/api.log';

// settings from cloud foundry env
cf_services = JSON.parse(process.env.VCAP_SERVICES);

// elasticsearch
config.elasticsearch = cf_services.elasticsearch15[0].credentials;
// the above defines the following keys: [ hostname, password, port, uri, username ]

config.elasticsearch.index = process.env.ELASTICSEARCH_INDEX || 'fbopen';
// this is used to adjust the date math that's used for searching within the (statically-dated) test data
config.elasticsearch.now_str = process.env.ELASTICSEARCH_NOW || 'now';


module.exports = config;
