#!/bin/bash  
set -e 

json_output_file='workfiles/notices.json'
bulk_output_file='workfiles/notices.bulk'
raw_json='workfiles/download.json'

BIDS_URL="http://bids.state.gov/geoserver/opengeo/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=opengeo%3ADATATABLE&outputformat=json"
FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

mkdir -p workfiles

echo "JSON raw file is " $raw_json

echo "Downloading JSON dump..."
wget $BIDS_URL -O $raw_json

echo "Converting to JSON..."
node process_bids.js $raw_json

echo "Converting JSON to Elasticsearch bulk format..."
cat $json_output_file | node $FBOPEN_ROOT/loaders/common/format-bulk.js -a > $bulk_output_file


# load into Elasticsearch
echo "Loading into Elasticsearch..."
curl -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @$bulk_output_file 
echo
echo "Done loading into Elasticsearch."
echo "bids.state.gov done."
