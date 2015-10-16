var optimist = require('optimist');

var argv = optimist
	.usage('Usage: node format-bulk.js (accepts input from STDIN and generates output on STDOUT)')
	.alias('a', 'append-description')
	.describe('a', 'flag to indicate that modified descriptions should be appended to the old ones with a datestamp')
    .alias('d', 'description-field')
    .describe('d', 'the name of the description field ("description" by default)')
    .alias('i', 'index')
    .describe('i', 'the name of the index to insert data into')
	.alias('h', 'Help')
	.argv;

if (argv.h) { // show help
	console.log(optimist.help());
	process.exit(0);
}

var append_description = false;
if (argv.a) {
    append_description = true;
}

var index_name = null;
if (argv.i) {
    index_name = argv.i;
}

var event_stream = require('event-stream');

var DEFAULT_TYPE = 'opp';


event_stream.pipeline(
    process.openStdin(),
    event_stream.split(),
    event_stream.parse(),
    event_stream.map(function(data, callback) {
        new_data = bulkify_data(data);
        callback(null, new_data);
    }), 
    process.stdout
);

var index_command = function(id, type) {
    type = type || DEFAULT_TYPE;
    bulk_fmt = {index: { _id: id, _type: type }};
    if (index_name) {
        bulk_fmt.index._index = index_name;
    }
    return bulk_fmt;
};

var update_command = function(id, type) {
    type = type || DEFAULT_TYPE;
    bulk_fmt = {update: { _id: id, _type: type }};
    if (index_name) {
        bulk_fmt.update._index = index_name;
    }
    return bulk_fmt;
};

var bulkify_data = function (data) {
    // remove is_mod from fields to be inserted
    is_mod = _delete(data, 'is_mod');

    // id goes in the top-level data
    if ('id' in data) {
        id = _delete(data, 'id');
    } else {
        id = _delete(data, '_id');
    }

    lines = [];
    if (is_mod) {

        if (append_description) {
            description = _delete(data, 'description');
            // we may need to figure out how to bypass this for grants
            descrip_obj = {};
            descrip_obj.script_file = "fbopen_append_desc";
            descrip_obj.lang = "mvel";
            descrip_obj.params = { "description": description, "posted_dt": data.posted_dt };

            lines.push(JSON.stringify(update_command(id)));
            lines.push(JSON.stringify(descrip_obj));
        }

        // for updates, we need to wrap the data in a "doc" attribute
        new_data = {};
        new_data.doc_as_upsert = true;
        new_data.doc = data;

        lines.push(JSON.stringify(update_command(id)));
        lines.push(JSON.stringify(new_data));
    } else {
        lines.push(JSON.stringify(index_command(id)));
        lines.push(JSON.stringify(data));
    }

    return lines.join("\n") + "\n";
};

function _delete(obj, key) {
    val = obj[key];
    delete obj[key];
    return val;
}
