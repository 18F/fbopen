#!/bin/bash

# fbo-nightly.sh [YYYYMMDD]

# download the nightly file

# get/require a date. yesterday by default.
if [[ $# -eq 0 ]]
then
	date --version >/dev/null 2>&1
	# check return code
	if [[ $? -eq 0 ]]
	then
		# GNU date format
		download_date=`date --date yesterday +"%Y%m%d"`
	else
		# try this instead
		download_date=$(date -v -1d +"%Y%m%d")
	fi
elif [[ $1 -ne "" ]]
then
	date -d $1
	if [[ $? -eq 1 ]]
	then
		echo "Usage: fbo-nightly.sh [YYYYMMDD]"
	else
		download_date=$1
	fi
fi

ELASTICSEARCH_URI=${ELASTICSEARCH_URI:-"localhost:9200"}
echo "ELASTICSEARCH_URI = $ELASTICSEARCH_URI"
ELASTICSEARCH_INDEX=${ELASTICSEARCH_INDEX:-"fbopen"}
echo "ELASTICSEARCH_INDEX = $ELASTICSEARCH_INDEX"

# mkdir -p will ensure the nightly download dir is in place, but won't fail if it already exists
nightly_dir="nightly-downloads"
mkdir -p $nightly_dir

# download the nightly file, if not downloaded already
nightly_download_file="$nightly_dir/FBOFeed$download_date.txt"
echo "nightly download = $nightly_download_file"

if [[ ! (-s $nightly_download_file) ]]
then
	wget -O $nightly_download_file ftp://ftp.fbo.gov/FBOFeed$download_date
else
	echo "(already downloaded $nightly_download_file)"
fi

# process the nightly file into JSON
cat $nightly_download_file | node xml2json.js > $nightly_download_file.json

# prep the JSON further
prepped_json_notices_file=$nightly_dir/prepped_notices.$download_date.json
cat $nightly_download_file.json | node process_notices.js > $prepped_json_notices_file

# extract links
nightly_links_file=$nightly_dir/links.$download_date.txt
cat $prepped_json_notices_file | json -ga listing_url > $nightly_links_file

# convert notices to Elasticsearch's bulk format, adding -a flag to append descriptions in MODs
bulk_notices_file=$nightly_dir/notices.$download_date.bulk
cat $prepped_json_notices_file | node ../common/format-bulk.js -a > $bulk_notices_file

# load into Elasticsearch
curl -s -XPOST "$ELASTICSEARCH_URI/$ELASTICSEARCH_INDEX/_bulk" --data-binary @$bulk_notices_file; echo

# download and ingest attachments
cat $nightly_links_file | ./process-listing-links.sh | tee fbo-attachment-downloads.log
