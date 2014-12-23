import urllib
import requests

from flask import Flask, request, redirect, render_template, url_for
from config import API_KEY, FBOPEN_HOST, FBOPEN_PATH, DATA_SOURCES
from pagination import Pagination

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
    args['api_key'] = API_KEY

    results = requests.get(_fbopen_uri(), params=args).json()
    count = results.get('numFound', 0)

    pagination = Pagination(page, items_per_page, count)

    return render_template('search.html', count=count, advanced=advanced, pagination=pagination, results=results, data_sources=DATA_SOURCES)



def url_for_other_page(page):
    args = request.args.copy()
    args['page'] = page
    return url_for(request.endpoint, **args)

def _fbopen_uri():
    return "{}{}".format(FBOPEN_HOST, FBOPEN_PATH)

def _get_results(raw):
    return raw.get('docs')


app.jinja_env.globals['url_for_other_page'] = url_for_other_page


if __name__ == '__main__':
    app.run()
