#!/bin/bash

source setup.sh

echo "Formatting standard JSON into Elasticsearch bulk format JSON"
# http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/docs-bulk.html

cat sample/fbo_preprocessed.json | node $FBOPEN_ROOT/loaders/common/format-bulk.js > /tmp/fbopen_output

assert "diff -q /tmp/fbopen_output sample/output/fbo.bulk"

assert_end
