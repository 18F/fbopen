
// get-all-attachments.js

var S = require('string');
// var nodeio = require('node.io');
// var http = require('http');
// var https = require('https');
var fs = require('fs');
var request = require('request');
var url = require('url');
var path = require('path');
var Lazy = require('lazy');
var exec = require('child_process').exec;
var cheerio = require('cheerio'); // faster/simpler than jsdom (but see below)
var date_format_lite = require('date-format-lite');

var async = require('async');


var download_path = 'fbo-attachments-20130811/';
// var download_subpath = 'default';
var links_filename = 'fbo-attachment-link-idx.txt';
var links_filep = fs.openSync(links_filename, 'w');
var log_file = 'fbo-attachment-downloads.log';
var err_file = 'fbo-attachment-downloads.err';
var fbo_base_url = 'https://www.fbo.gov/';
var solr_server_url = 'http://localhost:8983/solr/';

// global array of default filenames
var g_new_filenames = new Array();

var total = 0;


// make a list of all the attachment URLs

var attachment_queue = async.queue(get_attachment, 10);

attachment_queue.drain = function() {
	console.log('got all attachments');
}

var attachments_processed = 0;
function get_attachment(attachment_url, callback) {
	// download the attachment and record its metadata
	// or, if it's a page where we need to follow the links again,
	// add to the queue: attachment_queue.push(new_attachment_links)
	attachments_processed++;
	console.log('get_attachment: ' + attachment_url);

	get_attachment_callback(attachment_url);
}

var get_attachment_callback = function(attachment_url) {
	console.log('get_attachment_callback: ' + attachment_url);
}

var listings_processed = 0;
function get_attachment_urls(listing_url, callback) {

	// keep count of number of listings processed
	listings_processed++;

	// NYI: get a list of the attachment URLs on this listing's page
	var list_of_attachment_urls = [listings_processed + '-foo', listings_processed + '-bar'];

	// Then:
	attachment_queue.push(list_of_attachment_urls);

	console.log('get_attachment_urls: ' + listing_url + ' -- got ' + list_of_attachment_urls.join(', '));

	get_urls_callback(list_of_attachment_urls);
}

var get_urls_callback = function(list_of_attachment_urls) {
	console.log('get_urls_callback: ' + list_of_attachment_urls.join(', '));
}

var listing_queue = async.queue(get_attachment_urls, 1); // 1 at a time

listing_queue.drain = function() {
	console.log('DONE. Processed ' + listings_processed + ' listings.');
}


// push all the listing URLs, fed from stdin, into the listing queue
new Lazy(process.stdin).lines.forEach(function(line) {
	notice_url = line.toString();
	console.log('read line: ' + notice_url);
	listing_queue.push(notice_url);
});
process.stdin.resume();



/*

function oldstuff() {
	// process each URL:
	// get the HTML
	// parse it and select the attachment links
	// send the list of attachment links to separate something (function?)
  setTimeout(function() {

	notice_url = line.toString();
	console.log('notice_url = [' + notice_url + ']');

	request(notice_url, function(err, resp, body) {

		// wait:

		if (err) console.log('err = ' + err);

		$ = cheerio.load(body);

		// get solnbr
		var solnbr = S($('#dnf_class_values_procurement_notice__solicitation_number__widget').text()).trim().s;
		// console.log('solnbr = ' + solnbr);

		if (!fs.existsSync(download_path + solnbr)) {
			fs.mkdirSync(download_path + solnbr);
			// console.log('INFO: created dir ' + solnbr + '.');
		} else {
			// console.log('INFO: dir ' + solnbr + ' already exists.');
		}

		var attachment_idx = 0;

		// get rid of link types we don't want
		$('a.difflink, a.viewers-tips, a[href^="mailto"]').remove();
		$anchors = $('div.form a');

		var attachments = new Array();
		$anchors.each(function(i, el) {

			attachment_url = url.resolve(fbo_base_url, $(this).attr('href'));
			attachment_basename = path.basename(attachment_url);

			// cheerio is not quite as sophisticated as jQuery			
			attachment_desc_container = $(this).parent().next();
			attachment_desc_container.remove('span.label');
			attachment_desc = attachment_desc_container.text().replace(/^Description: /, '');

			attachments[i] = {
				'idx': i
				, 'url': attachment_url
				, 'basename': attachment_basename
				, 'solnbr': solnbr
				, 'desc': attachment_desc
			};

			// if (i <= 3) // TESTING: just the first few
			download(attachments[i]);

			attachment_idx++;

		});

		log_download('TOTAL TO DOWNLOAD: ' + attachment_idx);

	});

  }, 1000); // setTimeout

}

*/


