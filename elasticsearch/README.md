# Installing and Configuring Elasticsearch for FBOpen

* Install Elasticsearch. On OS X, this is as easy as `brew install elasticsearch`.
* Install the attachment mapper plugin. See directions here: https://github.com/elasticsearch/elasticsearch-mapper-attachments 
* Restart Elasticsearch
* Create an index on your Elasticsearch cluster with the proper field mappings and settings (relative path to mapping given from the FBOpen root):
    * `curl -XPUT localhost:9200/fbopen0 --data-binary @elasticsearch/init.json`
