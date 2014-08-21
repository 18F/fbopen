from math import floor


class Pagination(object):

    def __init__(self, page, per_page, total_count):
        self.page = page
        self.per_page = per_page
        self.total_count = total_count

    @property
    def pages(self):
        if self.total_count < self.per_page:
            return 1
        else:
            return int(floor(self.total_count / float(self.per_page)))

    @classmethod
    def offset(self, page, per_page):
        return ((page - 1) * per_page)

    @property
    def record_range(self):
        record_min = ((self.page - 1) * self.per_page) + 1
        record_max = self.page * self.per_page
        if record_max > self.total_count:
            record_max = self.total_count
        return '{} to {}'.format(record_min, record_max)

    @property
    def has_prev(self):
        return self.page > 1

    @property
    def prev(self):
        return self.page - 1

    @property
    def next(self):
        return self.page + 1

    @property
    def has_next(self):
        return self.page < self.pages

    def pagerange(self, leftside=2, rightside=2):
        if self.page == 1:
            left = 1
        elif self.page - leftside > 1:
            left = self.page - leftside
        else:
            left = 2
        if self.page == self.pages:
            right = self.pages
        elif self.page + rightside < self.pages -1:
            right = self.page + rightside
        else:
            right = self.pages -1

        return [page for page in range(left,right+1)]