# Using the grants.gov loader for FBOpen

## To install the loader
* Install Elasticsearch. See the README in `/elasticsearch` .
* `npm install`
* `mkdir workfiles nightly-downloads tmp`

## To load the data (run nightly)
* `grants-nightly.sh [YYYYMMDD]` (defaults to yesterday)
* `load-solrized.sh`

