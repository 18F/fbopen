var event_stream = require('event-stream');

var DEFAULT_INDEX = 'fbopen';
var DEFAULT_TYPE = 'type1';

event_stream.pipeline(
    process.openStdin(),
    event_stream.split(),
    event_stream.parse(),
    event_stream.map(function(data, callback) {
        new_data = bulkify_data(data);
        callback(null, new_data);
    }), 
    //event_stream.stringify(),
    process.stdout
);

var index_command = function(id, type, index) {
    type = type || DEFAULT_TYPE;
    index = index || DEFAULT_INDEX;
    return { index: { _id: id, _index: index, _type: type }};
};

var update_command = function(id, type, index) {
    type = type || DEFAULT_TYPE;
    index = index || DEFAULT_INDEX;
    return { update: { _id: id, _type: type, _index: index } };
};

var bulkify_data = function (data) {
    is_mod = data.is_mod;
    delete data['is_mod'];

    id = data['id'];
    delete data['id'];

    if (is_mod) {
        // remove is_mod from fields to be inserted
        command = JSON.stringify(update_command(id));
        // for updates, we need to wrap the data in a "doc" attribute
        new_data = {};
        new_data['doc_as_upsert'] = true;
        new_data['doc'] = data;
        data_str = JSON.stringify(new_data);
    } else {
        command = JSON.stringify(index_command(id));
        data_str = JSON.stringify(data);
    }

    return command + "\n" + data_str + "\n";
};

