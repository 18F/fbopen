
var CronJob = require('cron').CronJob,
  config = require('../config'),
  spawn = require('child_process').spawn,
  fs = require('fs'),
  path = require('path'),
  nr = require('newrelic'),
  child_running = false;

var loaderNightly = function () {
  if (!child_running) {
      child_running = true;
      nr.createBackgroundTransaction('spawn:fbo-nightly', function() {
        spawnLoader(function(err) {
          if (err) {
            child_running = false;
            console.error(err);
          }
          nr.endTransaction();
        });
      });
  } else {
    console.log('Still running...');
  }
};

var spawnLoader = function (callback) {
  var child = spawn(path.join(__dirname, 'fbo-nightly.sh'), [], {
    detached: true,
    stdio: 'pipe',
    env: {
      HOME: process.env.HOME,
      FBOPEN_URI: config.elasticsearch.uri,
      PATH: process.env.PATH,
    }
  });
  child.stdout.on('data', function(data) { console.log(data.toString()); });
  child.stderr.on('data', function(data) { console.error(data.toString()); });
  // these never seem to be called with this script
  child.on('error', function(err) { callback(err); });
  child.on('exit', function(code, signal) { callback(); });
  child.on('close', function(code) {
    if (code !== 0) {
      callback('Script returned non-zero exit status');
    } else {
      callback()
    }
  });

  if (child) console.log('Started loader!');
}

var cronjob = new CronJob({
    cronTime: '*/10 * * * * *',
    onTick: loaderNightly,
    timeZone: 'America/New_York'
});
cronjob.start();
