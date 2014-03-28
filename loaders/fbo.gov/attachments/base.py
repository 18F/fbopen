from datetime import datetime

import os
import scrapelib


class AttachmentsBase(object):

    def create_import_dir(self):
        """
        Create a timestampped directory to perform an import in.
        Returns a string containing the directory name.
        """

        now_str = datetime.now().strftime('%Y%m%d_%H%M')
        dirname = "{}_{}".format('attach', now_str)
        self.create_dir(dirname)

        return dirname

    def create_dir(self, dirname):
        """
        Create a directory without failing if it already exists.
        """

        if not os.path.isdir(dirname):
            self.log.info("Checking directory... Creating {}".format(dirname))
            os.makedirs(dirname)
        else:
            self.log.info("Checking directory... {} exists.".format(dirname))
