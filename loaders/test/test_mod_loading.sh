#!/bin/bash

cd "$(dirname "$0")"
source ./setup.sh

echo "Create test index"
curl -XPUT 'localhost:9200/fbopen_test'

echo "Load bulk file into Elasticsearch"
curl -XPOST 'localhost:9200/fbopen_test/_bulk?verbose=true' --data-binary @sample/fbo_mod.bulk; echo

echo "Waiting for indexing..."
sleep 2

echo "Querying ES for the indexed data"
curl -s 'localhost:9200/fbopen_test/_search?size=50&pretty=true&q=*:*' > /tmp/fbopen_output

echo "Parsing out just the \"hits\" portion of the JSON"
#TODO: this process could really be better
cat /tmp/fbopen_output | json -ag hits.hits > /tmp/fbopen_output.json

# make sure it looks like we expect
assert "diff -q /tmp/fbopen_output.json sample/output/fbo_mod_loaded.json"

echo "Dropping the test index"
curl -XDELETE 'http://localhost:9200/fbopen_test'; echo

assert_end mod_loading
