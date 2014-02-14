#!/bin/bash

# $1 = filepath/name of weekly FBO XML file "dump"
# $2 = output filepath/name for the raw JSON conversion
# TODO: do we need more preprocessing?
# TODO: bulk conversion
# $3 = output filepath/name of the list of links to the FBO listings
# [NOT USED:]
# $4 = directory into which attachments should be downloaded

# you can specify just the input file, or all four files, or none at all

json_output_file='workfiles/notices.json'
links_output_file='workfiles/listings-links.txt'
bulk_output_file='workfiles/notices.bulk'
# NOT USED
attachment_download_dir='fbo-attachments/'

if [ $# -eq 2 ]
then
	links_output_file=$1
	attachment_download_dir=$2
fi

FBO_WEEKLY_XML_FILE=${FBO_WEEKLY_XML_FILE:-"workfiles/FBOFullXML.xml"}
ELASTICSEARCH_URI=${ELASTICSEARCH_URI:-"localhost:9200"}
echo "ELASTICSEARCH_URI = $ELASTICSEARCH_URI"
ELASTICSEARCH_INDEX=${ELASTICSEARCH_INDEX:-"fbopen"}
echo "ELASTICSEARCH_INDEX = $ELASTICSEARCH_INDEX"

mkdir -p workfiles #$attachment_download_dir

echo "JSON output file is " $json_output_file
echo "list of links is " $links_output_file
#print "[NOT USED] attachments stored in " $attachment_download_dir >> $logfile

echo "Downloading weekly XML dump..."
wget ftp://ftp.fbo.gov/datagov/FBOFullXML.xml -O $FBO_WEEKLY_XML_FILE
# Note: if you want to resume a failed download, comment out the above and uncomment this line.
#wget -c ftp://ftp.fbo.gov/datagov/FBOFullXML.xml -O $outfile

echo "Converting to JSON..."
cat $FBO_WEEKLY_XML_FILE | node fbo-solrize-big.js > $json_output_file

echo "Extracting links..."
cat $json_output_file | json -ga listing_url > $links_output_file

# echo "Getting attachments..."

echo "Converting JSON to Elasticsearch bulk format..."
# Note the need to split the file into chunks. Else ES will fail with either a
# "connection reset by peer" or "broken pipe" error.
cat $json_output_file | node ../common/format-bulk.js -a > $bulk_output_file

echo "Splitting bulk file into chunks Elasticsearch can ingest..."
cat $bulk_output_file | split -l 10000 - workfiles/notices.bulk.

# load into Elasticsearch
echo "Loading into Elasticsearch..."
find workfiles/ -name "notices.bulk.*" -print -exec curl -XPOST "$ELASTICSEARCH_URI/$ELASTICSEARCH_INDEX/_bulk" --data-binary @"{}" \;

echo "Done loading into Elasticsearch."

# download and ingest attachments
echo "Scraping, downloading and ingesting attachments..."
cat $links_output_file | ./process-listing-links.sh | tee fbo-attachment-downloads.log

echo "FBO-Weekly Done."

