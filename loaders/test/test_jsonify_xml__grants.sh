#!/bin/bash

source ./setup.sh

echo "Converting XML into JSON (for grants.gov)"
touch /tmp/fbopen_output
node ../grants.gov/grants-nightly.js -f sample/grants.xml -o /tmp/fbopen_output -j sample/grants-ids-20150813.json -d 2015-08-14

assert "wc -l /tmp/fbopen_output | xargs echo" "5 /tmp/fbopen_output"

assert "diff -q /tmp/fbopen_output sample/output/grants_from_xml.json"

assert_end xml_conversion
