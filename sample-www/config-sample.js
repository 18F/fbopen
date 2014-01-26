// Configure for your API server below.
// This is also a good place to put server-specific code, e.g., analytics snippets.

(function( fbopen, $, undefined ) { // http://stackoverflow.com/q/5947280/185839
  
  fbopen_config = {
  	API_SERVER: '//localhost:3000' // Point to wherever you're running your fbopen API server
  	, API_PARAMS: { // any additional parameters that need to be passed to the API server, e.g., an api key
  		// 'api_key': 'YOUR_API_KEY'
  	} 
  }

}( window.fbopen = window.fbopen || {}, jQuery ));
