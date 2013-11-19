# FBOpen API Server

### Install and Run
To install: `npm install`

To run: `node app.js` (or, better, `nodemon app.js`)

### API Documentation and Examples
There's some very rough, basic documentation of this APi at [http://docs.fbopen.apiary.io/](http://docs.fbopen.apiary.io/) , but here are a couple quick sample queries to get you started:

To query for all software development opportunities:
[http://localhost:3000/v0/opp?q=software+development](http://localhost:3000/v0/opp?q=software+development)

To query only for bioinformatics-related grants:
[http://localhost:3000/v0/opp?q=bioinformatics&fq=data_source:grants.gov](http://localhost:3000/v0/opp?q=bioinformatics&fq=data_source:grants.gov)

To post a new opportunity to your FBOpen server: (note there is currently no authentication or other policing of posts)
POST to [http://localhost:3000/v0/opp](http://localhost:3000/v0/opp), with at least the following fields in the body: `data_source`, `solnbr`, `listing_url`, `title`, and `close_dt`. All other fields are optional.

### To do
* authentication
* change hard-coded params to default-but-overrideable params