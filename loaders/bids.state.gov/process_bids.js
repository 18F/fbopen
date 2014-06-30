var datasource_id = 'bids.state.gov';
var fs = require('fs');
var sha1 = require('sha1');
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
};

var data = JSON.parse(fs.readFileSync(infile, "utf-8"));
var bids = data['features'];
var es_data = [];

bids.forEach(function(bid){
    
    var b = bid['properties'];
    var bid_obj = { 'ext': {} };

    for (var field in b){
        if (field in field_map){
            bid_obj[field_map[field]] = b[field];
        } else {
            bid_obj['ext'][field] = b[field];
        }
    }
    
    bid_obj['id'] = sha1( b['Lat'] + ':' + b['Lon'] + ':' + b['title']);
    bid_obj['data_source'] = datasource_id;
    bid_obj['posted_dt'] = new Date(bid_obj['posted_dt']);

    es_data.push(JSON.stringify(bid_obj));
});

console.log("Writing processed JSON file...");
var text = es_data.join('\n');
fs.writeFile(outfile, text);
