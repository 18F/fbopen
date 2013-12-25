var XmlSplitter = require('xml-splitter');

var xs = new XmlSplitter('/add//doc');

xs.on('data', function(data) {
    var myobj = {}
    fields = data['field']
    for (i in fields) {
        field = fields[i];
        myobj[field.name] = field['$t'];
    }
    process.stdout.write(JSON.stringify(myobj) + '\n');
});

process.stdin.pipe(xs.stream);
