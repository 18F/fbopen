#!/bin/bash

source ./setup.sh

echo "Formatting standard JSON into Elasticsearch bulk format JSON, without the -a (append) arg (for FBO)"
sample_in='{"this":"is a sample doc"}'

echo $sample_in | node $FBOPEN_ROOT/loaders/common/format-bulk.js > /tmp/fbopen_output

sample_out='{"index":{"_type":"opp"}}\n{"this":"is a sample doc"}'
echo '{"index":{"_type":"opp"}}' > /tmp/fbopen_sample_out
echo '{"this":"is a sample doc"}' >> /tmp/fbopen_sample_out

assert "diff -q /tmp/fbopen_sample_out /tmp/fbopen_output" ""

assert_end
