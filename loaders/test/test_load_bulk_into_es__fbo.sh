#!/bin/bash

source setup.sh

echo "Creating a test index"
curl -XPUT 'http://localhost:9200/fbopen_test'

echo "Indexing sample/fbo.bulk in ElasticSearch"
curl -s -XPOST 'http://localhost:9200/fbopen_test/_bulk' --data-binary @sample/fbo.bulk; echo

echo "Waiting for indexing..."
sleep 2

# query ES via the multi get API
# http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/docs-multi-get.html
# actually, let's just do a query for everything for now.
# the multi get API wants us to specify all ids to bring back. we could write that into the test but let's be lazy.

echo "Querying the ES API for what we just indexed"
curl -s 'localhost:9200/fbopen_test/_search?size=50&pretty=true&q=*:*&fields=id' > /tmp/fbopen_output

echo "Parsing out just the \"hits\" portion of the JSON"
cat /tmp/fbopen_output | json -ag hits > /tmp/fbopen_output__hits
cat sample/output/fbo.json | json -ag hits > sample/output/fbo__hits.json

#TODO: change format_bulk.js to put the id in _id and add upsert statements. also take out is_mod from the index records

# assert return contents
echo "Asserting output (/tmp/fbopen_output__hits) equals expected (sample/output/fbo__hits.json)"
assert "diff -q /tmp/fbopen_output__hits sample/output/fbo__hits.json"
assert_end

echo "Dropping the test index"
curl -XDELETE 'http://localhost:9200/fbopen_test'; echo

echo "Done."

