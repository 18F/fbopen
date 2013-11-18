
// get-attachments.js

var S = require('string');
// var nodeio = require('node.io');
var http = require('http');
var https = require('https');
var fs = require('fs');

var request = require('request');
var url = require('url');
var path = require('path');

// var Lazy = require('lazy');

var exec = require('child_process').exec;

var download_path = 'fbo-attachments/';
// var download_subpath = 'default';
var links_filename = 'fbo-attachment-link-idx.txt';
var links_filep = fs.openSync(links_filename, 'w');
var log_file = 'fbo-attachment-downloads.log';
var err_file = 'fbo-attachment-downloads.err';
var fbo_base_url = 'https://www.fbo.gov/';

var solr_server_url = 'http://localhost:8983/solr/';

// global array of default filenames
var g_out_filenames = new Array();
var g_new_filenames = new Array();

exports.job = new nodeio.Job({

	// var notice_url_file = this.options.args[0];
	// input: false,
	run: function(row) {

		// notice_url = 'https://www.fbo.gov/?s=opportunity&mode=form&id=e2905d8d962858cc11b28a51868c465c&tab=core&_cview=1';
		// notice_url = 'https://www.fbo.gov/?s=opportunity&mode=form&id=d9f701295dd9da7402b0df1ee28a4226&tab=core&_cview=1';

		notice_url = row;

		this.getHtml(notice_url, function(err, $, data, headers) {

			var links = [];
			// $('div.form a').not('[name^="mailto"]').each(function(href) {
			var solnbr = S($('#dnf_class_values_procurement_notice__solicitation_number__widget')['text']).trim().s;
			// console.log('solnbr == ' + solnbr);

			if (!fs.existsSync(download_path + solnbr)) {
				fs.mkdirSync(download_path + solnbr);
				// console.log('INFO: created dir ' + solnbr + '.');
			} else {
				// console.log('INFO: dir ' + solnbr + ' already exists.');
			}

			var attachment_idx = 0;
			var $anchors = $('div.form a');
			if ($anchors.length == 0) {
				this.emit(solnbr + ': no anchors found.');
			}

			$('div.form a').each(function(anchor) { // getHTML selector code does not properly handle ":not()"
				if (	!S(anchor.attribs['href']).startsWith('mailto') 
						&& !(anchor.attribs['class'] == 'difflink')
						&& !(anchor.attribs['class'] == 'viewers-tips')	
						&& attachment_idx <= 3 // TEMP FOR TESTING
					) {


					attachment_url = url.resolve(fbo_base_url, anchor.attribs['href']);
					attachment_basename = path.basename(attachment_url);

					links.push(attachment_url);
					
					// what needs to happen?
					// * retrieve attachment_url (aka 'href') and attachment_description
					// * download the attachment, with:
					//   attachment_filename = [trimmed, slugified solnbr] + [attachment index]
					// * write to an index file: solnbr , attachment description, attachment_filename, attachment_url
					// * load it into Solr with FBO_SOLNBR=[solnbr] & name='attachment: ' + [attachment_description]

					attachment_description = anchor.attribs['text'];

					attachment_filename = attachment_idx.toString() 
					// + '__' + S(solnbr).trim().slugify().s 
					// + '__' + attachment_basename
					;

					// FIX THIS
					// write the index file solnbr , attachment description, attachment_filename
					fs.appendFileSync(links_filename, 
						solnbr + '|' 
						+ attachment_description + '|'
						+ attachment_filename + '|'
						+ attachment_url + '|'
						 + '\n');

					// populate global array of default filenames
					g_out_filenames[attachment_idx] = attachment_filename;

					// download the attachment
					download(attachment_url, attachment_idx, solnbr);
					// download(attachment_url, download_path + attachment_filename, function() {
					// 	console.log('download callback: downloaded ' + attachment_filename);
					// });

					attachment_idx++;

				}
			});

			// this.emit(links);
		});
	},

	complete: function(cb) {
		console.log('Done.');
		cb();
	}

});

