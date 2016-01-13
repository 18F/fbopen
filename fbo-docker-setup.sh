# http://stackoverflow.com/a/3931779/94154
command_exists () {
    type "$1" &> /dev/null ;
}

# Build our Docker ES image.
docker build -t es-fbopen .

# Run Docker ES image.
# Run as Daemon, expose ports 9200:9300, sync /home/fbopen dir to /data
docker run -d -it -p 9200:9200 -p 9300:9300 -v /home/fbopen:/data esfbopen

# Forward Docker containter ES ports to Host localhost 9200-9300 range.
VBoxManage controlvm $(docker-machine active) natpf1 "name,tcp,127.0.0.1,9200,,9300"

# Do git stuff.
git submodule update --init --recursive
npm i -g mocha elasticdump json

# API
#echo "Creating api/config.js from sample."
#cp api/config-sample_dev.js api/config.js
mkdir -p log/
touch log/api.log

# init index with mappings and settings on ES Image.
curl -XPUT -v $(docker-machine ip $(docker-machine active)):9200/fbopen0 --data-binary elasticsearch/init.json

if command_exists node ; then
  echo
else
  echo "It looks like node.js is not installed. Please install it."
  exit 1
fi

cd api
npm install
cd ..

echo "Starting node API server"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "(cd $FBOPEN_ROOT/api && node app.js)" in window 1
end tell
EOF

cp sample-www/config-sample_dev.js sample-www/config.js

echo "Starting sample-www server"
osascript<<EOF
tell application "System Events"
  tell process "Terminal" to keystroke "t" using command down
end
tell application "Terminal"
  activate
  do script with command "(cd $FBOPEN_ROOT/sample-www && python -m SimpleHTTPServer)" in window 1
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