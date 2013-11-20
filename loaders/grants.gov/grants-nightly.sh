#
# grants-nightly.sh

# download the nightly file
# http://www.grants.gov/web/grants/xml-extract.html?p_p_id=xmlextract_WAR_grantsxmlextractportlet_INSTANCE_5NxW0PeTnSUa&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_pos=1&p_p_col_count=2&download=GrantsDBExtract20131108.zip

if [[ $1 == "" ]]
then
	download_date=`date --date yesterday +"%Y%m%d"`
else
	download_date=$1
fi
zipped_basename="GrantsDBExtract$download_date" # .zip
download_dir="downloads"

if [[ !(-d "$download_dir/") ]]
then
	echo "Directory $download_dir/ does not exist. Creating it now ..."
	mkdir "$download_dir"
fi

if [[ !(-d "workfiles/") ]]
then
	echo "Directory workfiles/ does not exist. Creating it now ..."
	mkdir workfiles
fi

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
	unzip $download_dir/$zipped_basename -d $download_dir/
	if [[ -s "$xml_file" ]]
	then
		node grants-nightly.js -f $xml_file -j $json_file
	else
		echo "ERROR: cannot find $xml_file."
	fi
else
	echo "ERROR: cannot file $downloaded_zipped_file."
fi
