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

test: | test-loaders

test-loaders:
	./loaders/test/test_all.sh -x

npm-install:
	cd loaders; npm install
	cd loaders/common; npm install
	cd loaders/grants.gov; npm install
	cd loaders/fbo.gov; npm install

.PHONY: test test-loaders npm-install travis-setup
