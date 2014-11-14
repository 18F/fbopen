#!/bin/bash  
set -e 

echo "Starting dodsibr-nightly `date`"
raw_json='workfiles/rawtopics.json'
processed_json='workfiles/topics.json'
bulk_file='workfiles/notices.bulk'

FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

mkdir -p workfiles

echo "Scraping topics JSON..."
python scrape.py $raw_json

echo "Processing JSON..."
node process_topics.js $raw_json $processed_json

echo "Converting JSON to Elasticsearch bulk format..."
cat $processed_json | node $FBOPEN_ROOT/loaders/common/format-bulk.js > $bulk_file

echo "Loading into Elasticsearch..."
curl -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @$bulk_file 
echo
echo "Done loading into Elasticsearch."
echo "dodsbir-nightly `date` done."
