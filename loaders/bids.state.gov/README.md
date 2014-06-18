# Importing bids.state.gov data into FBOpen using the loader

### Limitations
The loader currently loads in the notices but does not load in attachments, if they exist. It refreshes all notices each run.

### Prerequisites
* Node
* wget

### Install node modules
`npm install`

### Run the loader
`bids-nightly.sh`

That's it! You may need to create a workfiles directory for the first run. 
