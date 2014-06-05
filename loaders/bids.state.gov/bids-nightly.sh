#!/bin/bash


json_output_file='workfiles/notices.json'
links_output_file='workfiles/listings-links.txt'
bulk_output_file='workfiles/notices.bulk'
raw_json='workfiles/download.json'

BIDS_URL="http://bids.state.gov/geoserver/opengeo/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=opengeo%3ADATATABLE&outputformat=json"
FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

mkdir -p workfiles

echo "JSON raw file is " $raw_json
echo "list of links is " $links_output_file

if [ -f $raw_json ];
then
    today=`date +%s`
    modified=`stat -f "%m" $raw_json`
    diff=`expr $today - $modified`
    if  (($diff > 43200));
    then 
        echo "file older than 12 hours, redownloading ..."
        wget $BIDS_URL -O $raw_json $json_output_file
    else
        echo "File exists and is recent, skipping download..."
    fi
else 
    echo "Downloading JSON dump..."
    wget $BIDS_URL -O $raw_json $json_output_file
fi

#echo "Converting to JSON..." 
node process_bids.js $raw_json  > $json_output_file

echo "Converting JSON to Elasticsearch bulk format..."
cat $json_output_file | node ../common/format-bulk.js -a > $bulk_output_file


# load into Elasticsearch
echo "Loading into Elasticsearch..."
curl -s -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @$bulk_output_file;
 echo
echo "Done loading into Elasticsearch."


echo "bids.state.gov done."

