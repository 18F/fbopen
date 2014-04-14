from datetime import datetime
from log import set_up_logger
from base.util import create_dir

import os


class AttachmentsRunner(object):

    def __init__(self, *args, **kwargs):
        self.log = set_up_logger(self.module_name, stdout=kwargs.get('stdout'))

        self.import_dir = kwargs.get('dir')

        if not self.import_dir:
            self.import_dir = self.create_import_dir()
        else:
            self.log.debug('Using pre-existing import dir: {}'.format(self.import_dir))

    def create_import_dir(self, dirname=None):
        """
        Create a timestampped directory to perform an import in.
        Returns a string containing the directory name.
        """

        if not dirname:
            dirname = self.current_import_dirname()
            self.log.debug(dirname)

        self.create_dir(dirname=dirname)

        return dirname

    def create_dir(self, dirname=None):
        return create_dir(self.log, dirname)

    def current_import_dirname(self):
        now_str = datetime.now().strftime('%Y%m%d_%H%M')
        return os.path.abspath("{}_{}".format('attach', now_str))
