travis-setup:
	wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.6.0.deb
	sudo dpkg -i elasticsearch-1.6.0.deb
	sudo service elasticsearch restart
	./setup.sh
	curl localhost:9200
	sudo plugin install elasticsearch/elasticsearch-mapper-attachments/2.4.3
	sudo cp -R ./elasticsearch/conf/scripts/ /usr/share/elasticsearch/config/

test: | test-loaders

test-loaders:
	./loaders/test/test_all.sh -x

npm-install:
	cd loaders; npm install
	cd loaders/common; npm install
	cd loaders/grants.gov; npm install
	cd loaders/fbo.gov; npm install

.PHONY: test test-loaders npm-install travis-setup
