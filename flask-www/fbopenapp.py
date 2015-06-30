import logging
import requests
import os

from flask import Flask, request, redirect, render_template, url_for
from config import DATA_SOURCES, DEBUG, API_KEY, FBOPEN_API_HOST, FBOPEN_API_PATH
from pagination import Pagination
from urllib.parse import urljoin

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# Config variables are stored separately in config.py.
# See config.py.example.
app.config.from_object('config')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/search')
def searchpage():
    items_per_page = 10
    args = request.args.to_dict()
    page = int(args.pop('page', 1))
    advanced = any(args.values())

    start = (page - 1) * items_per_page
    args['start'] = start
    args['limit'] = items_per_page
    args['api_key'] = os.getenv('API_KEY')

    results = requests.get(_fbopen_uri(), params=args).json()
    count = results.get('numFound', 0)

    pagination = Pagination(page, items_per_page, count)

    return render_template('search.html', count=count, advanced=advanced, pagination=pagination, results=results, data_sources=DATA_SOURCES)


def join_if_list(value, separator):
    if isinstance(value, list):
        return separator.join(value)
    else:
        return value

def url_for_other_page(page):
    args = request.args.copy()
    args['page'] = page
    return url_for(request.endpoint, **args)

def _fbopen_uri():
    return urljoin(FBOPEN_API_HOST, FBOPEN_API_PATH)

def _get_results(raw):
    return raw.get('docs')


app.jinja_env.globals['url_for_other_page'] = url_for_other_page
app.add_template_filter(join_if_list)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')))
