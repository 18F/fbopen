import urllib

from flask import Flask, request, redirect, render_template, url_for
from config import API_KEY
from pagination import Pagination
from fbopen import fbopen


app = Flask(__name__)

# Config variables are stored separately in config.py.
# See config.py.example.
app.config.from_object('config')

fbos = fbopen.FBOpen
fbos.init(API_KEY)

DATA_SOURCES = {
        '': 'All',
        'fbo.gov': 'FedBizOpps (fbo.gov)',
        'grants.gov': 'grants.gov',
        'dodsbir.net': 'DoD SBIR',
        'bids.state.gov': 'bids.state.gov',
}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/search')
def searchpage():
    items_per_page = 10
    args = request.args.to_dict()
    page = int(args.pop('page', 1))
    searchterm = args.pop('search', False)

    start = page * items_per_page
    args['start'] = start

    results = fbos.Opp.search(searchterm, args)
    raw = fbos.Opp.last_response

    try:
        docs = results.opps
    except:
        docs = False

    pagination = Pagination(page, items_per_page, results.numFound)

    return render_template('search.html', results=results, docs=docs, pagination=pagination, raw=raw, data_sources=DATA_SOURCES)


def url_for_other_page(page):
    args = request.args.copy()
    args['page'] = page
    return url_for(request.endpoint, **args)

app.jinja_env.globals['url_for_other_page'] = url_for_other_page


if __name__ == '__main__':
    app.run()
