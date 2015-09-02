TESTS=api/test/*.js

test-api:
	mkdir -p log/
	touch log/api.log
	ELASTICSEARCH_NOW=2014-04-05 ELASTICSEARCH_INDEX=fbopen_api_test ELASTICSEARCH_HOST=localhost mocha --bail --timeout 8000 --reporter nyan $(TESTS)

travis-setup:
	sudo service elasticsearch stop
	wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.6.0.deb
	sudo dpkg -i elasticsearch-1.6.0.deb
	./setup.sh
	sudo cp -R ./elasticsearch/conf/scripts /etc/elasticsearch
	sudo plugin install elasticsearch/elasticsearch-mapper-attachments/2.6.0
	sudo service elasticsearch start
	sleep 2
	ps aux | grep elasticsearch
	ls /etc/elasticsearch

test: | test-loaders test-api

test-loaders:
	./loaders/test/test_all.sh -x

npm-install:
	cd loaders; npm install
	cd loaders/common; npm install
	cd loaders/grants.gov; npm install
	cd loaders/fbo.gov; npm install
	cd loaders/bids.state.gov; npm install

load-fbo:
	./loaders/fbo.gov/fbo-nightly.sh

load-grants:
	./loaders/grants.gov/grants-nightly.sh

load-bids:
	./loaders/bids.state.gov/bids-nightly.sh


.PHONY: test test-api test-loaders npm-install travis-setup load-fbo load-grants load-bids
