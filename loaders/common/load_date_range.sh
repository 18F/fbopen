#!/bin/bash

# this script can be used for FBO or Grants data, which both have attachment loaders-- for others it won't work
# it takes environment vars SOURCE minus the TLD extension (e.g. fbo, grants), START (yyyymmdd), END (yyyymmdd)
# example
# SOURCE=grants START=20140724 END=20140728 ./load_date_range.sh

for date in $(seq $START $END); do
    # the extra echoes are so we can log the multi-date run in another file (by redirecting the script)
    echo "Starting ${SOURCE} ${date}"
    echo "Starting ${date}" | tee -a ~/log/${SOURCE}.log
    cd ${FBOPEN_ROOT}/loaders/${SOURCE}.gov
    ./${SOURCE}-nightly.sh ${date} | tee -a ~/log/${SOURCE}.log
    cd ${FBOPEN_ROOT}/loaders/attachments
    echo "Starting attachments for ${SOURCE} ${date}"
    python ${SOURCE}.py run --file ../${SOURCE}.gov/workfiles/links.txt
    echo "Finished ${date}" | tee -a ~/log${SOURCE}.log
    echo "Finished ${SOURCE} ${date}"
done
