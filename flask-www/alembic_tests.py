import os
import alembic
from pagination import Pagination
import unittest
import tempfile

class AlembicTestCase(unittest.TestCase):

    def setUp(self):
        alembic.app.config['TESTING'] = True
        self.app = alembic.app.test_client()

    def test_noresultsdisplay(self):
        # If there are no results, are we telling the user?
        page = self.app.get('/search?search="I+am+by+birth+a+Genevese"')
        assert 'No Results Found' in str(page.data)
        assert '<div class="result-item" data-solr-id="' not in str(page.data)
        # if this search ever returns a result, the responsible KO deserves
        # the highest of fives.

    def test_resultsdisplay(self):
        # Are we displaying results for queries that return them?
        page = self.app.get('/search?search=test')
        pdata = str(page.data)
        assert 'Search results' in pdata
        assert 'No Results Found' not in pdata
        assert '<div class="result-item" data-solr-id="' in pdata

    def test_rememberoptions(self):
        # Is the form retaining options from the current search?
        page = self.app.get('/search?search=test&show_closed=on')
        pdata = str(page.data)
        assert 'type="search" class="form-control" value="test"' in pdata
        assert 'name="show_closed" type="checkbox" checked' in pdata
        assert 'name="show_noncompeted" type="checkbox" checked' not in pdata

    def test_showadvanced(self):
        # Is the advanced search expanded if advanced options
        # are selected on load?
        page = self.app.get('/search?search=test&show_closed=on')
        pdata = str(page.data)
        assert 'id="form-advanced-options" class="in"' in pdata

    def test_hideadvanced(self):
        # Is advanced search collapsed if advanced options are NOT
        # selected on load?
        page = self.app.get('/search?search=test')
        pdata = str(page.data)
        assert 'id="form-advanced-options" class="collapse"' in pdata

    def test_pagecount(self):
        # Is pagination returning the correct number of pages?
        test_counts = [(42, 4), (1, 1), (100, 10)]
        for tc in test_counts:
            pagination = Pagination(1,10,tc[0])
            assert pagination.pages == tc[1]

    def test_pagerange(self):
        # Is Pagination returning the correct page range?
        pass
        

if __name__ == '__main__':
    unittest.main()