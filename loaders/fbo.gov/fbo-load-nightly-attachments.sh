#!/bin/sh


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

set -e

nightly_dir="$FBOPEN_ROOT/loaders/fbo.gov/nightly-downloads"
nightly_links_file=$nightly_dir/links.$download_date.txt
echo "Starting attachment scrape/load. See ~/log/fbo_attach.log for more info..."
cd $FBOPEN_ROOT/loaders/attachments
python fbo.py run --file $nightly_links_file --log-to-stdout
