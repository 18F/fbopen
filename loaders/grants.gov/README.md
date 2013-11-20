# Using the grants.gov loader for FBOpen

## To install the loader
* Install Solr. See the README in `/solr-files` .
* `npm install`
* `mkdir workfiles nightly-downloads tmp`

## To load the data (run nightly)
* `grants-nightly.sh [YYYYMMDD]` (defaults to yesterday)
* `load-solrized.sh`

