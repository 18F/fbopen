var CronJob = require('cron').CronJob,
  config = require('../config'),
  spawn = require('child_process').spawn,
  fs = require('fs'),
  path = require('path'),
  nr = require('newrelic'),
  child_running = false;

var loaderNightly = nr.createBackgroundTransaction('loader:fbo-nightly:check', function() {
  if (!child_running) {
      // end the "check" transaction before starting the "spawn" one
      nr.endTransaction(); // loader:fbo-nightly:check
      child_running = true;
      spawnLoader(function(err) {
        if (err) console.error(err);
        child_running = false;
        nr.endTransaction(); // loader:fbo-nightly:spawn
      });
  } else {
    nr.endTransaction(); // loader:fbo-nightly:check
    console.log('Still running...');
  }
});

var spawnLoader = nr.createBackgroundTransaction('loader:fbo-nightly:spawn', function (callback) {
  var child = nr.createTracer('loader:fbo-nightly:start', function() {
    spawn(path.join(__dirname, 'fbo-nightly.sh'), [], {
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
    .on('close', nr.createTracer('loader:fbo-nightly:finishing', function(code) {
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
    cronTime: '30 12 * * *',
    // cronTime: '*/10 * * * * *', // for debugging
    onTick: loaderNightly,
    timeZone: 'America/New_York'
});
cronjob.start();
