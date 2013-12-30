// load STDIN

var big_xml = require('big-xml');

var reader = big_xml.createReader(process.argv[1], /^doc$/);

reader.on('record', function(record) {
    process.stdout.write(JSON.stringify(record));
});
