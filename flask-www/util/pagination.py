from math import floor


class Pagination(object):

    def __init__(self, page, per_page, total_count):
        self.page = page
        self.per_page = per_page
        self.total_count = total_count

    @property
    def pages(self):
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

    def iter_pages(self, left_edge=2, left_current=2,
                   right_current=5, right_edge=2):
        last = 0
        for num in range(1, self.pages + 1):
            if num <= left_edge or \
               (num > self.page - left_current - 1 and \
                num < self.page + right_current) or \
               num > self.pages - right_edge:
                if last + 1 != num:
                    yield None
                yield num
                last = num