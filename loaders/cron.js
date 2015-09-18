var CronJob = require('cron').CronJob,
  config = require('./config'),
  spawn = require('child_process').spawn,
  fs = require('fs'),
  path = require('path'),
  nr = require('newrelic'),
  fmt = require('util').format,
  child_running = false;

// Invocation:
// node cron.js <loader_name>

var LOADER_NAME;
if (process.argv[2]) {
  LOADER_NAME = process.argv[2];
} else {
  console.error(new Error("Loader name not specified!"));
  process.exit(1);
}

var loaderNightly = nr.createBackgroundTransaction(fmt('loader:%s:check', LOADER_NAME), function() {
  if (!child_running) {
      // end the "check" transaction before starting the "spawn" one
      nr.endTransaction(); // loader:..:check
      child_running = true;
      spawnLoader(function(err) {
        if (err) console.error(err);
        child_running = false;
        nr.endTransaction(); // loader:..:spawn
      });
  } else {
    nr.endTransaction(); // loader:..:check
    console.log('Still running...');
  }
});

var spawnLoader = nr.createBackgroundTransaction(fmt('loader:%s:spawn', LOADER_NAME), function (callback) {
  var child = nr.createTracer(fmt('loader:%s:start', LOADER_NAME), function() {
    spawn(path.join(__dirname, fmt('%s.sh', LOADER_NAME)), [], {
      detached: true,
      stdio: 'inherit',
      env: {
        HOME: process.env.HOME,
        FBOPEN_URI: config.elasticsearch.uri,
        PATH: process.env.PATH,
      }
    }).on('data', function(data) { console.log(data.toString()); })
    .on('error', function(err) { callback(err); })
    .on('exit', function(code, signal) { callback(); })
    .on('close', nr.createTracer(fmt('loader:%s:finishing', LOADER_NAME), function(code) {
      if (code !== 0) {
        callback('Script returned non-zero exit status');
      } else {
        callback();
      }
    }))
  })();

  if (child) console.log('Started loader!');
});

var cronjob = new CronJob({
    // cronTime: '30 12 * * *', // for realz
    // cronTime: '*/10 * * * * *', // for debugging
    cronTime: process.env.CRON_TIME,
    onTick: loaderNightly,
    timeZone: 'America/New_York'
});
cronjob.start();
