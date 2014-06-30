#################################################################################
#  OSX-only script to get a basic FBOpen installation working locally 
#  Usage:   
#    $ FBOPEN_ROOT=~/fbopen/fbopen/ ./initial-dev-setup.sh
#    
#################################################################################

# http://stackoverflow.com/a/3931779/94154
command_exists () {
    type "$1" &> /dev/null ;
}

ES_VERSION=1.2.1

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
if [ -d ../elasticsearch-$ES_VERSION ]; then
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
mkdir -p api/log/
touch api/log/api.log

if command_exists node ; then
  echo
else
  echo "It looks like node.js is not installed. Please install it."
  exit 1
fi

cd api
sudo npm -g bunyan
npm install
cd ..


echo "Starting node API server"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "(cd fbopen/fbopen/api && node app.js)" in window 1
end tell
EOF

echo "Starting sample-www server"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "(cd fbopen/fbopen/sample-www && python -m SimpleHTTPServer)" in window 1
end tell
EOF

# Loaders


## bids.state.gov
#npm install loaders/bids.state.gov/
cd loaders/bids.state.gov
npm install
(cd ../common/ && npm install)
./bids-nightly.sh
cd ../..

# opens a web browser
open http://localhost:8000

