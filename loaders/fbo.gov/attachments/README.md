## Python Environment Setup

This attachment loader is written in Python. To follow these directions, you'll
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

TODO
