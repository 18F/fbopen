from datetime import datetime
from log import set_up_logger

import os
import scrapelib


class AttachmentsBase(object):

    def __init__(self, *args, **kwargs):
        self.log = set_up_logger(self.module_name)

        self.import_dir = kwargs.get('dir')

        if not self.import_dir:
            self.import_dir = self.create_import_dir()

        self.shelf_file = kwargs.get('shelf', 'attach_meta')

    def create_import_dir(self, dirname=None):
        """
        Create a timestampped directory to perform an import in.
        Returns a string containing the directory name.
        """

        if not dirname:
            dirname = self.current_import_dirname()

        self.create_dir(dirname)

        return dirname

    def create_dir(self, dirname=None):
        """
        Create a directory without failing if it already exists.
        """

        if dirname and not os.path.isdir(dirname):
            self.log.info("Checking directory... Creating {}".format(dirname))
            os.makedirs(dirname)
        else:
            self.log.info("Checking directory... {} exists.".format(dirname))

    def current_import_dirname(self):
        now_str = datetime.now().strftime('%Y%m%d_%H%M')
        return "{}_{}".format('attach', now_str)

    #def compose_module_name(self):
    #    if hasattr(self, 'base_module_name'):
    #        if hasattr(self, 'module_name'):
    #            return '.'.join([self.base_module_name, self.module_name])

    #        return self.base_module_name

    #    elif hasattr(self, 'module_name'):
    #        return self.module_name
