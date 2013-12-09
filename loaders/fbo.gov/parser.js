process.stdin.resume();
process.stdin.setEncoding('utf8');

var data = '';
process.stdin.on('data', function(chunk) {
	data += chunk;
});

process.stdin.on('end', function() {
	// console.log("DATA:\n" + data + "\nEND DATA");
});

var parser = require("./nightly-fbo-parser-def");
//var filedata = fs.readFileSync(process.argv[1], { 'encoding': 'utf-8' }, function(err, data) {
//	if (err) {
//		return console.log(err);
//	}
//	console.log(data);
//});
//console.log("----------------------------");
//console.log(filedata);
//console.log("----------------------------");
var result = parser.parse(data);
console.log(result);
console.log(JSON.stringify(result, undefined, 2));
//process.exit();

