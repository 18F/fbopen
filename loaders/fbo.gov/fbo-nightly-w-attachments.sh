#!/bin/bash
set -e
set -x

# this script will make cron jobs and other manual runs a lot easier

./fbo-nightly.sh $1
cd ../attachments
python fbo.py run --file ../fbo.gov/workfiles/links.txt
