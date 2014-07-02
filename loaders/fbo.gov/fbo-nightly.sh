#!/bin/bash

set -e
# fbo-nightly.sh [YYYYMMDD]
# download the nightly file
# get/require a date. yesterday by default.
if [[ $# -eq 0 ]]
then
    set  +e
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
    set -e
elif [[ $1 -ne "" ]]
then
    set +e 
	date -d $1
	if [[ $? -eq 1 ]]
	then
		echo "Usage: fbo-nightly.sh [YYYYMMDD]"
	else
		download_date=$1
	fi
    set -e
fi

FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

# mkdir -p will ensure the nightly download dir is in place, but won't fail if it already exists
nightly_dir="$FBOPEN_ROOT/loaders/fbo.gov/nightly-downloads"
workfiles_dir="$FBOPEN_ROOT/loaders/fbo.gov/workfiles"
mkdir -p $nightly_dir $workfiles_dir

# download the nightly file, if not downloaded already
nightly_download_file="$nightly_dir/FBOFeed$download_date.txt"
echo "nightly download = $nightly_download_file"

if [[ ! (-s $nightly_download_file) ]]
then
	wget -O $nightly_download_file ftp://ftp.fbo.gov/FBOFeed$download_date
else
	echo "(already downloaded $nightly_download_file)"
fi

echo "converting nightly file into JSON"
# process the nightly file into JSON
cat $nightly_download_file | node $FBOPEN_ROOT/loaders/fbo.gov/xml2json.js > $nightly_download_file.json

# prep the JSON further
prepped_json_notices_file=$nightly_dir/prepped_notices.$download_date.json
cat $nightly_download_file.json | node $FBOPEN_ROOT/loaders/fbo.gov/process_notices.js > $prepped_json_notices_file

# extract links
echo "Extracting links"
nightly_links_file=$nightly_dir/links.$download_date.txt
cat $prepped_json_notices_file | json -ga listing_url > $nightly_links_file

echo "Converting notices to Elasticsearch bulk format"
# convert notices to Elasticsearch's bulk format, adding -a flag to append descriptions in MODs
bulk_notices_file=$nightly_dir/notices.$download_date.bulk
cat $prepped_json_notices_file | node $FBOPEN_ROOT/loaders/common/format-bulk.js -a > $bulk_notices_file

# load into Elasticsearch
echo "Loading into Elasticsearch"
curl -s -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @$bulk_notices_file; echo


echo "fbo-nightly done."

