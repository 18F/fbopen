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
	node nightly-fbo-parser.js -o -d $download_date
else
	echo "(already downloaded $nightly_download_file)"
fi

# ingest the metadata if not ingested already
nightly_links_file="workfiles/links-$download_date.txt"
echo "nightly links file = $nightly_links_file"
node nightly-fbo-parser.js -d $download_date

# download and ingest attachments
# (To do: detect whether this is already done, too)
process-listing-links.sh < $nightly_links_file

