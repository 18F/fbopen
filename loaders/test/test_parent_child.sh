#!/bin/bash

source setup.sh

echo "Creating a test index"
curl -XPUT 'http://localhost:9200/fbopen_test' -d '{
    "settings" : {
        "number_of_shards" : 1
    },
    "mappings" : {
        "opp" : {
        },
        "opp_attachment" : {
            "_parent" : "opp",
            "properties" : {
                "content" : {
                    "type" : "attachment",
                    }
                }
            }
        }
    }
}'

echo "Indexing sample/fbo.opp_type.bulk in ElasticSearch"
curl -s -XPOST 'http://localhost:9200/fbopen_test/_bulk' --data-binary @sample/fbo.opp_type.bulk; echo

echo "Waiting for indexing..."
sleep 2

echo "Indexing each attachment"
file=$(openssl base64 -in sample/attachments/test.rtf)
json="{\"content\" : \"${file}\", \"parent\" : \"FBO:PRESOL:14-0004\"}"
echo $json | curl -i -XPOST 'http://localhost:9200/fbopen_test/opp_attachment' --data-binary @-

echo "Querying the ES API for what we just indexed"
curl 'localhost:9200/fbopen_test/_search?size=50&pretty=true&q=*:*&fields=id'# > /tmp/fbopen_output
exit

echo "Parsing out just the \"hits\" portion of the JSON"
cat /tmp/fbopen_output | json -ag hits > /tmp/fbopen_output.tmp
cat sample/output/fbo.json | json -ag hits > sample/output/fbo.json.tmp

# assert return contents
echo "Asserting output (/tmp/fbopen_output.tmp) equals expected (sample/output/fbo.json.tmp)"
assert "diff -q /tmp/fbopen_output.tmp sample/output/fbo.json.tmp"
assert_end

echo "Dropping the test index"
curl -XDELETE 'http://localhost:9200/fbopen_test'; echo

echo "Done."

