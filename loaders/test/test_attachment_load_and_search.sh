#!/bin/bash

source ./setup.sh

echo "Delete index so we can start out clean"
curl -XDELETE 'http://localhost:9200/fbopen_test'

echo "Creating a test index"
curl -XPUT 'http://localhost:9200/fbopen_test' -d '{
        "settings" : { "index": {"number_of_shards" : 1, "number_of_replicas" : 0 } },
        "mappings" : {
            "opp" : {
            },
            "opp_attachment" : {
                "_parent" : { "type" : "opp" },
                "_source" : { "excludes" : [ "content" ] },
                "properties" : {
                    "content" : {
                        "type" : "attachment",
                        "fields" : {
                            "content"       : { "store" : "no" },
                            "author"        : { "store" : "no" },
                            "title"         : { "store" : "no", "analyzer" : "english" },
                            "date"          : { "store" : "no" },
                            "keywords"      : { "store" : "no", "analyzer" : "keyword" },
                            "_name"         : { "store" : "no" },
                            "_content_type" : { "store" : "yes" }
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
FBOPEN_URI=localhost:9200 FBOPEN_INDEX=fbopen_test $FBOPEN_ROOT/loaders/common/load_attachment.sh $FBOPEN_ROOT/loaders/test/sample/attachments/test.rtf "FBO:PRESOL:14-0004__attachment_0" "FBO:PRESOL:14-0004"

echo "Waiting for attachment indexing... (5s)"
sleep 5

echo "Querying attachments directly for 'Jamiroquai'"
curl 'localhost:9200/fbopen_test/opp_attachment/_search?pretty=true' -d '{
    "query" : {
        "match" : { "_all" : "Jamiroquai" }
    }
}'  

echo "Querying the ES API for any field in an opp or opp_attachment containing 'Jamiroquai'"
curl 'localhost:9200/fbopen_test/opp/_search?pretty=true' -d '{
    "query" : {
        "bool" : {
            "should" : [
                { "match" : { "_all" : "Jamiroquai" } },
                { "has_child" : {
                    "type" : "opp_attachment",
                    "query" : { "match" : { "_all" : "Jamiroquai" } }
                } }
            ]
        }
    }
}'

echo "Querying the ES API for any field in an opp or opp_attachment containing 'narwhal'"
curl 'localhost:9200/fbopen_test/opp/_search?pretty=true' -d '{
    "query" : {
        "bool" : {
            "should" : [
                { "match" : { "_all" : "narwhal" } },
                { "has_child" : {
                    "type" : "opp_attachment",
                    "query" : { "match" : { "_all" : "narwhal" } }
                } }
            ]
        }
    }
}'

curl -XDELETE localhost:9200/fbopen_test

echo "Done."
