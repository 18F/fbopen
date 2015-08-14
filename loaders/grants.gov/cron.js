var CronJob = require('cron').CronJob,
  config = require('../config'),
  spawn = require('child_process').spawn,
  running = require('is-running'),
  fs = require('fs'),
  path = require('path'),
  child_running = false;

var grantsNightly = function () {
  if (!child_running) {
      child_running = true;
      spawnLoader(function(err) {
        if (err) {
          child_running = false;
          console.error(err);
        }
      });
  } else {
    console.log('Still running...');
  }
};

var spawnLoader = function (callback) {
  var child = spawn(path.join(__dirname, 'grants-nightly.sh'), [], {
    detached: true,
    stdio: 'inherit',
    env: {
      HOME: process.env.HOME,
      FBOPEN_URI: config.elasticsearch.uri,
      NODE_PATH_REL: process.env.NODE_PATH_REL,
    }
  });
  // child.stdout.on('data', function(data) { console.log(data.toString()); });
  // child.stderr.on('data', function(data) { console.error(data.toString()); });
  // these never seem to be called with this script
  // child.on('error', function(err) { callback(err); });
  // child.on('exit', function(code, signal) { callback(); });
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
    cronTime: '*/30 * * * * *',
    onTick: grantsNightly,
    timeZone: 'America/New_York'
});
cronjob.start();
