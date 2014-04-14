from base.util import create_dir


class AttachmentsImporter(object):

    def __init__(self, *args, **kwargs):
        self.log = kwargs.get('log')
        self.import_dir = kwargs.get('dir')
        # self.file = kwargs.get('file')
        self.shelf_file = kwargs.get('shelf', 'attach_meta')

    def create_dir(self, dirname=None):
        return create_dir(self.log, dirname)
