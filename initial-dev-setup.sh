# http://stackoverflow.com/a/3931779/94154
command_exists () {
    type "$1" &> /dev/null ;
}

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
if [ -d ../elasticsearch-1.2.1.zip ]; then
  echo "Elasticsearch is already installed."
else
  echo "Installing Elasticsearch"
  wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.2.1.zip -P ../
  unzip ../elasticsearch-1.2.1.zip -d ../
  rm -rf ../elasticsearch-1.2.1.zip 
fi


echo "Starting Elasticsearch"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "fbopen/elasticsearch-1.2.1/bin/elasticsearch" in window 1
end tell
EOF

# API
echo "Creating api/config.js from sample."
cp api/config-sample_dev.js api/config.js

if command_exists node ; then
  echo
else
  echo "It looks like node.js is not installed. Please install it."
fi

npm install api/
sudo mkdir -p /var/log/fbopen/api.log

# Loaders

## bids.state.gov
npm install loaders/bids.state.gov/

## common
npm install loaders/common/

# problems:
#FBOPEN_ROOT=`cd ..; pwd` loaders/bids.state.gov/bids-nightly.sh
cd loaders/bids.state.gov
FBOPEN_ROOT=~/fbopen/fbopen/ FBOPEN_URI=localhost:9200 FBOPEN_INDEX=fbopen ./bids-nightly.sh
cd ../..

