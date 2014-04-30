# FBOpen API Server

### Install and Run
To install:
* First [install your fbopen Solr server](https://github.com/presidential-innovation-fellows/fbopen/tree/master/solr-files) if you haven't already.
* `cp config-sample.js config.js`, and in`config.js`, replace `localhost:8983` with the name/address and port of your fbopen Solr server (if you're not running it on localhost).
* Install dependencies: `npm install`

To run: `node app.js` (or, say, [`nodemon app.js`](https://github.com/remy/nodemon))

### API Documentation and Examples
There's some very rough, basic documentation of this APi at [http://docs.fbopen.apiary.io/](http://docs.fbopen.apiary.io/) , but here are a couple quick sample queries to get you started:

To query for the first page (i.e., numbers 0 through 9) of opportunities that mention software development:
[http://localhost:3000/v0/opps?q=software+development](http://localhost:3000/v0/opps?q=software+development)

To query the third page of grants that mention bioinformatics, including opportunities that have already closed (i..e, the due date has already passed):
[http://localhost:3000/v0/opps?q=bioinformatics&fq=data_source:grants.gov&start=20&show_closed=true](http://localhost:3000/v0/opps?q=bioinformatics&fq=data_source:grants.gov&start=20&show_closed=true)

To post a new opportunity to your FBOpen server:
* First, enable the POST portion of the API by un-commenting the POST code (`app.post('/v0/opp', function(req, res) { ... }`).
* POST to [http://localhost:3000/v0/opp](http://localhost:3000/v0/opp), with at least the following fields in the body: `data_source`, `solnbr` (unique solicitation or opportunity ID), `listing_url`, `title`, and `close_dt`. All other fields are optional. If you post with a data_source+solnbr combination that already exists, any fields you post will overwrite existing data in those fields.
* Note: There is no authentication of POST requests (or any other requests) written into the API.

There is also, currently commented out, a nascent POST method for tagging a record. It simply overwrites the contents of the record's `content_tags` field with whatever serialized list of tags you post. Check out the code.

### Tests
To run the tests (located in `api/test/app.js`), run:

```
    $ make test
```

Several aspects of the test run can be changed in the `Makefile`, such as the timeout, hostname, index name and test reporter.

### To do
* add authentication
* restore and improve POST /opp and POST /opp/:doc_id/tags/ 
* ?

