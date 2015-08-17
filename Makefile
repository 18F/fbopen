test: | test-loaders

test-loaders:
	./loaders/test/test_all.sh

node_modules:
	npm install

.PHONY: test test-loaders
