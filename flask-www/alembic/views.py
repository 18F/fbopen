from alembic import app
from flask import request, redirect, render_template
from alembic.forms import SearchForm, AdvancedSearchForm
from alembic import testdata
from alembicconfig import API_KEY
from util.pagination import Pagination

from fbopen import fbopen

def search(searchterm, advanced={}):
    fbos = fbopen.FBOpen

    fbos.init('vVpCVrgCp2RqpROCTBRPgBHNANtius9f8Y1G7k2O')
    results = fbos.Opp.search(searchterm, advanced)
    return results

@app.route('/')
def index():
    form = AdvancedSearchForm(csrf_enabled=False)
    return render_template('index.html', form = form)

@app.route('/search/', defaults={'page': 1}, methods = ['GET', 'POST'])
@app.route('/search/page/<int:page>')
def searchpage(page):
    items_per_page = 10
    form = AdvancedSearchForm(csrf_enabled=False)
    if form.validate_on_submit():
        searchterm = form.search.data
        #pull all non-blank optional fields to pass in to search
        advanced = {field:value for field, value in form.data.items() if value and field is not 'search'}

        results = search(searchterm, advanced)

        try:
            docs = results.opps
        except:
            docs = False

        if docs:
            count = len(docs)
            pagination = Pagination(page, items_per_page, count)

    else:
        searchterm = False
        results = False
        docs = False
        pagination = False
    return render_template(
        'search.html', form = form, searchterm = searchterm,
        results = results, docs = docs, pagination = pagination)