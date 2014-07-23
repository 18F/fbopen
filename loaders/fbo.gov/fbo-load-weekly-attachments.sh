#!/bin/bash
weekly_links_file="$FBOPEN_ROOT/loaders/fbo.gov/workfiles/listings-links.txt"

echo "Starting attachment scrape/load. See ~/log/fbo_attach.log for more info..."
cd $FBOPEN_ROOT/loaders/attachments
python fbo.py run --file $weekly_links_file --log-to-stdout


