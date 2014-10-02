# FBOpen Sample Query App

### Getting started

Fbopenapp was written in python3. Compatibility with Python 2.x has not been tested.

-Install the included requirements.txt
-Copy config.py:

    cp config.py.example config.py
    
-Add an api key from api.data.gov to config.py

### Run

From the flask-www directory:

    python fbopenapp.py

### Deploy

If the project is deployed using gunicorn, a wsgi.py is not needed--fbopenapp.py already provides a wsgi application object. Simply install gunicorn:

    pip install gunicorn

Then start the server with:

    gunicorn fbopenapp:app

### Tests

    python fbopenapp_tests.py


