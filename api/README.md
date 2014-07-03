# FBOpen API Server

### Install and Run
To install:
* First [install Elasticsearch](https://github.com/18f/fbopen/tree/master/elasticsearch) if you haven't already.
* For local usage:
    * `cp config-sample_dev.js config.js`
* For production usage:
    * `cp config-sample.js config.js`
* Install dependencies: `npm install`
    * If your default version of Python is > 2, you will need to specify your path to Python 2.7 for npm to successfully install one of the Node packages.
        * npm install --python=/usr/local/bin/python2.7

To run: `node app.js` (or, say, [`nodemon app.js`](https://github.com/remy/nodemon))

### API Documentation and Examples
There's some very rough, basic documentation of this APi at [http://18f.github.io/fbopen/](http://18f.github.io/fbopen/) , but here are a couple quick sample queries to get you started:

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
You'll need to install elasticdump globally as well:

```
npm install -g elasticdump
```

Several aspects of the test run can be changed in the `Makefile`, such as the timeout, hostname, index name and test reporter.

### To do
* add authentication
* restore and improve POST /opp and POST /opp/:doc_id/tags/
* ?
