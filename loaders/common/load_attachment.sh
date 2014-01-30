#!/bin/bash

# takes two arguments: the path to the file to index, and the parent solnbr
fbopen_uri=${FBOPEN_URI:?"You must define FBOPEN_URI to point to your Elasticsearch instance."}
fbopen_index=${FBOPEN_INDEX:?"You must define FBOPEN_INDEX to point to your Elasticsearch index."}

file=$(openssl base64 -in $1)
name=$(basename $1)
json="{\"_name\" : \"${name}\", \"content\" : \"${file}\"}"
echo $json | curl -i -XPOST "$FBOPEN_URI/$FBOPEN_INDEX/opp_attachment?parent=$2" -d @-
