# FBOpen Sample Query App

### Getting started

Alembic was written in python3. Compatibility with Python 2.x has not been tested.

-Install the included requirements.txt
-Copy config.py:

    cp config.py.example config.py
    
-Add an api key from api.data.gov to config.py

### Run

From the flask-www directory:

    python alembic.py

### Deploy

If the project is deployed using gunicorn, a wsgi.py is not needed--alembic.py already provides a wsgi application object. Simply install gunicorn:

    pip install gunicorn

Then start the server with:

    gunicorn alembic:app

### Tests

    python alembic_tests.py

### The Name

An alembic is a two-part chemical still. Or, put another way, it's an apparatus that uses flasks to distill liquids, just as we're using Flask and elasticsearch to distill contract opportunities. More info: http://en.wikipedia.org/wiki/Alembic

