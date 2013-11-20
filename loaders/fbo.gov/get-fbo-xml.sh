#
# get-fbo-xml.sh
if [[ $1 -eq '' ]]
then
	outfile="workfiles/FBOFullXML.xml"
else
	outfile=$1
fi

if [[ !(-d "workfiles") ]]
then
	echo "directory workfiles/ does not exist. Creating it now ..."
	mkdir workfiles
fi

wget ftp://ftp.fbo.gov/datagov/FBOFullXML.xml -O $outfile

