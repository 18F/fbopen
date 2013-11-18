FBOpen
======

FBOpen is an open API server, data import tools, and sample apps to help small businesses search for opportunities to work with the U.S. government.

The project began as an attempt to make it easier to search the content of [FBO.gov](http://www.fbo.gov), the U.S. government's system of record for opportunities to do business with the government. We downloaded the (XML) data from FBO's weekly data dump of opportunity listings, and loaded it into a [Solr](http://lucene.apache.org/solr/) search server. Then we used a primitive crawler to download listings' attachments and load them into Solr -- something Solr makes easy thanks to their [Tika/Solr Cell project](http://wiki.apache.org/solr/ExtractingRequestHandler).

Underneath the Google-style query page (`/sample-www`), we built a simple REST API (really a thin layer over Solr's API) so you can build your own query tools.

Then someone realized we didn't have to limit this server to FBO data. There's a second sample data loader that can be used to load data nightly from [grants.gov](http://www.grants.gov), and the API allows you to post opportunities, too.


### How to get started
* Start by installing Solr. Instructions are in the README.md in `/solr-files`.
* Get the API server up and running. See the README.md in `/api`.
* Load data into the search index using the import tools in `/loaders` -- or roll your own, or use the API's POST `/v0/opp` to post opportunities one at a time.
* To run a simple query web page, try the sample app in `/sample-www`.

### Caveat
This project is brand new and very incomplete. No guarantees of data completeness or functionality are implied or should be assumed. There is lots to do!

### License
This project constitutes an original work of the United States Government. This is free and unencumbered software released into the public domain. see the LICENSE file for more.
