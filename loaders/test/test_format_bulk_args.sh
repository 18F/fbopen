#!/bin/bash

source setup.sh

sample='{"this":"is a sample doc"}'

echo $sample | node $FBOPEN_ROOT/loaders/common/format-bulk.js > /tmp/fbopen_output

echo "Note this test is just a stub for now."
assert "echo \"{}\" | diff -q - /tmp/fbopen_output" ""
# TODO: trying to work out if i can embed a multi-line result in the assert...
#assert "echo << END_TEST
#{"index":{"_type":"opp"}}
#{"this":"is a sample doc"}

assert_end


