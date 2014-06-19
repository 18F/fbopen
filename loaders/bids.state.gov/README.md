# Importing bids.state.gov data into FBOpen using the loader

### Limitations
The loader currently loads in the notices but does not load in attachments, if they exist. It refreshes all notices each run.

### Prerequisites
* Node
* wget

We suggest using a tool like [autoenv](https://github.com/groovecoder/autoenv) to manage these variables.

### Install node modules
From the `loaders/bids.state.gov` directory:

```
$ npm install
$ (cd ../common/ && npm install)
```

### Environment

You'll need to set the `FBOPEN_ROOT` environment variable in order to run the script.

```
$ FBOPEN_ROOT=~/projects/fbopen
```

### Run the loader
```
$ bids-nightly.sh
```

That's it! You may need to create a workfiles directory for the first run. 
