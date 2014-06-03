# Installing and Configuring Elasticsearch for FBOpen

* Install Elasticsearch 1.1.0 or greater. On OS X, this is as easy as `brew install elasticsearch`.
* Install the attachment mapper plugin. See directions here: https://github.com/elasticsearch/elasticsearch-mapper-attachments 
* Restart Elasticsearch
* Create an index on your Elasticsearch cluster with the proper field mappings and settings (relative path to mapping given from the FBOpen root):
    * `curl -XPUT localhost:9200/fbopen0 --data-binary @elasticsearch/init.json`
        - _Note that [current best practices, circa Elasticsearch 1.1.x](http://www.elasticsearch.org/blog/aliases-ftw/), call for using aliases on top of your indexes at all times, so the index we created in the last step was given a versioned name, while `init.json` defines the canonical `fbopen` index to point to it._

# System Level Config

For the purposes of setting up a production system, there are also a few files in this directory.

* `elasticsearch.conf`: This is the Upstart job for Elasticsearch. The deb package from Elasticsearch comes with an init.d job by default, but that can be disabled by running `update-rc.d -f elasticsearch remove`. This file lives in `/etc/init` on an Ubuntu system. 
* `elasticsearch.yml`: This is the main config file for Elasticsearch, but the startup flags (in the Upstart job) and `default` configs trump this.
* `elasticsearch`: This file lives in `/etc/default` and is important for providing the correct flag settings to use at startup.
