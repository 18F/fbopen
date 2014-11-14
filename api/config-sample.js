// Create config.js, in this directory, based on this sample file.

fs = require('fs');

var config = {};

config.app = {};

config.app.max_rows = 1000;

// allow or prohibit write operations (POST, PUT, DELETE)?
config.app.read_only = true;

// require basic authentication
config.app.require_http_basic_auth = true;
config.app.http_basic_auth = {
	realm: 'fbopen'
	, file: '/path/to/htpasswd_file' // username/password file created using htpasswd
};

// http
config.app.listen_http = true;
config.app.port = process.env.FBOPEN_API_PORT || 3000;

// https
config.app.listen_https = false;
config.ssl = {
	port: process.env.FBOPEN_API_SSL_PORT || 3001
	, key: fs.readFileSync('SERVER_PRIVATE_KEY').toString()
	, cert: fs.readFileSync('SERVER_CERTIFICATE').toString()
	, ca: fs.readFileSync('CA_CERTIFICATE').toString()
	, passphrase: 'PASSPHRASE' // (if any)
	, requestCert: true
	, rejectUnauthorized: false
};

// logger
config.logger = {};
config.logger.path = process.env.FBOPEN_ROOT + '/log/api.log';

// elasticsearch
config.elasticsearch = {};
config.elasticsearch.host = process.env.ELASTICSEARCH_HOST || 'localhost';
config.elasticsearch.port = '9200';
config.elasticsearch.index = process.env.ELASTICSEARCH_INDEX || 'fbopen';
// this is used to adjust the date math that's used for searching within the (statically-dated) test data
config.elasticsearch.now_str = process.env.ELASTICSEARCH_NOW || 'now';

module.exports = config;
