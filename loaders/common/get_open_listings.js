var optimist = require('optimist');
var moment = require('moment');

var argv = optimist
	.usage('Usage: node get_open_listings.js (accepts input from STDIN and generates output on STDOUT)')
	.alias('h', 'Help')
	.argv;

if (argv.h) { // show help
	console.log(optimist.help());
	process.exit(0);
}

var event_stream = require('event-stream');

var DEFAULT_TYPE = 'opp';

function is_open(data) {
  return moment(data.close_dt, 'YYYY-MM-DD').isAfter();
};

event_stream.pipeline(
  process.openStdin(),
  event_stream.split(),
  event_stream.parse(),
  event_stream.map(function(data, callback) {
    if (is_open(data)) {
      callback(null, data);
    }
    callback();
  }), 
  event_stream.stringify(),
  //event_stream.join('\n'),
  process.stdout
);


