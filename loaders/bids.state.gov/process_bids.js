var datasource_id = 'bids.state.gov';
var fs = require('fs');

var infile = process.argv[2] || 'workfiles/download.json';
var outfile = process.argv[3] || 'workfiles/notices.json';
var field_map = {
	'Project_Announced': 'posted_dt'
	, 'Project_Title': 'title'
	, 'Implementing_Entity': 'agency'
	, 'Country': 'location'
	, 'Project_Description': 'description'
	, 'Link_To_Project': 'listing_url'
    , 'Project_Number': 'solnbr'
}

var data = JSON.parse(fs.readFileSync(infile, "utf-8"));
var bids = data['features'];
var es_data = [];

bids.forEach(function(bid){
    
    var b = bid['properties'];
    var bid_obj = {};

    for (var field in b){
        if (field in field_map){
            bid_obj[field_map[field]] = b[field]
        } else {
            bid_obj['bids.state.gov_' + field] = b[field];
        }
    }
    
    bid_obj['id'] = datasource_id + ':' + bid_obj['solnbr'];
    bid_obj['data_source'] = datasource_id;
    bid_obj['posted_dt'] = new Date(bid_obj['posted_dt']);
    es_data.push(JSON.stringify(bid_obj));
});

var text = es_data.join('\n');
fs.writeFile(outfile, text);