function download(download_url, attachment_idx, solnbr) {

	var ws = fs.createWriteStream(download_path + solnbr + '/' + g_out_filenames[attachment_idx]);
	request( 
		{url: download_url, strictSSL: false }, 
		function(err, resp, body) {

		if (err) {
			// console.log('download error: ' + err);
		} else if(resp.statusCode != 200) {
			fs.appendFileSync(err_file, 'Error: statusCode = ' + resp.statusCode + ' requesting ' + download_url);
		} else {

			g_new_filenames[attachment_idx] = get_attachment_filename(attachment_idx, resp.headers);

		}
	}).pipe(ws);

	ws.on('finish', function() {

		// rename
		full_path = download_path + solnbr + '/';
		old_filename = g_out_filenames[attachment_idx];
		new_filename = g_new_filenames[attachment_idx];
		fs.rename(full_path + old_filename, full_path + new_filename, function() {
			// console.log('in ' + full_path + ', renamed ' + old_filename + ' to ' + new_filename + '.');
		})

		// create a unique ID
		literal_id = solnbr + '__attach__' + attachment_idx;

		// load into Solr
		curl_cmd = 'curl "' 
		+ solr_server_url 
		+ 'update/extract'
		+ '?literal.id=' + literal_id 
		+ '&literal.FBO_SOLNBR=' + solnbr
		+ '&literal.title=' + encodeURIComponent(new_filename)
		+ '&commit=true'
		+ '&lowernames=false'
		+ '" '
		+ '-F "myfile=@' + full_path + new_filename + '"';

		// console.log('CURL will be: ' + curl_cmd);

		var child = exec(curl_cmd, function (error, stdout, stderr) {
		    if (error !== null) {
		    	log_download('ERROR on: ' + curl_cmd);
		    } else {
				log_download('COMPLETED: ' + curl_cmd);   	
		    }
		});

	});

}

function log_download(str) {
	fs.writeFileSync(log_file, str);
}

function get_attachment_filename(attachment_idx, headers) {

	// default
	var out_filename = g_out_filenames[attachment_idx];

	cdisp = headers['content-disposition'];
	ctype = headers['content-type'];

	// console.log('content-type = ' + ctype);
	// console.log('content-disposition = ' + cdisp);

	if (cdisp == undefined) {
		// check content type for html; if so, use default filename + .html
		if (ctype == 'text/html') {
			out_filename = g_out_filenames[attachment_idx] + '.html';
		} else {
			// punt
			// console.log('WARNING: file type unknown');
		}
	} else {
		// get filename from content-disposition
		// this may not be sufficient for all cases; see various RFC/stackoverflow discussions
		out_filename = cdisp.replace(/^.*[; ]filename=/, '').replace(/\"/g, '');
	}

	// console.log('filename set: [' + out_filename + ']');

	return out_filename;
}


// var downloaded_file;
// function download(download_url, dest, cb) {
  
  // console.log('*** starting download for ' + download_url);

  // var request = http.get(url, function(response) {

  // download_options = {
  // 	uri: download_url
  // 	, followAllRedirects: true
  // 	, strictSSL: false
  // }

  // request(download_url).pipe(fs.createWriteStream(dest));

/*

  var req = request.get(download_url, function(err, resp, body) {

  	if (err != null && err != undefined) {
  		console.log('err: ' + err);
  	} else {

  	// if (resp == null || resp == undefined) {
  	// 	console.log('resp is NULL OR UNDEFINED');
  	// } else {
  	// 	console.log('resp = ');
  	// 	for (o in resp) {
  	// 		console.log('idx = ' + o + ', resp[idx] == ' + resp[o]);
  	// 	}
  	// }

		// console.log('STATUS: ' + resp.statusCode);
		// console.log('HEADERS: ' + JSON.stringify(resp.headers));
		// console.log('URL' + resp.url);

  		// console.log('ALL resp = ');
  		// for (o in resp) {
  		// 	console.log('idx = ' + o + ', resp[idx] == ' + resp[o]);
  		// }

		downloaded_file = fs.createWriteStream(dest);
		resp.pipe(downloaded_file);
	    downloaded_file.on('finish', function() {
	      downloaded_file.close();
	      cb();
	    });
  	}
  });
 
 */

// } // download()