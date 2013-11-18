#! /bin/ksh

# process-listing-links.sh:
# for each FBO.gov listing URL provided (by standard input),
# download and ingest into Solr all the attachments linked from that listing

links_processed=0
logfile="fbo-attachment-downloads.log"
IFS=" "
while read notice_url naics_code
do
	links_processed=$(($links_processed + 1))
	echo "$links_processed: $notice_url" | tee -a $logfile
	node get-attachment-links-from-one-listing.js $notice_url $naics_code
done
