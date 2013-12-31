# fbo-nightly.sh [YYYYMMDD]

# download and process the nightly file

if [[ $1 == "" ]]
then
	if date --version >/dev/null 2>&1 ;
	then
		# GNU date format
		download_date=`date --date yesterday +"%Y%m%d"`
	else
		# try this instead
		download_date=$(date -v 1d +"%Y%m%d")
	fi
elif [[ $1 == [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9] ]] # require 8-digit YYYYMMDD
then
	download_date=$1
else
	echo "Usage: fbo-nightly.sh [YYYYMMDD]"
	exit
fi

nightly_dir="nightly-downloads"

if [[ !(-d "$nightly_dir") ]]
then
	echo "directory $nightly_dir/ does not exist. Creating it now ..."
	mkdir $nightly_dir
fi

# download the nightly listing metadata, if not downloaded already
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

