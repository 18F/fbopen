# Using the grants.gov loader for FBOpen

## To install the loader

Install Elasticsearch. See that [README](../elasticsearch/README.md).

To run the grants loader, you'll need to install the Node.js dependencies and initialize some directories.

    $ npm install
    $ mkdir workfiles nightly-downloads tmp

## To load the data (run nightly)

The grants-nightly script defaults to yesterday's date, but it can also take a date as an argument.

    $ grants-nightly.sh [YYYYMMDD]
