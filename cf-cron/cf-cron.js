// Give a little help when failing.
function friendlyExit(reason){
  if (reason == 'env_job'){
    console.log('You must set the environment variable CRON_JOB.');
    process.exit();
  }
}

// Does the parameter look like the name of a service credential.
function credEval(cred) {
  if (cred.split(".")[0] == 'creds'){
    return eval(cred);
  } else {
    return cred;
  }
}

// Clean up parameters and check if they're service credentials.
function evalJob(job) {
  job = job.split(comma);
  job = job.map(Function.prototype.call, String.prototype.trim);
  job = job.map(credEval);
  return job;
}

// Get the name of our user-provided credential service.
var cf_creds = process.env.CF_CREDS;

// Use cfenv to grab our credentials from the credential service.
var cfenv = require("cfenv");
var appEnv = cfenv.getAppEnv();
var creds = appEnv.getServiceCreds(cf_creds);

// Get the command.
var comma = ',';
var env_job = process.env.CRON_JOB || friendlyExit('env_job');

// Clean up extra whitespace here to give some leeway in job formatting.
var prep_job = process.env.PREP_JOB || false;

// If there's a prep job, parse it. Otherwise, the job is bash NOP.
if (prep_job) {
  var prep = evalJob(prep_job);
} else {
  var prep = ":";
}

// Parse the cron job.
var job = evalJob(env_job);

// Get the command schedule.
var schedule = process.env.CRON_SCHEDULE;

// Lets begin.
console.log("Started...");

// Run our prep commands.
var spawn = require('child_process').spawn;

if (prep.length > 1) {
  var prep_run = spawn(prep[0], prep.slice(1));
} else {
  var prep_run = spawn(prep[0]);
}

prep_run.stdout.on('data', function (data) {
  console.log('Prep_Out: ' + data);
});

prep_run.stderr.on('data', function (data) {
  console.log('Prep_Err: ' + data);
});

prep_run.on('close', function (code) {
  console.log('Prep_Exit:' + code);

  // Set up cron and run the job.
  console.log('Scheduling...');
  var CronJob = require('cron').CronJob;

  new CronJob(schedule, function() {

      var job_run;
      if (job.length > 1) {
        job_run = spawn(job[0], job.slice(1));
      } else {
        job_run = spawn(job[0]);
      }

      job_run.stdout.on('data', function (data) {
        console.log('Job_Out: ' + data);
      });

      job_run.stderr.on('data', function (data) {
        console.log('Job_Err: ' + data);
      });

      job_run.on('close', function (code) {
        console.log('Job_Exit:' + code);
      });
  }, null, true, 'America/New_York');

});
