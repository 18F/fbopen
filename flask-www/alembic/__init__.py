import os
from flask import Flask

app = Flask(__name__)
#to update the default config, edit alembicconfig.py
app.config.from_object('alembicconfig')

#override config by pointing ALEMBIC_SETTINGS at your new config file.
app.config.from_envvar('ALEMBIC_SETTINGS', silent=True)

from alembic import views
