#!/bin/ksh
#
print -n "Start: " | tee $logfile
date | tee $logfile

# $1 = filepath/name of weekly FBO XML file "dump"
# $2 = output filepath/name for the "solrized" xml (which will be imported into Solr)
# $3 = output filepath/name of the list of links to the FBO listings that were solrized
# [NOT USED:]
# $4 = directory into which attachments should be downloaded

# you can specify just the input file, or all four files, or none at all

if [[ !(-d "workfiles") ]]
then
	echo "directory workfiles/ does not exist. Creating it now ..."
	mkdir workfiles
fi

xml_input_file='workfiles/FBOFullXML.xml'
xml_output_file='workfiles/listings-solrized.xml'
links_output_file='workfiles/listings-links.txt'
# NOT USED
attachment_download_dir='fbo-attachments/'

logfile='fbo-solrize-big.log'

if [ $# -eq 1 ]
then
	xml_input_file=$1
fi

if [ $# -eq 4 ]
then
	xml_input_file=$1
	xml_output_file=$2
	links_output_file=$3
	# NOT USED
	attachment_download_dir=$4
fi

print "input file is " $xml_input_file >> $logfile
print "Solrized output file is " $xml_output_file >> $logfile
print "list of links is " $links_output_file >> $logfile
print "[NOT USED] attachments stored in " $attachment_download_dir >> $logfile

# exit

if [ -d $attachment_download_dir ]
then
	print "  (attachment directory already exists)" >> $logfile
else
	print -n "** creating attachment directory ..." >> $logfile
	mkdir $attachment_download_dir
	print " done." >> $logfile
fi

# node fbo-solrize-big.js $*
node fbo-solrize-big.js $xml_input_file $xml_output_file $links_output_file $attachment_download_dir >> $logfile

print -n "End:   " | tee -a $logfile
date | tee -a $logfile

