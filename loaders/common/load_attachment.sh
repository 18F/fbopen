#!/bin/bash

# takes three arguments:
#   the path to the file to index,
#   the id for the attachment
#   the parent solnbr
#   an extra json object (optional)

fbopen_root=${FBOPEN_ROOT:?"You must define FBOPEN_ROOT to point to your root FBOpen directory."}
fbopen_uri=${FBOPEN_URI:?"You must define FBOPEN_URI to point to your Elasticsearch instance."}
fbopen_index=${FBOPEN_INDEX:?"You must define FBOPEN_INDEX to point to your Elasticsearch index."}

file=$(openssl base64 -in $1)
name=$(basename $1)
json="{\"_name\" : \"${name}\", \"content\" : \"${file}\"}"

tmpfile=$(mktemp)

if [[ $# -eq 3 ]]; then
    echo $json > $tmpfile
    echo $3 >> $tmpfile
    echo "Merging the JSON..."
    full_json="$(cat tmpjson | json --merge)"
    echo "Done."
    rm $tmpfile
else
    full_json=$json
fi

echo "Inserting into Elasticsearch..."
echo $full_json | curl -s -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/opp_attachment/$2?parent=$3" -d @-
echo "Done."
