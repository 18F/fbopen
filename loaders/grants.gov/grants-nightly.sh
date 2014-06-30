#!/bin/bash
# grants-nightly.sh
set -e
# download the nightly file
# http://www.grants.gov/web/grants/xml-extract.html?p_p_id=xmlextract_WAR_grantsxmlextractportlet_INSTANCE_5NxW0PeTnSUa&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_pos=1&p_p_col_count=2&download=GrantsDBExtract20131108.zip

# get/require a date. yesterday by default.
if [[ $# -eq 0 ]]
then
    set +e
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
		echo "Usage: grants-nightly.sh [YYYYMMDD]"
	else
		download_date=$1
	fi
    set -e
fi

FBOPEN_URI=${FBOPEN_URI:-"localhost:9200"}
echo "FBOPEN_URI = $FBOPEN_URI"
FBOPEN_INDEX=${FBOPEN_INDEX:-"fbopen"}
echo "FBOPEN_INDEX = $FBOPEN_INDEX"

PWD=$FBOPEN_ROOT/loaders/grants.gov

zipped_basename="GrantsDBExtract$download_date" # .zip
download_dir="$PWD/downloads"
workfiles_dir="$PWD/workfiles"

mkdir -p "$download_dir"
mkdir -p "$workfiles_dir"

download_url="http://www.grants.gov/web/grants/xml-extract.html?p_p_id=xmlextract_WAR_grantsxmlextractportlet_INSTANCE_5NxW0PeTnSUa&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_pos=1&p_p_col_count=2&download=$zipped_basename.zip"

downloaded_zipped_file=$download_dir/$zipped_basename.zip
xml_file=$download_dir/$zipped_basename.xml

json_file=$download_dir/grants-ids-$download_date.json

# download the json file (for grant ID data)
if [[ -s "$json_file" ]]
then
	echo "WARNING: file already exists: $json_file. NOT downloading."
else
	grant_url="http://www.grants.gov/grantsws/OppsSearch?jp={%22startRecordNum%22:0,%22rows%22:9999,%22oppStatuses%22:%22open%22,%22sortBy%22:%22openDate|desc%22}&_=1383778129749"
	wget $grant_url -O $json_file
fi

# download the zipped file
if [[ -s "$downloaded_zipped_file" ]]
then
	echo "WARNING: file already exists: $downloaded_zipped_file. NOT downloading."
else
	wget $download_url -O $downloaded_zipped_file
fi

# unzip it
if [[ -s "$downloaded_zipped_file" ]]
then
	unzip -n $download_dir/$zipped_basename -d $download_dir/
	if [[ -s "$xml_file" ]]
	then
		node $PWD/grants-nightly.js -f $xml_file -j $json_file -o $workfiles_dir/grants.json
	else
		echo "ERROR: cannot find $xml_file."
	fi
else
	echo "ERROR: cannot find file $downloaded_zipped_file."
fi

echo "Converting JSON to Elasticsearch bulk JSON format"
cat $workfiles_dir/grants.json | node $FBOPEN_ROOT/loaders/common/format-bulk.js > $workfiles_dir/grants.bulk

curl -s -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/_bulk" --data-binary @$workfiles_dir/grants.bulk; echo

echo "Extracting links"
# the '-c "this.listing_url"' part filters the results to only lines where the listing_url is defined

cat $workfiles_dir/grants.json | json -agc "this.listing_url" listing_url > $workfiles_dir/links.txt

echo "Grants nightly done"




