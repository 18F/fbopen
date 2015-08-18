#!/bin/bash

source ./setup.sh

echo "Formatting standard JSON into Elasticsearch bulk format JSON (for FBO)"
# http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/docs-bulk.html

cat sample/fbo_preprocessed.json | node $FBOPEN_ROOT/loaders/common/format-bulk.js -a > /tmp/fbopen_output

# make sure file is not empty
assert "wc -l /tmp/fbopen_output | xargs echo" "18 /tmp/fbopen_output"
# then check contents are correct
assert "diff -q /tmp/fbopen_output sample/output/fbo.bulk"

assert_end
