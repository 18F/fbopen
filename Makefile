travis-setup:
	./setup.sh
	curl localhost:9200
	plugin install elasticsearch/elasticsearch-mapper-attachments/2.4.3

test: | test-loaders

test-loaders:
	./loaders/test/test_all.sh -x

npm-install:
	cd loaders; npm install
	cd loaders/common; npm install
	cd loaders/grants.gov; npm install
	cd loaders/fbo.gov; npm install

.PHONY: test test-loaders npm-install travis-setup
