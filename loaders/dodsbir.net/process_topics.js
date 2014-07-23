var datasource_id = 'dodsbir.net';
var fs = require('fs');
var sha1 = require('sha1');

var infile = process.argv[2] || 'workfiles/rawtopics.json';
var outfile = process.argv[3] || 'workfiles/topics.json';

var field_map = {
	'pre_release_date':         'posted_dt',
	'participating_components': 'agency', // needs concatenation
	'title':                    'title',
	'description':              'description',
	'url':                      'listing_url',
  'topic_number':             'solnbr',
  'proposals_end_date':       'close_dt'
};

var topics = JSON.parse(fs.readFileSync(infile, "ascii"));
var es_data = [];

topics.forEach(function(t){
    
    var t_obj = { 'ext': {} };

    for (var field in t){
        if (field in field_map){
            t_obj[field_map[field]] = t[field];
        } else {
            t_obj['ext'][field] = t[field];
        }
    }
    
    t_obj['solnbr'] = datasource_id + ':' + t['solicitation_id'] + ':' + t['topic_number'];
    t_obj['id'] = sha1(t_obj['solnbr']);
    t_obj['data_source'] = datasource_id;

    es_data.push(JSON.stringify(t_obj));
});

var text = es_data.join('\n');
fs.writeFile(outfile, text);
