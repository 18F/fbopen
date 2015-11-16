var path = require('path');
var appEnv = require('cfenv').getAppEnv();
var config = {};

// settings from cloud foundry env
cf_services = JSON.parse(process.env.VCAP_SERVICES || '{}');

// elasticsearch
config.elasticsearch = appEnv.getServiceCreds("es-.*");

// if running locally
if (!config.elasticsearch) {
  config.elasticsearch = {
    uri: 'http://localhost:9200'
  };
}

console.log(config.elasticsearch);

module.exports = config;
