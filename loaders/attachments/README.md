## Python Environment Setup

These attachment loaders are written in Python. To follow these directions, you'll
need Python >= 3.2 and pip. You'll also need a few requirements for lxml
(Ubuntu/Debian package names below):

* python3-dev
* libxslt-dev
* libxml2-dev

I'll leave getting all of those as an exercise for the user.

If you need to set up virtualenv and virtualenvwrapper, try this:

```
sudo pip install virtualenv
```

Now follow the instructions here to set up and install virtualenvwrapper: http://virtualenvwrapper.readthedocs.org/en/latest/index.html

We're ready to set up FBOpen's attachment loader, now.

```
mkvirtualenv -p /usr/bin/python3 fbopen
pip install -r requirements.txt
```

## Usage

Each datasource has its own runner script, so in `loaders/attachments`, as of this writing, you'll find:

* `fbo.py`
* `grants.py`

Each script has several subcommands, and one of the subcommands, `run`, will run everything in order.


### Help System

There is a rudimentary help system available. Usage instructions:

```
python fbo.py -h
```

Subcommand help:

```
python fbo.py <subcommand> -h
```

### Environment

You'll need to specify several environment variables in order to run either script. Here's a sample call:

```
FBOPEN_LOGDIR=~/projects/fbopen/log FBOPEN_ROOT=~/projects/fbopen FBOPEN_URI=http://localhost:9200 FBOPEN_INDEX=fbopen python fbo.py run --file links.txt
```

I'd suggest using a tool like [autoenv](https://github.com/groovecoder/autoenv) to manage these variables.

### Resuming

By default, the runner will create a new directory (named like `attach_YYYYMMDD_HHMM`) to perform each load in. That folder contains metadata in a Python "Shelve"
to track the status of the load. If you wish to resume a load at any point, simply specify the --dir argument, with the directory of the load you'd like to resume.

