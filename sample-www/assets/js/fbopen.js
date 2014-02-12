// fbopen2.js
(function( fbopen, $, undefined ) { // http://stackoverflow.com/q/5947280/185839

  // console.log stub for IE compatibility -- see http://forum.jquery.com/topic/ie-console-log
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


  //
  // CONFIGURATION
  //

  var PAGESIZE = 10; // results per page -- fixed by the API, not customizable here

  // always call current version of the API (currently v0)
  $.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
    console.log('API_SERVER_SSL == ' + fbopen_config.API_SERVER_SSL);
    console.log('protocol == ' + location.protocol);
    if (location.protocol == 'https:' && fbopen_config.API_SERVER_SSL) {
      options.url = fbopen_config.API_SERVER_SSL + '/v0' + options.url;
    } else {
      options.url = fbopen_config.API_SERVER + '/v0' + options.url;
    }
  });

  // disable ajax caching in IE
  disable_ajax_caching_in_ie();

  // hack for IE submit w/out button http://stackoverflow.com/a/14869071/185839
  $(window).on('keydown', function(event) {
      if(event.which == 13) { $('#fbopen-search-form').submit(); }
  });

  // hide raw JSOn by default
  $('#results-raw').collapse();
  $('#results-raw').collapse('hide');


  //
  // basic param handling
  //

  var search_params = {};

  // re-fill query terms
  if (location.search != '') {

    form_params = ['q', 'parent_only', 'p', 'naics', 'data_source'];
    for (i in form_params) {
      $('#' + form_params[i]).val(getParameterByName(form_params[i]));
      search_params[form_params[i]] = getParameterByName(form_params[i]);
    }

    // checkboxen:
    form_checkboxes = ['show_closed', 'show_noncompeted'];
    for (i in form_checkboxes) {
      if (getParameterByName(form_checkboxes[i])) {
        $('#' + form_checkboxes[i]).prop('checked', true);
        search_params[form_checkboxes[i]] = true;
      } else {
        $('#' + form_checkboxes[i]).prop('checked', false);
      }
    }
  }


  // Backbone

  var Opps = Backbone.Collection.extend({
    url: '/opps'
  });

  var Opp = Backbone.Model.extend({
    urlRoot: '/opp'
  });

  var OppListView = Backbone.View.extend({

    el: '#results-list',
    render: function () {

      var that = this;
      var opps = new Opps();
      
      console.log('searching using params: ');
      console.dir(search_params);

      // show advanced options UI if any of them were used in the last query
      var data_source = $('#data_source option:selected').val();
      var show_closed = $('#show_closed').is(':checked');
      var show_noncompeted = $('#show_noncompeted').is(':checked');
      if (data_source != '' || show_closed != '' || show_noncompeted) {
        $('#form-advanced-options').collapse('show');
      }

      if (search_params['q'] || search_params['data_source']) {

        do_search(opps, search_params);

      } else {

        show_splash_page();

      }

    }
  });

  var oppListView = new OppListView();


  var Router = Backbone.Router.extend({
      routes: {
        "": "home"
        // , 
        // "edit/:id": "edit",
        // "new": "edit",
      }
  });

  var router = new Router;
  router.on('route:home', function() {
    // render opp list
    oppListView.render();
  })
  // router.on('route:edit', function(id) {
  //   userEditView.render({id: id});
  // })
  
  Backbone.history.start();




  function do_search(opps, search_params) {

    // tweak params for API call

    // add API_PARAMS, if any, to search_params
    if (fbopen_config.API_PARAMS) {
      $.extend(search_params, fbopen_config.API_PARAMS);
    }

    if (search_params['p']) { // api server numbers results, not pages
      search_params['start'] = (search_params['p'] - 1) * PAGESIZE;
    }

    opps.fetch({
      data: $.param(search_params),
      success: function (opps) {

        // we're not using any models (yet), so it's simpler to just access the JSON directly for now
        var results = opps.models[0].attributes;

        console.log('api returned: ');
        console.dir(results);

        dust.isDebug = true;
        dust.render('result', results, function(err, out) {

          if (err) {
            console.log('Error: ' + err);
            $('#results-list').html('<h4>Sorry, that search didn\'t work.');
          } else {
            // display the results
            $('#results-list').html(out);
          }

          console.log('showing the results ...');

          $('#results-container').show();

          // also make the raw API response viewable
          $('#results-raw').html('<pre>' + JSON.stringify(results, undefined, 2) + '</pre>');
          $('#results-raw').collapse('hide');
          $('#results-raw-outer').show();

          // enable tooltips created in the rendering
          $('.setaside_tooltip').popover({
            'placement': 'auto'
            , 'html': true
          });

        });
      }
    });

  } // do_search()



  // DUST TEMPLATE HELPERS

  dust.helpers.doc_url = function(chunk, context, bodies, params) {
    
    var attachment_url = context.get('attachment_url') || '';
    if (attachment_url) {
      return chunk.write(attachment_url);
    }

    var listing_url = context.get('listing_url') || '';
    if (listing_url != undefined) {
      return chunk.write(listing_url);
    } else {
      return chunk.write('');
    }

  }

  dust.helpers.get_attachment_url = function(chunk, context, bodies, params) {
    var attachment_url = context.get('attachment_url') || '';
    if (attachment_url) {
      return chunk.write(attachment_url);
    } else {
      return chunk.write('');
    }

  }

  dust.helpers.parent_listing_url = function(chunk, context, bodies, params) {
    
    var parent_url = context.get('parent_link_t') || '';
    if (parent_url) {
      return chunk.write(parent_url);
    }

    var listing_url = context.get('listing_url') || '';
    if (listing_url != undefined) {
      return chunk.write(listing_url);
    }

    // get parent url ?
    var solnbr = context.get('solnbr');
    var data_source = context.get('data_source');
    return chunk.write('')
  }

  dust.helpers.set_aside = function(chunk, context, bodies, params) {

    var data_source = context.get('data_source')
    , eligibility_category = context.get('grants.gov_EligibilityCategory_t') || ''
    , additional_eligibility = context.get('grants.gov_AdditionalEligibilityInfo_t') || ''
    , set_aside_html = '';

    if (data_source == 'FBO') {
      set_aside_html = context.get('FBO_SETASIDE');
    } else if (data_source == 'grants.gov') {
      
      // for now, do not display, as we are not yet properly handling grants.gov multi-valued EligibilityCategory data.
      set_aside_html = '';
      
      // if (eligibility_category != '') {
      //   if (eligibility_category == '25' && additional_eligibility != '') {
      //     set_aside_html = '<span class="setaside_tooltip" data-toggle="popover" title="Eligibility" data-content="<div>' + S(additional_eligibility).stripTags().s + '</div>">Other (click for more)</span>';
      //   } else {
      //     eligibility_description = grants_eligibility_description(eligibility_category);
      //     set_aside_html = '<span class="setaside_tooltip" data-toggle="popover" title="Eligibility" data-content="<div>' + S(eligibility_description).stripTags().s + '</div>">' + S(eligibility_description).truncate(20).s + '</span>';
      //   }
      // }
    }

    return chunk.write(set_aside_html);
  }

  // var grants_categories = {
  //   '99': 'Unrestricted'
  //   , '00' : 'State governments'
  //   , '01' : 'County governments' 
  //   , '02' : 'City or township governments' 
  //   , '04' : 'Special district governments' 
  //   , '05' : 'Independent school districts' 
  //   , '06' : 'Public and State controlled institutions of higher education' 
  //   , '07' : 'Native American tribal governments (Federally recognized)' 
  //   , '08' : 'Public housing authorities/Indian housing authorities' 
  //   , '11' : 'Native American tribal organizations (other than Federally recognized tribal governments)' 
  //   , '12' : '501(c)(3)s (except higher ed)' 
  //   , '13' : 'Non-501(c)(3) nonprofits (except higher ed)' 
  //   , '20' : 'Private institutions of higher education' 
  //   , '21' : 'Individuals' 
  //   , '22' : 'Non-small-business for-profits' 
  //   , '23' : 'Small businesses' 
  //   , '25' : 'Others'
  // }

  // function grants_eligibility_description(cat) {
  //   return grants_categories[cat];
  // }


  dust.helpers.score_dots = function(chunk, context, bodies, params) {
    var score = dust.helpers.tap(params.score, chunk, context);
    var BLACKDOT = '<span class="blackdot">&#9679;</span>';
    var WHITEDOT = '<span class="whitedot">&#9675;</span>';
    if (score > 90) {
      return chunk.write(BLACKDOT + BLACKDOT + BLACKDOT + BLACKDOT + BLACKDOT);
    } else if (score > 70) {
      return chunk.write(BLACKDOT + BLACKDOT + BLACKDOT + BLACKDOT + WHITEDOT);
    } else if (score > 50) {
      return chunk.write(BLACKDOT + BLACKDOT + BLACKDOT + WHITEDOT + WHITEDOT);
    } else if (score > 30) {
      return chunk.write(BLACKDOT + BLACKDOT + WHITEDOT + WHITEDOT + WHITEDOT);
    } else if (score > 10) {
      return chunk.write(BLACKDOT + WHITEDOT + WHITEDOT + WHITEDOT + WHITEDOT);
    } else {
      return chunk.write(WHITEDOT + WHITEDOT + WHITEDOT + WHITEDOT + WHITEDOT);
    }
  }

  // NYI: abstract this to add arbitrary data sources
  dust.helpers.data_source_link = function(chunk, context, bodies, params) {
    var data_source = dust.helpers.tap(params.data_source, chunk, context);
    var data_source_html;
    if (data_source == 'FBO') {
      data_source_html = '<a href="//www.fbo.gov">fbo.gov</a>';
    } else if (data_source == 'grants.gov') {
      data_source_html = '<a href="//www.grants.gov">grants.gov</a>';
    } else if (data_source == 'SBIR') {
      data_source_html = '<a href="//www.sbir.gov/solicitations">SBIR/STTR</a>';
    } else {
      data_source_html = data_source;
    }
    return chunk.write(data_source_html);
  }


  // pagination

  dust.helpers.pager = function(chunk, context, bodies, params) {

    var numPages = Math.floor(context.get('numFound') / PAGESIZE) + 1;
    var currentPage = parseInt(context.get('start')) / PAGESIZE + 1;

    var pager_str = '';

    var button_disabled = (currentPage > 1 ? '' : ' class="disabled"');
    // pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, 1) + '">&lt;&lt;</a></li>'; // first page
    pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, Math.max(currentPage - 1, 1)) + '">&lt;</a></li>'; // previous page

    // numbered page links
    var this_page;
    var begin_page = Math.max(1, currentPage - 3);
    var end_page = Math.min(begin_page + 7, numPages);
    for (this_page = begin_page; this_page <= end_page; this_page++) {
      button_disabled = (currentPage != this_page ? '' : ' class="disabled"');
      if (button_disabled) {
        pager_str += '<li class="current"><span>' + this_page + '</span></li>';
      } else {
        pager_str += '<li><span><a href="' + pager_link(currentPage, this_page) + '">' + this_page + '</a></span></li>';
      }
    }
    // pager_str += '<li class="disabled"><span>page ' + currentPage + ' of ' + numPages + '</span></li>';

    button_disabled = (currentPage < numPages ? '' : ' class="disabled"');
    pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, Math.min(currentPage + 1, numPages)) + '">&gt;</a></li>'; // next page
    // pager_str += '<li' + button_disabled + '><a href="' + pager_link(currentPage, numPages) + '">&gt;&gt;</a></li>'; // last page

    return chunk.write(pager_str);
  }

  function pager_link(currentPage, i) {
    
    current_url = location.href;
    page_str = '&p=' + i;
    if (current_url.match(/&p=[0-9]*/)) {
      out_url = current_url.replace(/&p=[0-9]*/, page_str);
    } else {
      out_url = current_url + page_str;
    }
    return out_url;
  }


  // date formatting
  dust.helpers.formatDate = function(chunk, context, bodies, params) {
    var value = dust.helpers.tap(params.value, chunk, context);
    
    var dt = moment(value, 'YYYY-MM-DD[T]HH:mm:ss[Z]');

    if (dt.isValid()) {
      var dt_out = dt.format('MMM Do, YYYY');
      return chunk.write(dt_out);
    } else {
      return chunk.write('check listing');
    }
  }

  dust.helpers.result_count = function(chunk, context, bodies, params) {
    var count = dust.helpers.tap(params.count, chunk, context);
    
    if (count > 1) {
      return chunk.write('<strong>' + count + '</strong> Search results');
    } else if (count == 1) {
      return chunk.write('<strong>1</strong> Search result');
    } else {
      return chunk.write('No results.');
    }
  }


  // content snippet selection and formatting

  ELLIPSIS = '&hellip;';
  function opening_ellipsis(str) {
    if ((/^[A-Z]/).test(str[0])) {
      return '';
    } else {
      return ELLIPSIS;
    }
  }

  dust.helpers.content_short = function(chunk, context, bodies, params) {

    var doc = {};
    doc.summary = context.get('summary');
    doc.content = context.get('content');
    doc.description = context.get('description');
    doc.highlights = context.get('highlights');

    content_snippet = '';

    CONTENT_MAX_LENGTH = 300;

    if (doc.highlights.summary) {
      content_snippet = opening_ellipsis(doc.highlights.summary[0]) + doc.highlights.summary.join(ELLIPSIS + '</div><div class="content-snippet">');
    } else if (doc.summary) {
      content_snippet = opening_ellipsis(doc.summary) + S(doc.summary).stripTags().s;
    } else if (doc.highlights.description) {
      content_snippet = opening_ellipsis(doc.highlights.description[0]) + S(doc.highlights.description.join(ELLIPSIS + '</div><div class="content-snippet">')).s;
    } else if (doc.description) {
      content_snippet = opening_ellipsis(doc.description) + S(doc.description).stripTags().truncate(CONTENT_MAX_LENGTH).s;
    } else if (doc.highlights.content) {
      content_snippet = opening_ellipsis(doc.highlights.content[0]) + S(doc.highlights.content.join(ELLIPSIS + '</div><div class="content-snippet">')).s;
    } else if (doc.content) {
      content_snippet = opening_ellipsis(doc.content) + S(doc.content).stripTags().truncate(CONTENT_MAX_LENGTH).s;
    } else {
      content_snippet = '<em>No description is available.</em>'
    }

    return chunk.write(content_snippet);

  } 


  // special display mods for splash page

  function show_splash_page() {
    // rearrange a little for the home page
    $('#fbopen-search-form').addClass('intro').appendTo('#intro');
    $('#q').attr('placeholder', 'Start searching').addClass('intro');
    $('#form-advanced-label').hide();
    $('#main .brand').hide();
    $('#form-advanced-options').collapse('hide');
    $("#intro").show();

    // without a setTimeout delay, $('#q').focus() doesn't work in IE
    window.setTimeout(function(){ $('#q').focus(); }, 50);
  }        


  //
  // misc utilities/functions
  //

  function disable_ajax_caching_in_ie() {
    var ie = (function(){ // http://abbett.org/post/a-guide-to-building-webapps-with-ie8-support
        var undef,
            v = 3,
            div = document.createElement('div'),
            all = div.getElementsByTagName('i');
        while (
          div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->', all[0]
        );
        if (Function('/*@cc_on return document.documentMode===10@*/')()) {
          v = 10;
        }
        return v > 4 ? v : undef;
    }());

    if (ie) { $.ajaxSetup({ cache: false }); };
  } 

  // http://stackoverflow.com/a/901144
  function getParameterByName(name) {
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
          results = regex.exec(location.search);
      return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function htmlEncode(value){
    return $('<div/>').text(value).html();
  }

  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
  };



}( window.fbopen = window.fbopen || {}, jQuery ));
