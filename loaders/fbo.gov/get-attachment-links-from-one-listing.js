// get-attachment-links.js
//
// download and ingest into Elasticsearch all the attachments linked from the provided listing URL

var S = require('string');
// var nodeio = require('node.io');
// var http = require('http');
// var https = require('https');
var fs = require('fs');
var request = require('request');
var url = require('url');
var path = require('path');
// var Lazy = require('lazy');
var execFile = require('child_process').execFile;
var cheerio = require('cheerio'); // faster/simpler than jsdom (but see below)
var date_format_lite = require('date-format-lite');
var util = require('util');

var config = require('./fbopen-loader-config.js');

var attachment_download_path = config.attachment_download_path || 'fbo-attachments/'
, links_filename = config.links_filename || 'fbo-attachment-link-idx.txt'
, log_file = config.log_file || 'fbo-attachment-downloads.log' // also used in process-listing-links.sh ; that script should pass this filename to stay consistent
, fbo_base_url = config.fbo_base_url || 'https://www.fbo.gov/'
, elasticsearch_server_url = config.elasticsearch_server_url || 'http://localhost:9200'
, elasticsearch_index = config.elasticsearch_index || 'fbopen';

var links_filep = fs.openSync(links_filename, 'w');

// global array of default filenames
var g_new_filenames = new Array();

var total = 0;

var notice_url = '';

if (!process.env['FBOPEN_ROOT']) {
    console.log("You must define FBOPEN_ROOT");
    process.exit(1);
}

var environment = process.env;
environment.FBOPEN_URI = elasticsearch_server_url;
environment.FBOPEN_INDEX = elasticsearch_index;

process.argv.forEach(function(val, idx, array) {
	// first two args are "node" and this file
	if (idx == 2) notice_url = process.argv[2];
	if (idx == 3) naics_code = process.argv[3];
});

if (S(notice_url).isEmpty()) {
	console.log('Error: no URL supplied.');
	process.exit(1);
} else {
    log_download('------------- Starting: ' + notice_url + ' -----------------');
}

// process each URL:
// get the HTML
// parse it and select the attachment links
// send the list of attachment links to separate something (function?)
// console.log('notice_url = [' + notice_url + ']');

request(notice_url, function(err, resp, body) {
	if (err) {
		console.log('err = ' + err);
		log_download('err = ' + err);
	}

	$ = cheerio.load(body);

	// get solnbr
	var solnbr = S($('#dnf_class_values_procurement_notice__solicitation_number__widget').text()).trim().s;

	// get title
	var parent_title = S($('.agency-header > h2').text()).trim().s;

	// console.log('solnbr = ' + solnbr);

	if (!fs.existsSync(attachment_download_path + solnbr)) {
		fs.mkdirSync(attachment_download_path + solnbr);
		// console.log('INFO: created dir ' + solnbr + '.');
	} else {
		// console.log('INFO: dir ' + solnbr + ' already exists.');
	}

	var attachment_idx = 0;

	// get rid of link types we don't want
	$('a.difflink, a.viewers-tips, a[href^="mailto"]').remove();
	var anchors = $('div.form a');
	if (!anchors || anchors.length == 0) {
		log_download('NO LINKS');
        log_download(util.inspect(anchors));
		return;
	}

	var attachments = new Array();
	anchors.each(function(i, el) {

		anchor_href = $(this).attr('href') || '';

		// ADD OTHER EXCLUSIONS HERE:
		// e.g., "...utils/viewDifferences?..."
		if (anchor_href == '' || S(anchor_href).startsWith() == '#') {
			// no URL to follow
			log_download('SKIPPING anchor: [' + anchor_href + ']');
			return false;
		}
		attachment_url = url.resolve(fbo_base_url, anchor_href);
		// attachment_basename = path.basename(attachment_url);

		// cheerio is not quite as sophisticated as jQuery			
		attachment_desc_container = $(this).parent().next();
		attachment_desc_container.remove('span.label');
		attachment_desc = attachment_desc_container.text().replace(/^Description: /, '');
		if (!attachment_desc || attachment_desc == '') {
			attachment_desc = $(this).text();
		}

		attachments[i] = {
			'parent_link': notice_url
			, 'parent_title': parent_title
			, 'idx': i
			, 'url': attachment_url
			// , 'basename': attachment_basename
			, 'solnbr': solnbr
			, 'desc': attachment_desc
		};

		// if (i <= 3) // TESTING: just the first few
		// queue_for_download(attachments[i]);
		download(attachments[i]);

		attachment_idx++;

	});

	log_download('TOTAL TO DOWNLOAD: ' + attachment_idx);

});

