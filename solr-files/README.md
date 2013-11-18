# Installing and Configuring Solr for FBOpen

To install a simple Solr instance, follow the instructions at [http://lucene.apache.org/solr/tutorial.html](http://lucene.apache.org/solr/tutorial.html). (They make it easy!)

To customize your Solr instance for FBOpen, just copy `schema.xml` and `solr-config.xml` from this directory into your `solr/[`*core_name*]`/solr/[`*collection_name*`]/conf/` directory -- e.g., in an otherwise unmodified Solr 4.5.1 installation, put these files in `solr-4.5.1/example/solr/collection1/conf/` . Then (re-)start your Solr instance.
