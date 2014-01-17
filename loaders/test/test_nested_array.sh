#!/bin/bash

source setup.sh

echo "Delete index so we can start out clean"
curl -XDELETE 'http://localhost:9200/fbopen_test'

echo "Creating a test index"
curl -XPUT 'http://localhost:9200/fbopen_test' -d '{
    "mappings" : {
        "opp" : {
            "properties" : {
                "attachments" : {
                    "properties" : {
                        "content" : {
                            "type" : "attachment",
                            "fields" : {
                                "content"  : { "store" : "no" },
                                "author"   : { "store" : "yes" },
                                "title"    : { "store" : "yes", "analyzer" : "english"},
                                "date"     : { "store" : "yes" },
                                "keywords" : { "store" : "yes", "analyzer" : "keyword" },
                                "_name"    : { "store" : "yes" },
                                "_content_type" : { "store" : "yes" }
                            }
                        }
                    }
                }
            }
        }
    }
}'

echo "Indexing sample/fbo.opp_type.bulk in ElasticSearch"
curl -s -XPOST 'http://localhost:9200/fbopen_test/_bulk' --data-binary @sample/fbo.opp_type.bulk; echo

echo "Waiting for bulk indexing... (1s)"
sleep 1

echo "Indexing each attachment"
file=$(openssl base64 -in sample/attachments/test.rtf)
json="{\"script\": \"ctx._source.attachments += attachment\", \"params\": { \"attachment\" : {\"_name\" : \"test.rtf\", \"content\" : \"${file}\" } } }"
echo $json | curl -i -XPOST 'http://localhost:9200/fbopen_test/opp/FBO:PRESOL:14-0004/_update' -d @-

echo "Waiting for attachment indexing... (10s)"
sleep 10

echo "Querying the ES API for what we just indexed"
curl 'localhost:9200/fbopen_test/_search?pretty=true&q=john'
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

