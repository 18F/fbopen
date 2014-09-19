#!/bin/bash

set -e
set -x

# this script will make cron jobs and other manual runs a lot easier
./grants-nightly.sh $1
cd ../attachments
python grants.py run --file ../grants.gov/workfiles/links.txt
