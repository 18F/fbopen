# Installing and Configuring Elasticsearch for FBOpen (Traditional)

* Install Elasticsearch 1.3 or greater. On OS X, we recommend using the downloaded binary, as opposed to brew.
* Install the attachment mapper plugin. See directions here: https://github.com/elasticsearch/elasticsearch-mapper-attachments 
* Move static scripts into place
    * `sudo cp ./conf/scripts/* <YOUR_ES_SCRIPTS_DIR>/`
* Restart Elasticsearch
* Create an index called `fbopen0` on your Elasticsearch cluster, aliased with `fbopen`, with the proper field mappings and settings (run from the FBOpen root project dir):
    * `make es-local-init`

# 18F/Cloud Foundry Elasticsearch Configuration

Create an Elasticsearch service instance.
    
    $ cf create-service elasticsearch-new free es-idx

Set the `elasticsearch_service_name` to equal the (official) service name as above, in api/config.js.
    
    elasticsearch_service_name = 'elasticsearch-new';

Bind it to the `api` and `cron` apps by adding it under `services` in manifest.yml, or manually ala:
    
    $ cf bind-service api es-idx
    $ cf bind-service cron es-idx

Reference the name of the service in the cron env:
    
    $ cf set-env cron CF_CREDS es-idx

Then, either push or restage both apps as needed:
    
    $ cf restage api && cf restage cron

The 18F `elasticsearch-new` service image already has the custom script and necessary plugins baked in.

# System Level Config

For the purposes of setting up a production system, there are also a few files in this directory.

* `elasticsearch.conf`: This is the Upstart job for Elasticsearch. The deb package from Elasticsearch comes with an init.d job by default, but that can be disabled by running `update-rc.d -f elasticsearch remove`. This file lives in `/etc/init` on an Ubuntu system. 
* `elasticsearch.yml`: This is the main config file for Elasticsearch, but the startup flags (in the Upstart job) and `default` configs trump this.
* `elasticsearch`: This file lives in `/etc/default` and is important for providing the correct flag settings to use at startup.
