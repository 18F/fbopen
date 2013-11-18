// fbo-import-sql.js
// 
// import project listings from an FBO daily file into an RFP-EZ database

var fs = require("fs");
var parser = require("./index");
var _s = require('underscore.string');

var input_file = '/Users/aaron/Downloads/FBOFeed20130619.xml';
// // var output_file = 'FBOFeed20130619.json';
var output_file = 'FBOFeed20130619.combine.sql';

// DOES NOT WORK
// var input_file = '/Users/aaron/Downloads/FBOFullXML.xml';
// var input_file = '/Users/aaron/Downloads/FBOFullXML-combine.1M.xml';
// var output_file = 'FBOFullXML.combine.1M.sql';

// var input_file = 'FBOFeed20130619-abbrev.xml';
// var output_file = 'FBOFeed20130619-abbrev.out';

var notices = parser.parse(fs.readFileSync(input_file, 'UTF-8'));
// console.log('type = ' + typeof notices + ', length = ' + notices.length);
// console.log('result 0: ' + JSON.stringify(notices[0]));
// console.log('result 0[0]: ' + JSON.stringify(notices[0][0]));
// console.log('result 0[0] presol: ' + JSON.stringify(notices[0][0].PRESOL));
// console.log('result 0[0] combine: ' + JSON.stringify(parse_result[0][0].COMBINE));

var i, j, k, l; // , out = '';
var sql_out = '';

var notice, naics, title, agency, office, background, respdate_raw, proposals_due_at, date_raw, year_raw, created_at, fbo_url;

// more or less constant params
var forked_from_project_id = 'NULL'
	, project_type_id = 0 // 0 == new type "Imported", since we can't map NAICS codes 1:1 to RFP-EZ project_types
	, fork_count = 0
	, recommended = 0
	, is_public = 1 // 0 == not public, 1 == public
	, sections = ''
	, variables = ''
	, sow_progress = 2 // 2 == Accepting bids
	, price_type = -1 // -1 == unknown
	, question_period_over_at = 'NULL'
	, source = 1; // 1 == SOURCE_FBO

// start new file
fs.writeFileSync(output_file, '-- PROJECTS FROM ' + input_file + '\n');

for (i in notices){
	for (j in notices[i]) {
		for (k in notices[i][j]) {
			// console.log('row ' + j + ', key = ', k);
			if (k == 'COMBINE') {

				notice = notices[i][j][k];

				naics = _s.trim(JSON.stringify(notice.NAICS), '"');

				if (naics != 541430 && naics != 541511 && naics != 512110 && naics != 561410) continue;

				title = _s.trim(JSON.stringify(notice.SUBJECT), '"');
				agency = _s.trim(JSON.stringify(notice.AGENCY), '"');
				office = _s.trim(JSON.stringify(notice.OFFICE), '"');

				background = _s.prune(_s.trim(JSON.stringify(notice.DESC), '"'), 140);
				// if (background.length > 140) background = _s.truncate(background, 140);

				fbo_url = '' + notice.URL;
				if (fbo_url != '') fbo_url = '<a target="_blank" href="' + fbo_url + '">Click here to learn more about this project, including how to bid on it</a>.';
				background += '<p>' + fbo_url + '</p>';

				respdate_raw = _s.trim(JSON.stringify(notice.RESPDATE), '"'); // e.g., 062813
				// proposals_due_at = respdate_raw.substr(0, 2) + '/' + respdate_raw.substr(2, 2) + '/20' + respdate_raw.substr(4, 2);
				proposals_due_at = '20' + respdate_raw.substr(4, 2) + respdate_raw.substr(0, 4);
				date_raw = _s.trim(JSON.stringify(notice.DATE), '"'); // e.g., 0628
				year_raw = _s.trim(JSON.stringify(notice.YEAR), '"'); // e.g., "2013"
				if (year_raw.length == 2) year_raw = '20' + year_raw;
				// created_at = date_raw.substr(0, 2) + '/' + date_raw.substr(0, 2) + '/' + year_raw;
				created_at = year_raw + date_raw;

				sql_out = "INSERT INTO projects ("
					+ "forked_from_project_id, project_type_id, title, agency, office, fork_count"
					+ ", recommended, public, background, sections, variables, proposals_due_at"
					+ ", created_at, updated_at, sow_progress, posted_to_fbo_at, price_type"
					+ ", question_period_over_at, source) "
					+ "VALUES ("
					+ forked_from_project_id 
					+ ", " + project_type_id
					+ ", '" + title + "'"
					+ ", '" + agency + "'"
					+ ", '" + office + "'"
					+ ", " + fork_count 
					+ ", " + recommended 
					+ ", " + is_public
					+ ", '" + background + "'"
					+ ", '" + sections + "'"
					+ ", '" + variables + "'"
					+ ", '" + proposals_due_at + "'"
					+ ", '" + created_at + "'"
					+ ", '" + created_at + "'"
					+ ", " + sow_progress
					+ ", '" + created_at + "'"
					+ ", " + price_type
					+ ", " + question_period_over_at
					+ ", " + source
					+ ")\n\n";

				fs.appendFileSync(output_file, sql_out);

			}
		}
	}
}

// fs.writeFileSync(output_file, sql_out);
