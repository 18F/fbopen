#!/bin/bash

# immediately fail with error code if there is a problem
set -e

# takes three arguments, plus an optional fourth:
#   the path to the file to index,
#   the id for the attachment
#   the parent solnbr
#   an extra json object (optional)

fbopen_root=${FBOPEN_ROOT:?"You must define FBOPEN_ROOT to point to your root FBOpen directory."}
fbopen_uri=${FBOPEN_URI:?"You must define FBOPEN_URI to point to your Elasticsearch instance."}
fbopen_index=${FBOPEN_INDEX:?"You must define FBOPEN_INDEX to point to your Elasticsearch index."}

echo "Starting the attachment loader..."

file=$(openssl base64 -in $1)
name=$(basename $1)
json="{\"_name\" : \"${name}\", \"content\" : \"${file}\"}"

tmpfile=$(mktemp /tmp/fbopen_test.XXXXX)

if [[ $# -eq 4 ]]; then
    echo $json > $tmpfile
    echo $4 >> $tmpfile
    echo "Merging the JSON..."
    full_json="$(cat $tmpfile | json --merge)"
    rm $tmpfile
else
    full_json=$json
fi

echo "Inserting into Elasticsearch..."
echo $full_json | curl -s -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/opp_attachment/$2?parent=$3" -d @-
echo "Done."
