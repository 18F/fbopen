module.exports = LogClass;

var cfg = require('./config');
var winston = require('winston');

function LogClass(config) {
  // config is the object passed to the client constructor.
  var logger = (new winston.Logger({
    name: 'es_client',
    transports: [
      new (winston.transports.Console)({ level: 'warning', handleExceptions: true }),
      new (winston.transports.File)({ level: 'warning', filename: cfg.logger.path, handleExceptions: true })
    ],
    exitOnError: false
  }));
  this.error = logger.error.bind(logger);
  this.warning = logger.warn.bind(logger);
  this.info = logger.info.bind(logger);
  this.debug = logger.debug.bind(logger);
  this.trace = logger.error.bind(logger);
  this.close = logger.close.bind(logger);
}
