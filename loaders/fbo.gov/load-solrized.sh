#! /bin/ksh

# load-solrized.sh:
# loads one or more Solr-ingestible XML files into Solr

# Usage:
# load-solrized.sh [list of Solr-ready XML files]


if [[ $# -eq 0 ]];
then
	FILES=workfiles/listings-solrized.xml
	# print "Usage: load-solrized.sh [list of Solr-ready XML files]"
	# exit;
	# xmldocs="/Users/aaron/code/pif/fbo-parser/fbo-solrized/*.xml"
else
 	FILES=$*
fi

print "Processing $FILES ..."

# make these settable options
solrURL=http://localhost:8983/solr/update
logfile=load-solrized.log
postjarfile=../../solr-4.4.0/example/exampledocs/post.jar
solrlogdir=../../solr-4.4.0/example/logs

# temp files
haserr=tmp/load-solrized.has_err
lasterr=tmp/load-solrized.last_err
rm -f $haserr $lasterr

print -n "START: " 
date 
print -n "START: " >> $logfile
date >> $logfile

for solrizedxmlfile in $FILES; do

	print "Reading: [$solrizedxmlfile] ..."

	print -n "$(basename $solrizedxmlfile): " >> $logfile

	# post.sh $solrizedxmlfile 2>> $haserr | grep 'POSTing file ' >> $logfile
	java -jar $postjarfile $solrizedxmlfile >> $logfile 2>> $haserr | grep 'POSTing file '
	# curl $solrURL --data-binary @$solrizedxmlfile -H 'Content-type:application/xml'  >> $logfile 2>> $haserr

	if [ -s $haserr ]
	then

		# get just the rror
		egrep '^ERROR' $solrlogdir/solr.log | tail -1 > $lasterr

		# add to output
		cat $lasterr >> $logfile

		# add filename + error to error output
		print -n "$(basename $solrizedxmlfile): " >&2
		cat $lasterr >&2

		cat $lasterr

	else
		print 'ok.' >> $logfile
	fi

	# clean up
	rm -f $haserr $lasterr

done

# curl "$solrURL?softCommit=true"

print -n "END:   "
date

print -n "END:   " >> $logfile
date >> $logfile
print "" >> $logfile

