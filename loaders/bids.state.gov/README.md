# Importing bids.state.gov data into FBOpen using the loader

### Limitations
The loader currently loads in the notices but does not load in attachments, if they exist. It refreshes all notices each run.

### Prerequisites
* Node
* wget

### Environment

You'll need to specify several environment variables in order to run either script. Here's a sample call:

```
FBOPEN_LOGDIR=~/projects/fbopen/log FBOPEN_ROOT=~/projects/fbopen FBOPEN_URI=http://localhost:9200 FBOPEN_INDEX=fbopen python fbo.py run --file links.txt
```

We suggest using a tool like [autoenv](https://github.com/groovecoder/autoenv) to manage these variables.

### Install node modules
`npm install`

### Run the loader
`bids-nightly.sh`

That's it! You may need to create a workfiles directory for the first run. 