function queue_for_download(attachment) {
	// test
	console.log(JSON.stringify(attachment, undefined, 2));
}


function download(attachment) {

	var download_url = attachment['url'];
	var attachment_idx = attachment['idx'];
	var solnbr = attachment['solnbr'];

	// special handling: DLA.mil requires this cookie to pass a warning page
	// TO-DO: GO GET THE SOLICITATION ON THE RESULTING PAGE
    if (S(download_url).contains('www.dibbs.bsm.dla.mil')) {
        var j = request.jar();
        console.log(S(download_url).s);
        var cookie = request.cookie('DIBBSDoDWarning=AGREE; path=/;');
        j.setCookie(cookie, S(download_url).s);
	}

	// Skip these (generic) links
	// TO DO: make (and read from) a static file list of links that should always be skipped
	// TO DO: always skip links where the entire URL is the domain name? (like "www.adobe.com")
    if (S(download_url).startsWith('ftp')) {
		log_download('Skipping URL due to unsupported protocol: ' + download_url);
        return;
    }
    else if (
		download_url == 'https://www.neco.navy.mil/navicp.aspx'
		|| download_url == 'https://www.dibbs.bsm.dla.mil/RFP'
		|| download_url == 'https://www.dibbs.bsm.dla.mil/'
		|| download_url == 'https://www.sam.gov/'
		|| download_url == 'http://www.adobe.com/'
	) {
		log_download('Skipping: ' + download_url);
		return;
	} else {
		log_download('Continuing: ' + download_url);
    }

	// TO-DO: FEDBID.COM
	// - special handling for fedbid.com: follow all non-_target="blank" anchors and download them all
	// - figure out naming, numbering, etc.

	// TO-DO: NASA.GOV has their own attachment system


	idx_str = attachment_idx.toString();
	var ws = fs.createWriteStream(attachment_download_path + solnbr + '/' + idx_str);

    // don't send the cookie jar with the request unless it has been defined
    if (j) {
        var request_options = {url: download_url, strictSSL: false, jar: j};
    } else {
        var request_options = {url: download_url, strictSSL: false};
    }

	request( 
        request_options,
		function(err, resp, body) {
			if (err) {
				log_download('download request error: ' + err);
				g_new_filenames[attachment_idx] = '';
			} else if(resp.statusCode != 200) {
				log_download('download request error: statusCode = ' + resp.statusCode + ' requesting ' + download_url);
				g_new_filenames[attachment_idx] = '';
			} else {
				// is there a better way to pass this data to the stream finish callback?
				g_new_filenames[attachment_idx] = get_attachment_filename(attachment_idx, resp.headers, download_url);
			}
		}
	).pipe(ws);

	ws.on('finish', function() {

		// rename
		full_path = attachment_download_path + solnbr + '/';
		actual_filename = attachment_idx.toString();
		content_filename = g_new_filenames[attachment_idx];
		desc = attachment['desc'];
		parent_title = attachment['parent_title'];
		parent_link = attachment['parent_link'];
		attachment_url = attachment['url'];

		// create a unique ID
		literal_id = solnbr + '__attach__' + attachment_idx;

		// don't load nameless/failed files
		if (content_filename == undefined || content_filename == 'undefined' || content_filename == '') {
			log_download('Did not load file into Elasticsearch: no content_filename for ' + literal_id);
			return;
		} else {
			log_download('loading file into Elasticsearch: ' + literal_id);
		}

		// load into Elasticsearch
		+ elasticsearch_server_url 

        var json = {
            // '_id': literal_id, // the literal_id will be supplied in the URL
            // 'data_source': 'FBO',
            // 'solnbr': solnbr,
            // 'attachment_url':  attachment_url,
            // 'title':  content_filename,
            // 'parent_title_t':  parent_title,
            // 'parent_link_t':  parent_link,
            'description':  desc
        };

		// console.log('CURL will be: ' + curl_cmd);

		fs.rename(full_path + actual_filename, full_path + content_filename, function() {
			// console.log('in ' + full_path + ', renamed ' + old_filename + ' to ' + new_filename + '.');

            var load_cmd = path.resolve(path.join(process.env['FBOPEN_ROOT'], 'loaders/common/load_attachment.sh'));
            var file_path = path.resolve(path.join(full_path, content_filename));
            var args = [file_path, literal_id, solnbr, JSON.stringify(json, undefined, 2)];

			var child = execFile(load_cmd, args, {'env': environment}, function (error, stdout, stderr) {
			    if (error || stderr) {
			    	log_download('ERROR on: ' + load_cmd);
			    	log_download(stderr);
			    } else {
					log_download('COMPLETED: ' + load_cmd);   	
                    log_download(stdout);
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

