#!/bin/bash

# $1 = filepath/name of weekly FBO XML file "dump"
# $2 = output filepath/name for the raw JSON conversion
# $3 = output filepath/name of the list of links to the FBO listings

# you can specify just the input file, or all four files, or none at all

json_output_file='workfiles/notices.json'
open_json_output_file='workfiles/notices_open.json'
weekly_links_file='workfiles/links.txt'
bulk_output_file='workfiles/notices.bulk'

if [ $# -eq 1 ]
then
	weekly_links_file=$1
fi

echo "Starting fbo-weekly `date`"

FBO_WEEKLY_XML_FILE=${FBO_WEEKLY_XML_FILE:-"workfiles/FBOFullXML.xml"}
FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

mkdir -p workfiles

echo "JSON output file is " $json_output_file
echo "list of links is " $weekly_links_file

echo "Downloading weekly XML dump..."
wget ftp://ftp.fbo.gov/datagov/FBOFullXML.xml -O $FBO_WEEKLY_XML_FILE
# Note: if you want to resume a failed download, comment out the above and uncomment this line.
#wget -c ftp://ftp.fbo.gov/datagov/FBOFullXML.xml -O $outfile

echo "Converting to JSON..."
cat $FBO_WEEKLY_XML_FILE | node $FBOPEN_ROOT/loaders/fbo.gov/process_notices__weekly.js > $json_output_file

echo "Finding open notices..."
cat $json_output_file | node $FBOPEN_ROOT/loaders/common/get_open_listings.js > $open_json_output_file

echo "Extracting links from open notices..."
cat $open_json_output_file | json -ga listing_url > $weekly_links_file

echo "Converting JSON to Elasticsearch bulk format..."
# Note the need to split the file into chunks. Else ES will fail with either a
# "connection reset by peer" or "broken pipe" error.
cat $json_output_file | node $FBOPEN_ROOT/loaders/common/format-bulk.js -a > $bulk_output_file

echo "Splitting bulk file into chunks Elasticsearch can ingest..."
cat $bulk_output_file | split -l 10000 - workfiles/notices.bulk.

# load into Elasticsearch
echo "Loading into Elasticsearch..."
find workfiles/ -name "notices.bulk.*" -print -exec curl -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @"{}" \;

echo "Done loading into Elasticsearch."

echo "Starting attachment scrape/load. See ~/log/fbo_attach.log for more info..."
cd $FBOPEN_ROOT/loaders/attachments
python fbo.py run --file ../fbo.gov/$weekly_links_file

echo "fbo-weekly done `date`"

