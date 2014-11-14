The loaders, right now, consist of a few different sets of scripts. There are the data loaders, which exist for each data set in:

* `/loaders/fbo.gov`
* `/loaders/grants.gov`
* `/loaders/bids.state.gov`

And there are the attachment loaders, the runner scripts for which all reside in `/loaders/attachments`.

Data loaders must be run for a given dataset prior to running the attachment loader for that dataset.

See README docs in each of the aforementioned subfolders for specific directions.
