# http://stackoverflow.com/a/3931779/94154
command_exists () {
    type "$1" &> /dev/null ;
}

ES_VERSION=1.2.1
FBOPEN_ROOT=`pwd`

echo "Initial setup"
./setup.sh

# wget and ES
echo "Checking if wget is installed."
if command_exists wget ; then
  echo "wget is already installed."
else
  echo "wget is not already installed. Installing via brew..."
  brew install wget
fi

# install ES if it doesn't already exist
if [ -d ../elasticsearch-$ES_VERSION.zip ]; then
  echo "Elasticsearch is already installed."
else
  echo "Installing Elasticsearch"
  wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-$ES_VERSION.zip -P ../
  unzip ../elasticsearch-$ES_VERSION.zip -d ../
  rm -rf ../elasticsearch-$ES_VERSION.zip
fi

# use custom config
cp elasticsearch/elasticsearch__dev.yml elasticsearch-$ES_VERSION/config/elasticsearch.yml
# install mapper-attachments
elasticsearch-$ES_VERSION/bin/plugin -install elasticsearch/elasticsearch-mapper-attachments/2.0.0

echo "Starting Elasticsearch"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "fbopen/elasticsearch-$ES_VERSION/bin/elasticsearch" in window 1
end tell
EOF

# init index with mappings and settings
curl -XPUT localhost:9200/fbopen0 --data-binary @elasticsearch/init.json

# API
echo "Creating api/config.js from sample."
cp api/config-sample_dev.js api/config.js

if command_exists node ; then
  echo
else
  echo "It looks like node.js is not installed. Please install it."
  exit 1
fi

npm install api/
sudo mkdir -p /var/log/fbopen/api.log

# Loaders

## bids.state.gov
npm install loaders/bids.state.gov/

## common
npm install loaders/common/

# problems:
cd loaders/bids.state.gov
FBOPEN_ROOT=$FBOPEN_ROOT FBOPEN_URI=localhost:9200 FBOPEN_INDEX=fbopen ./bids-nightly.sh
cd ../..

