#!/bin/bash

# takes three arguments:
#   the path to the file to index,
#   the parent solnbr
#   an extra json object (optional)

fbopen_uri=${FBOPEN_URI:?"You must define FBOPEN_URI to point to your Elasticsearch instance."}
fbopen_index=${FBOPEN_INDEX:?"You must define FBOPEN_INDEX to point to your Elasticsearch index."}

file=$(openssl base64 -in $1)
name=$(basename $1)
json="{\"_name\" : \"${name}\", \"content\" : \"${file}\"}"

if [[ $# -eq 3 ]]; then
    echo $json >> tmpjson
    echo $3 >> tmpjson
    full_json="$(cat tmpjson | json --merge)"
    rm tmpjson
else
    full_json=$json
fi

echo $full_json | curl -i -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/opp_attachment?parent=$2" -d @-
