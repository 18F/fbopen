var parser = require('./nightly-fbo-parser-def');

var data = '';
process.stdin.on('data', function(chunk) {
    data += chunk;
});
process.stdin.on('end', function() {
    var notices = parser.parse(data);

    for (var i in notices) {
        process.stdout.write(JSON.stringify(notices[i][0]) + '\n');
    }
});

process.stdin.resume();
