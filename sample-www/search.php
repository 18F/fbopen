<?php

	/*
	 *
	 
	 A simple pass-through server-side handler for the sample FBOpen web app.

	 This is almost entirely a transparent pass-through from the client sample app to the API server.

	 We created it only to work around the XSS issue we'd run into if calling the API directly from the client.
	 We could use CORS to get around this in most modern browsers, but the sample app had to work on IE8/IE9.

	 *
	 */ 

	$url = 'http://localhost:3000/v0/';


	// POST requests
	if (isset($_POST['action'])) {

		$method = $_POST['action'];
		$url = $url . $_POST['action'];

		$opts = array('http' => array('method' => 'POST'));
		$context  = stream_context_create($opts);

		$result = file_get_contents($url, false, $context);

		echo $result;
		exit;
	}


	// Standard queries (GET requests)

	$url = $url . 'opp?';

	$q_param = '';
	if (isset($_GET['q'])) {
		$q = urlencode($_GET['q']);
		$q_param = '&q=+' . urlencode($_GET['q']);
		// $q_param = '&q={!join from=solnbr to=solnbr}"' . $q . '" AND (listing_url:* OR "' . $q . '")';
	}

	if (!isset($_GET['show_noncompeted']) || $_GET['show_noncompeted'] == 'false') {
		$q_param .= urlencode(' -"single source" -"sole source" -"other than full and open competition"');
	}

	$fq_param = '';
	$fq = '';
	if (isset($_GET['fq'])) {
		$fq = urlencode($_GET['fq']);
	}
	if ($fq != '') $fq_param = '&fq=' . $fq;

	$data_source = '';
	$data_source_param = '';
	if (isset($_GET['naics'])) {
		if ($q_param != '') {
			$fq_param = $fq_param . '&fq=FBO_NAICS:' . urlencode($_GET['naics']);
		} else {
			$q_param = '&q=FBO_NAICS:' . urlencode($_GET['naics']);
		}
	}
	if (isset($_GET['data_source'])) {
		if ($q_param != '') {
			$fq_param = $fq_param . '&fq=data_source:' . urlencode($_GET['data_source']);
		} else {
			$q_param = '&q=data_source:' . urlencode($_GET['data_source']);
		}
	}

	if (!isset($_GET['show_closed']) || $_GET['show_closed'] == 'false') { // default = limit to current opportunities

		$param_phrase = 'close_dt:[NOW/DAY%20TO%20*]';
		if ($q_param != '') {
			$fq_param = $fq_param . '&fq=' . $param_phrase;
		} else {
			$q_param = '&q=' . $param_phrase;
		}
	}

	
	$misc_params = '';

	// pagination
	if (isset($_GET['p'])) {
		$page = urlencode($_GET['p']);
		if (is_numeric($page)) {
			if ($page > 0) $misc_params .= '&start=' . (($page - 1) * 10);
		}
	}

	// special case: request only the parent of a specific document
	// (for quickly pulling information about an attachment's parent solicitation)
	if (isset($_GET['get_parent']) && isset($_GET['solnbr'])) {
		$misc_params .= '&get_parent=true&solnbr=' . $_GET['solnbr'];
	}


	$url = $url
	. $q_param
	. $fq_param
	. $misc_params;

	$result = file_get_contents($url);

	header('Content-type: application/json');
	echo $result;

?>