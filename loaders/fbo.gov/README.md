# Importing FedBizOpps data into FBOpen using the fbo.gov loader

## Limitations
* The fbo.gov loader currently loads only **COMBINE**, **PRESOL** and **MOD** opportunity notices.
* **MOD handling is limited.** Current behavior is to fully update the existing record with a MOD, while appending the new description to the old.
* The attachment crawler/loader is still very primitive. It works for attachments uploaded to fbo.gov or to which the listing's synopsis links directly. Attachments that are more than one hop removed from the listing page are *not* retrieved, but we hope to improve the crawler to do this.

## TODO
* load AWARD and other notice types

## To install the loader
* Install Elasticsearch. On OS X, this is as easy as `brew install elasticsearch`.
* Install the attachment mapper plugin. See directions here: https://github.com/elasticsearch/elasticsearch-mapper-attachments 
* Restart Elasticsearch
* Create an index on your Elasticsearch cluster with the proper field mappings and settings (relative path to mapping given from the FBOpen root):
    * `curl -XPUT localhost:9200/fbopen --data-binary @elasticsearch/init.json`
* In the loaders/fbo.gov/ directory:
	* `sudo npm install`
        * (note: `sudo` is required so that the json package can be installed globally.)
* In the loaders/common/ directory:
    * `npm install`

## To import FedBizOpps data
After install, first load a full set of data using the one-time/weekly loader. Then you can simply run nightly updates.

### 1. One-time/Weekly full load
1. **`fbo-weekly.sh`**
    - Downloads the full, weekly FBO XML file from ftp://ftp.fbo.gov.
    - From the fbo.gov weekly XML data dump, creates and loads a set of Elasticsearch bulk load files.
    - Dumps listing URLs into a file, to be picked up by the attachments loader (step 2).
    - **Required ENV vars:**
        - `FBOPEN_ROOT` = the absolute path to your fbopen checkout
    - **Optional ENV vars:**
        - `FBO_WEEKLY_XML_FILE` = where to save the downloaded file; default = *./workfiles/FBOFullXML.xml*
        - `FBOPEN_URI` = the URI of your Elasticsearch instance; default = *localhost:9200*
        - `FBOPEN_INDEX` = the name of the ES index to load into; default = *fbopen*
    - **Optional arguments:**
        - `$1` = output filepath/name of the list of links to the FBO listings that were prepped; default = *./workfiles/listings-links.txt*
        - `$2` = directory into which attachments should be downloaded; default = *./fbo-attachments*
    - Example full command: `FBOPEN_ROOT=/home/fbopen/fbopen FBOPEN_URI=localhost:9200 FBOPEN_INDEX=fbopen ./fbo-weekly.sh`
2. Load attachments. See [README](../attachments/README.md)
	
### Nightly updates

1. **`fbo-nightly.sh [YYYYMMDD]`** (defaults to yesterday)
    - Downloads the nightly FBO XML file from ftp://ftp.fbo.gov.
    - From the fbo.gov nightly XML data dump, creates and loads a set of Elasticsearch bulk load files.
    - Dumps listing URLs into a file, to be picked up by the attachments loader (step 2).
    - **Required ENV vars:**
        - `FBOPEN_ROOT` = the absolute path to your fbopen checkout
    - **Optional ENV vars:**
        - `FBOPEN_URI` = the URI of your Elasticsearch instance; default = *localhost:9200*
        - `FBOPEN_INDEX` = the name of the ES index to load into; default = *fbopen*
    - Example full command: `FBOPEN_ROOT=/home/fbopen/fbopen FBOPEN_URI=localhost:9200 FBOPEN_INDEX=fbopen ./fbo-nightly.sh`
2. Load attachments. See [README](../attachments/README.md)
	
If you want to do it in steps, consult `fbo-nightly.sh` for the proper commands.

The parser in the nightly code -- that is, the hard part -- is mostly the work of our predecessor [Adam Becker's](https://github.com/adamjacobbecker/) [fbo-parser](https://github.com/presidential-innovation-fellows/fbo-parser). Thanks Adam!