function download(attachment) {

	var download_url = attachment['url'];
	var attachment_idx = attachment['idx'];
	var solnbr = attachment['solnbr'];

	// special handling: DLA.mil requires this cookie to pass a warning page
	// TO-DO: GO GET THE SOLICITATION ON THE RESULTING PAGE
	var j = request.jar();
	if (S(download_url).contains('dibbs.bsm.dla.mil')) {
		var cookie = request.cookie('DIBBSDoDWarning=AGREE; path=/; domain=www.dibbs.bsm.dla.mil;');
		j.add(cookie);
	}

	// TO-DO: FEDBID.COM
	// - special handling for fedbid.com: follow all non-_target="blank" anchors and download them all
	// - figure out naming, numbering, etc.

	idx_str = attachment_idx.toString();
	var ws = fs.createWriteStream(download_path + solnbr + '/' + idx_str);
	
	var childspawn = child.spawn('node');

	request( 
		{url: download_url, strictSSL: false, jar: j }, 
		function(err, resp, body) {
			if (err) {
				log_download('download request error: ' + err);
			} else if(resp.statusCode != 200) {
				log_download('download request error: statusCode = ' + resp.statusCode + ' requesting ' + download_url);
			} else {
				// is there a better way to pass this data to the stream finish callback?
				g_new_filenames[attachment_idx] = get_attachment_filename(attachment_idx, resp.headers, download_url);
			}
		}
	// ).pipe(ws);
	).pipe(childspawn);
	

	ws.on('finish', function() {

		// rename
		full_path = download_path + solnbr + '/';
		actual_filename = attachment_idx.toString();
		content_filename = g_new_filenames[attachment_idx];
		desc = attachment['desc'];

		// create a unique ID
		literal_id = solnbr + '__attach__' + attachment_idx;

		// load into Solr
		curl_cmd = 'curl "' 
		+ solr_server_url 
		+ 'update/extract'
		+ '?literal.id=' + literal_id 
		+ '&literal.FBO_SOLNBR=' + solnbr
		+ '&literal.title=' + encodeURIComponent(content_filename)
		+ '&literal.subject=' + encodeURIComponent(desc)
		+ '&commit=true'
		+ '&lowernames=false'
		+ '" '
		+ '-F "myfile=@' + full_path + content_filename + '"';

		// console.log('CURL will be: ' + curl_cmd);

		fs.rename(full_path + actual_filename, full_path + content_filename, function() {
			// console.log('in ' + full_path + ', renamed ' + old_filename + ' to ' + new_filename + '.');

			var child = exec(curl_cmd, function (error, stdout, stderr) {
			    if (error !== null) {
			    	log_download('ERROR on: ' + curl_cmd);
			    } else {
					log_download('COMPLETED: ' + curl_cmd);   	
			    }
			});
		})


	});

}


function get_attachment_filename(attachment_idx, headers, download_url) {

	// default
	var out_filename = attachment_idx.toString();

	cdisp = headers['content-disposition'];
	ctype = headers['content-type'];

	// console.log('content-type = ' + ctype);
	// console.log('content-disposition = ' + cdisp);

	if (cdisp == undefined) {
		// check content type for html; if so, use default filename + .html
		if (S(ctype).startsWith('text/html')) {
			out_filename += '.html';
		} else {
			// punt
			// console.log('WARNING: file type unknown');
			log_download('ctype unknown: ' + ctype + ' at ' + download_url);
		}
	} else {
		// get filename from content-disposition
		// this may not be sufficient for all cases; see various RFC/stackoverflow discussions
		out_filename = cdisp.replace(/^.*[; ]filename=/, '').replace(/\"/g, '');
	}

	// console.log('filename set: [' + out_filename + ']');

	return out_filename;
}


function log_download(str) {
	var now = new Date();
	Date.masks.default = 'YYYY-MM-DD hh:mm:ss';
	str = now.format() + ' ' + S(str).trim().s + '\n';
	fs.appendFileSync(log_file, str);
}

