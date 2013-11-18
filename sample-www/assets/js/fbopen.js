// fbopen.js: JS-driven sample/demo app

// console.log stub for IE compatibility -- see http://forum.jquery.com/topic/ie-console-log
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());


(function( fbopen, $, undefined ) { // http://stackoverflow.com/q/5947280/185839

	NAICS_FILE = '/assets/naics2012-complete.json';
	DESC_LENGTH = 10;
	ELLIPSIS = '&hellip;';

	SOLR_BASE_URL = '/search.php';

	// lame hack
	WORD_TAG_OUTER_CLASSES = 'word-tag-outer tagit-choice ui-widget-content ui-corner-all';
	need_parent_queue = [];

	$('#result-raw').collapse();
	$('#result-raw').collapse('hide');

	if (getParameterByName('options') == 'more') display_options('show');

	if (location.search != '') {

		form_params = ['q', 'parent_only', 'p', 'naics', 'data_source'];
		for (i in form_params) {
			$('#' + form_params[i]).val(getParameterByName(form_params[i]));
		}

		// checkboxen:
		form_checkboxes = ['show_closed', 'show_noncompeted'];
		for (i in form_checkboxes) {
			if (getParameterByName(form_checkboxes[i])) {
				$('#' + form_checkboxes[i]).prop('checked', true);
			} else {
				$('#' + form_checkboxes[i]).prop('checked', false);
			}
		}

		do_search();
	}

	$('#fbopen-search-form').on('submit', function() {
		$('#p').val(1);
		// do_search();
	});

	function do_search() {
		
		$('#results-container').hide();

		// construct the query
		var q = $('#q').val();
		var p = $('#p').val();
		var naics = $('#naics').val();
		var data_source = $('#data_source option:selected').val();
		var show_closed = $('#show_closed').is(':checked');
		var show_noncompeted = $('#show_noncompeted').is(':checked');

		if (naics != '' || data_source != '' || show_noncompeted) display_options('show');

		var solr_data = {};
		if (p != '') solr_data['p'] = p;
		if (q != '') solr_data['q'] = q;
		if (naics != '') solr_data['naics'] = naics;
		if (data_source != '') solr_data['data_source'] = data_source;

		solr_data['show_closed'] = show_closed;
		solr_data['show_noncompeted'] = show_noncompeted;

		$.ajax({
			'url': SOLR_BASE_URL
			, 'data': solr_data
			, 'success': display_results
			, 'error': display_error
			, 'dataType': 'json'
			// , 'jsonpCallback': callback, 'jsonp': 'json.wrf' // future jsonp?
		});

		function display_error(jqXHR, textStatus, errorThrown) {

			$('#results-list').html('');
			$('#results-other').html('textStatus = ' + textStatus + ', error thrown = ' + errorThrown);

			$('#results-container').show();

		}

		function display_results(data) {

			try {
				results = data.response.docs;
			} catch(e) {
				display_error(null, 'error', 'no results');
				return;
			}

			// dust.js template TESTING
			test_template = '{title} - {solnbr}';
			doc0 = results[0];
			compiled = dust.compile(test_template, 'test0');
			dust.loadSource(compiled);
			dust.render("test0", doc0, function(err, out) {
			  // console.log(out);
			  // $('.lead').append('<h3>Dust test</h3>' + out);
			});



			// TESTING
			// $('#result-raw').html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');
			// return;

			// if (results == undefined || results.length == 0) {
			// 	display_error(null, 'error', 'no results');
			// 	exit;
			// }

			pageSize = 10; // make this customizable

			numFound = data.response.numFound;
			$('#numFound').html(numFound);

			if (numFound == 0) {
				$('#results-list').replaceWith('<p>No results.</p>');
				$('#results-container').show();

				return;
			}

			numPages = Math.floor(numFound / pageSize) + 1;
			currentPage = parseInt(data.response.start) / pageSize + 1;

			// build the pager
			$('ul.pagination').html(pager_html(currentPage, numPages));
			$('ul.pagination').append('<li class="numFound">Showing results ' + ((currentPage - 1) * pageSize + 1) + '-' + Math.min((currentPage * pageSize), numFound) + ' of ' + numFound + '</li>');

			// disable links that should be disabled
			$('ul.pagination > li.disabled > a').on('click', function(e) {
				e.preventDefault();
			});

			// clean out any previous results
			$('#results-list, #results-other').html('');

			// get all data_source values
			data_sources_flat = data.facet_counts.facet_fields.data_source;
			data_sources_JSON = flat_list_to_json(data_sources_flat);

			naics_facets_flat = data.facet_counts.facet_fields.FBO_NAICS;
			naics_facets_JSON = flat_list_to_json(data.facet_counts.facet_fields.FBO_NAICS);
			highlights = data.highlighting;

			numResults = 0;
			for (idx in results) {

				doc = results[idx];
				doc_id = doc.id;

				toggle_description = false; // default

				// get the descriptive content
				content_snippet = get_content_snippet(doc);

				close_dt = date_display(doc.close_dt) || 'unknown; check listing';
				posted_dt = date_display(doc.posted_dt);

				data_source = doc.data_source || '';
				notice_type = doc.notice_type || 'N/A';

				score = doc.score;
				score_therm = '<div class="score_therm_outer"><div class="score_therm" style="width:' + parseInt(100 * (1 - score)) + '%;"></div></div>';

				if (data_source == 'FBO' || data_source == '') { // for now, some attachments have no data_source field
					if (doc.notice_type != '' && doc.notice_type != undefined) {

						// how to display FBO listings

						doc_title = doc.title;

						if (doc.listing_url != undefined) {
							listing_link = '<a target="_blank" href="' + doc.listing_url + '">View listing</a>';
						} else {
							listing_link = '<span class="no-listing-url">(listing link unavailable)</span>';
						}

						datestuff = '<p>'
							+ '<strong>Due: ' + close_dt + '</strong>'
							+ (posted_dt ? ' (posted ' + posted_dt + ')' : '') 
							+ '</p>';

					} else { // FBO attachment

						// skip attachments if param says to
						if ($('#parent_only').val() == 'true') continue;

						doc_title = doc.subject;
						if (doc_title == '' || doc_title == undefined) doc_title = doc.title;

						doc_parent_title = doc.parent_title_t || '';
						doc_attachment_url = doc.attachment_url || '';
						if (doc_parent_title) {
							doc_title = format_attachment_title(doc_parent_title, doc_title, doc_attachment_url);
						} else {
							if (need_parent_queue.indexOf(doc.solnbr) == -1) {
								need_parent_queue.push(doc.solnbr);
								get_parent_listing(doc.solnbr); // async API call, fills in when data comes available
							}
						}

						if (doc.parent_link_t) {
							fbo_listing_url = doc.parent_link_t;
						} else {
							fbo_listing_url = '?q=' 
							+ encodeURIComponent('solnbr:' + doc.solnbr)
							+ '&parent_only=true';
						}

						if (doc.listing_url != undefined) {
							listing_link = '<a target="_blank" class="text-success a-find-parent" data-solnbr="' + doc.solnbr + '" href="' + fbo_listing_url + '">View listing</a>';
						} else {
							listing_link = '<span class="no-listing-url">(listing link unavailable)</span>';
						}

						datestuff = '';

					}
				} else { // not FBO

					doc_title = doc.subject;
					if (doc_title == '' || doc_title == undefined) doc_title = doc.title;

					if (doc.listing_url != undefined) {
						listing_link = '<a target="_blank" href="' + doc.listing_url + '">View listing</a>';
					} else {
						listing_link = '<span class="no-listing-url">(listing link unavailable)</span>';
					}

					datestuff = '<p>'
						+ '<strong>Due: ' + close_dt + '</strong>'
						+ (posted_dt ? ' (posted ' + posted_dt + ')' : '') 
						+ '</p>';
				}

				tag_string = '<ul data-id="' + doc.id + '" class="opp-tags">';
				if (doc.content_tags) {
					for (i in doc.content_tags) {
						tag_string += '<li>' + doc.content_tags[i] + '</li>';
					}
				}
				tag_string += '</ul>';

				str = '<li class="result-item" data-solr-id="' + doc.solnbr + '" data-attachment-url="' + (doc.attachment_url || '') + '">'
				+ '<h3 class="title">' + doc_title + '</h3>'
				+ score_therm
				+ '<blockquote>'
				+ '<p>' + data_source + ' Solicitation Number: ' + doc.solnbr + '&nbsp;&nbsp;&nbsp;&nbsp;' + listing_link + '</p>'
				+ datestuff
				+ tag_string
				+ content_snippet
				+ '</blockquote>'
				+ '</li>';

				numResults++;

				$('#results-list')
				.attr('start', parseInt(data.response.start) + 1)
				.append(str);

			}

			// add tagging
			var $oppTags = $('.opp-tags');
			$oppTags.tagit({
				placeholderText: 'add tag'
				, afterTagAdded: function(event, ui) {

					if (!ui.duringInitialization) {
						tag = $(this).tagit('tagLabel', ui.tag);
						id = $(this).attr('data-id');
						console.log('adding tag ' + tag + ' to doc.id ' + id);

						// highlight
						// [copied from tag_selected_word -- make this common code!]
						$this_result = $(this).closest('li.result-item');
						$this_result.find('.summary-snippet, .content-snippet, h3.title').each(function() {

							fulltext = $(this).html();
							selected_regex = new RegExp('(\\b' + tag + '\\b|<span[^>]*>' + tag + '<\/span>)', 'gi');
							tagged_fulltext = fulltext.replace(selected_regex, '<span class="' + WORD_TAG_OUTER_CLASSES + '"><span class="word-tag">' + tag + '</span></span>');
							$(this).html(tagged_fulltext);

							// attach untag event handler
							$(this).find('span.word-tag')
							.off('click', tag_selected_word)
							.on('click', untag_selected_word);
						})

						updateTags($(this));
					}
				}
				, afterTagRemoved: function(event, ui) {

					if (!ui.duringInitialization) {
						tag = $(this).tagit('tagLabel', ui.tag);
						id = $(this).attr('data-id');
						console.log('removing tag ' + tag + ' from doc.id ' + id);

						// un-highlight
						// [copied from untag_selected_word -- make this common code!]
						$this_result = $(this).closest('li.result-item');
						$this_result.find('.summary-snippet, .content-snippet, h3.title').each(function() {
							fulltext = $(this).html();
							selected_regex = new RegExp('<span class="' + WORD_TAG_OUTER_CLASSES + '"><span class="word-tag">' + tag + '<\/span><\/span>', 'gi');
							tagged_fulltext = fulltext.replace(selected_regex, tag);
							$(this).html(tagged_fulltext);

							// attach untag event handler
							// $(this).find('span.word-tag')
							// .on('click', tag_selected_word) // remove?
							// .off('click', untag_selected_word);

						});

						updateTags($(this));
					}
				}
			});

			// attach click handler for tagging
			$(".result-item .summary-snippet, .result-item .content-snippet, .result-item h3.title").on('click', tag_selected_word);

			$('#numShown').html(numResults);

			$('#result-raw').html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');


			// NAICS code fanciness
			if (q != '') {

				$.getJSON('http://api.naics.us/v0/s?year=2012&terms=' + q, function(data, textStatus, jqXHR) {
					$('#results-other').append('<p><a data-toggle="collapse" href="#raw-naics-lookup">Click to show/hide RAW NAICS lookup on <em>' + q + '</em></a>.</p><pre id="raw-naics-lookup" class="collapse">' + JSON.stringify(data, undefined, 2) + '</pre>');
					naics_list = '';
					for (idx in data) {
						naics_code = data[idx].code;
						if (naics_code.toString().length >= 6) {
							naics_title = data[idx].title;
							facet_idx = _.indexOf(naics_facets_flat, naics_code.toString());
							if (facet_idx > -1) {
								result_count = naics_facets_flat[facet_idx + 1];
							} else {
								result_count = 0;
							}
							naics_list += result_count + ' results for NAICS code: ' + naics_code + ' = ' + naics_title + '\n\r';
						}
					}

					// TO DO: handle if api.naics.us is unavailable, returns an error, or returns no results

					$('#results-other').append('<p><a data-toggle="collapse" href="#suggested-naics-codes">Click to show/hide suggested NAICS codes for <em>' + q + '</em></a>.</p><pre id="suggested-naics-codes" class="collapse">' + naics_list + '</pre>');

				});
			}

			if (naics != '') {
				clear_facets_url = new URI(window.location.href)
				.removeSearch(['naics', 'p', 'parent_only']);
				$('#naics-facets').append(
					'<a class="list-group-item" href="' + clear_facets_url + '">'
					+ 'All results'
					+ '</a>'
					);
			} else {
				// "all" link
				all_facets_url = window.location.href;
				$('#naics-facets').append(
					'<a class="list-group-item active" href="' + all_facets_url + '">'
					+ '<span class="badge">' + numFound + '</span>'
					+ 'All results'
					+ '</a>'
					);
			}

			// get the complete set of NAICS codes
			naics_all = {};
			$.getJSON(NAICS_FILE, function(data, textStatus, jqXHR) {
				naics_all = data;

				naics_facet_count = 0;
				for (idx in naics_facets_JSON) {

					naics_facet_count++;

					facet = naics_facets_JSON[idx];

					if (facet.count == 0) continue;

					// find this code in the full list
					naics_detail = _.findWhere(naics_all, { "code": parseInt(facet.code) } );
					if (naics_detail != undefined) {
						// construct URL
						var facet_url = new URI(window.location.href)
							.removeSearch(['naics', 'p', 'parent_only'])
							.addSearch('naics', facet.code);

						if (facet.code == naics) {
							active_class = ' active';
						} else {
							active_class = '';
						}

					if (naics_facet_count == 6) {
						$('#naics-facets').after('<div class="naics-facets"><a id="naics-facets-more-toggle" class="list-group-item" data-toggle="collapse" href="#naics-facets-more">More</a></div>');
						$('#naics-facets-more-toggle').on('click', function() {
							$(this).remove();
						});
					}

					if (naics_facet_count > 5) { // remaining results go into pager
						facet_container = '#naics-facets-more';
					} else {
						facet_container = '#naics-facets';
					}

						$(facet_container).append(
							'<a class="list-group-item' + active_class + '" href="' + facet_url + '">'
								+ '<span class="badge">' + facet.count + '</span>'
								+ naics_detail.title + ' [' + facet.code + ']'
							+ '</a>'
						);
					}
				}
			});

			$('#results-container').show();

		}

	} // do_search()


	function get_parent_listing(solnbr) {

		// look up this solnbr in Solr
		var solr_url ='/search.php';

		var solr_data = {};
		solr_data.get_parent = true;
		solr_data.solnbr = solnbr;

		$.ajax( {
			url: solr_url, 
			dataType: 'json',
			data: solr_data, 
			success: function(data) {
				if (data.response.docs) {
					solnbr = data.response.docs[0].solnbr;
					parent_title = data.response.docs[0].title;
					// add the parent title as a data attribute; then in the each() loop read it from the attribute
					// (basically a back-door way to "pass" the parent_title variable into the each() function)
					$('li.result-item[data-solr-id="' + solnbr + '"]')
					.attr('data-parent-title', parent_title)
					.attr('data-parent-listing-url', data.response.docs[0].listing_url);

					$('li.result-item[data-solr-id="' + solnbr + '"]').each(function() {
						$title = $(this).find('.title');
						attachment_title = $title.text();
						parent_title = $(this).attr('data-parent-title');
						parent_listing_url = $(this).attr('data-parent-listing-url');
						attachment_url = $(this).attr('data-attachment-url'); // if available
						
						$title.html(format_attachment_title(parent_title, attachment_title, attachment_url));
						
						$(this)
						.find('.no-listing-url')
						.replaceWith('<a target="_blank" href="' + parent_listing_url + '">View listing</a>');
					});
				}
			}
		});
	}


	function format_attachment_title(parent_title, attachment_title, attachment_url) {

		ret_HTML = parent_title 
		+ '<br />'
		+ '<span class="attachment-icon glyphicon glyphicon-file"></span> ';

		if (attachment_url) {
			ret_HTML += '<a href="' + attachment_url + '" class="attachment-title">' + attachment_title + '</a>';
		} else {
			ret_HTML += '<span class="attachment-title">' + attachment_title + '</span>';
		}

		return ret_HTML;
	}


	function updateTags($tag) {

		doc_id = $tag.attr('data-id');
		tags = $tag.tagit('assignedTags');
		tags_serial = tags.join(',');

		tag_data = { 'action': 'opp/' + doc_id + '/tags/' + tags_serial }

		// console.log('POSTing: ' + SOLR_BASE_URL + ' + ' + JSON.stringify(tag_data, undefined,2));

		$.ajax({
			'url': SOLR_BASE_URL
			, 'type': 'post'
			, 'data': tag_data
			, 'success': function(data) {
				console.log('updateTags returned ' + JSON.stringify(data, undefined, 2));
			}
			, 'error': function(jqXHR, textStatus, errorThrown) {
				console.error('error: ' + textStatus + ': ' + errorThrown);
			}
			, 'dataType': 'json'
		});

	}


	function get_content_snippet(doc) {

		// Order of preference:
		// summary highlight
		// summary
		// description highlight(s)
		// description, truncated
		// content highlight(s)
		// content, truncated

		doc_highlights = highlights[doc.id];
		content_snippet = '';

		summary_open = '<div class="content-snippet">';
		summary_close = '</div>';
		content_open = '<p class="summary-snippet"><small>';
		content_close = '</small></p>';
		summary_edit = ''; summary_edit_boxed = '';

		CONTENT_MAX_LENGTH = 600;

		if (doc_highlights.summary) {
			content_snippet = summary_open + doc_highlights.summary.join(ELLIPSIS + '</div><div class="content-snippet">') 
			+ ' ' + summary_edit
			+ summary_close;
		} else if (doc.summary) {
			content_snippet = summary_open + S(doc.summary).stripTags().s 
			+ ' ' + summary_edit
			+ summary_close;
		} else if (doc_highlights.description) {
			content_snippet = summary_edit_boxed + summary_open + S(doc_highlights.description.join(ELLIPSIS + '</div><div class="content-snippet">')).truncate(CONTENT_MAX_LENGTH).s + summary_close;
		} else if (doc.description) {
			content_snippet = summary_edit_boxed + summary_open + S(doc.description).stripTags().truncate(CONTENT_MAX_LENGTH).s + summary_close;
		} else if (doc_highlights.content) {
			content_snippet = summary_edit_boxed + content_open + S(doc_highlights.content.join(ELLIPSIS + '</small></p><p><small>')).truncate(CONTENT_MAX_LENGTH).s + content_close;
		} else if (doc.content) {
			content_snippet = summary_edit_boxed + content_open + S(doc.content).stripTags().truncate(CONTENT_MAX_LENGTH).s + content_close;
		}

		return content_snippet;

	}	


	$('#more-options').on('click', function(e) {
		display_options('toggle');
		e.preventDefault();
		return false;
	});

	$('.close').on('click', function(e) {
		close_id = $(this).attr('data-close');
		$('#' + close_id).val('').select().focus();
		e.preventDefault();
		return false;
	});


	function display_options(opt) {
		if (opt == 'show') {
			$('.form-group-more').collapse('show');
			$('#more-options').text('fewer options');
		} else if (opt == 'less') {
			$('.form-group-more').collapse('hide');
			$('#more-options').text('more options');
		} else if (opt == 'toggle') {
			$('.form-group-more').collapse('toggle');
			$('#more-options').text(($('#more-options').text() == 'more options' ? 'fewer options' : 'more options'));
		}
	}


	function date_display(dt_str) {

		var dt = moment(dt_str, 'YYYY-MM-DD[T]HH:mm:ss[Z]');

		if (dt.isValid()) {
			return dt.format('MMMM Do YYYY');
		} else {
			return false;
		}
	}


	// for testing (for now)
	function display_naics_facet_list() {

		// TESTING
		naics_facets_display_list = '';			
		for (idx in naics_facets_JSON) {
			facet = naics_facets_JSON[idx];
			if (facet.count > 0) 
				naics_facets_display_list += 'code: ' + facet.code + ', count = ' + facet.count + '\n\r';
		}
		$('#results-other').append('<p>Code facet list:</p><pre>' + naics_facets_display_list + '</pre>');

	}


	// translate solr facets into JSON
	// Strangely, Solr returns facets as a flat list of code/count pairs: e.g., NAICS code, count, NAICS code, count, ... etc.
	// This function creates an array of JSON objects, each containing a code and a count.
	function flat_list_to_json(flat_list) {
		var list_out = {};
		for (var i = 0; i < flat_list.length; i+=2) {
			idx = parseInt(i/2);
			list_out[idx] = {
				code: flat_list[i],
				count: flat_list[i + 1]
			};
		}
		return list_out;
	}

	function get_naics_title(naics_code) {
		// NYI
		return '';
	}


	// http://stackoverflow.com/a/901144
	function getParameterByName(name) {
	    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}


	function pager_html(currentPage, numPages) {
		pager_str = '';

		button_disabled = (currentPage > 1 ? '' : ' class="disabled"');
		pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, 1) + '"><span class="glyphicon glyphicon-fast-backward"></span></a></li>';
		pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, Math.max(currentPage - 1, 1)) + '"><span class="glyphicon glyphicon-backward"></span></a></li>';

		pager_str += '<li class="disabled"><span>page ' + currentPage + ' of ' + numPages + '</span></li>';

		button_disabled = (currentPage < numPages ? '' : ' class="disabled"');
		pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, Math.min(currentPage + 1, numPages)) + '"><span class="glyphicon glyphicon-forward"></span></a></li>';
		pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, numPages) + '"><span class="glyphicon glyphicon-fast-forward"></span></a></li>';

		return pager_str;
	}

	function pager_link(currentPage, i) {
		current_url = location.href;
		page_str = '&p=' + i;
		if (current_url.match('&p=' + currentPage)) {
			out_url = current_url.replace('&p=' + currentPage, page_str);
		} else {
			out_url = current_url + page_str;
		}
		return out_url;
	}


	// "un-click" words that are already selected
	function untag_selected_word(e) {

		// do no more
		e.preventDefault();

		selected_text = $(this).text();
		$this_result = $(this).closest('li.result-item');
		solr_id = $this_result.attr('data-solr-id');
		$('#tag-list').append('<li>UNTAGGED: ' + selected_text + ' in ' + solr_id + '</li>');

		$(this).closest('li.result-item').find('.opp-tags').tagit("removeTagByLabel", selected_text);

		// get rid of all instances of the tag, detach this event handler, and reattach tag click event handler

		$this_result.find('.summary-snippet, .content-snippet, h3.title').each(function() {
			e.preventDefault();
			fulltext = $(this).html();
			selected_regex = new RegExp('<span class="' + WORD_TAG_OUTER_CLASSES + '"><span class="word-tag">' + selected_text + '<\/span><\/span>', 'gi');
			tagged_fulltext = fulltext.replace(selected_regex, selected_text);
			$(this).html(tagged_fulltext);

			// attach untag event handler
			// $(this).find('span.word-tag')
			// .on('click', tag_selected_word) // remove?
			// .off('click', untag_selected_word);

		});
		// $(this).removeClass('word-tag')
		// .off('click', untag_selected_word);
		// .on('click', tag_selected_word);

		return false;

	} // untag_selected_word()

	function tag_selected_word(e) {

		// Gets clicked on word (or selected text if text is selected)
		var selected_text = '';
		if (window.getSelection && (sel = window.getSelection()).modify) {
			// Webkit, Gecko
			var window_selection = window.getSelection();
			if (window_selection.isCollapsed) {
				window_selection.modify('move', 'forward', 'character');
				window_selection.modify('move', 'backward', 'word');
				window_selection.modify('extend', 'forward', 'word');
				selected_text = window_selection.toString();
				window_selection.modify('move', 'forward', 'character'); //clear selection
			}
			else {
				selected_text = window_selection.toString();
			}
		} else if ((sel = document.selection) && sel.type != "Control") {
			// IE 4+
			var textRange = sel.createRange();
			if (!textRange.text) {
				textRange.expand("word");
			}
			// Remove trailing spaces
			while (/\s$/.test(textRange.text)) {
				textRange.moveEnd("character", -1);
			}
			selected_text = textRange.text;
		}
		
		console.log('clicked: ' + selected_text);

		$this_result = $(this).closest('li.result-item');
		solr_id = $this_result.attr('data-solr-id');
		$('#tag-list').append('<li>' + selected_text + ' in ' + solr_id + '</li>');

		// add to tag list
		$(this).closest('li.result-item').find('.opp-tags').tagit("createTag", selected_text);

		// highlight word throughout this entry
		$this_result.find('.summary-snippet, .content-snippet, h3.title').each(function() {

			e.preventDefault();
			// fulltext = $(this).html();
			// selected_regex = new RegExp('(\\b' + selected_text + '\\b|<span[^>]*>' + selected_text + '<\/span>)', 'gi');
			// // tagged_fulltext = fulltext.replace(selected_regex, '<span class="word-tag">' + selected_text + '</span>');
			// tagged_fulltext = fulltext.replace(selected_regex, '<span class="' + WORD_TAG_OUTER_CLASSES + '"><span class="word-tag">' + selected_text + '</span></span>');
			// $(this).html(tagged_fulltext);

			// tagit-choice ui-widget-content ui-state-default ui-corner-all tagit-choice-editable

			// attach untag event handler
			$(this).find('span.word-tag')
			.off('click', tag_selected_word)
			.on('click', untag_selected_word);
		})

	}


}( window.fbopen = window.fbopen || {}, jQuery ));
