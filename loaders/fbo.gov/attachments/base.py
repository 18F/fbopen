from datetime import datetime

import os


class AttachmentsBase(object):

    def create_import_dir(self):
        """
        Create a timestampped directory to perform an import in.
        """

        now_str = datetime.now().strftime('%Y%m%d_%H%M')
        self.create_dir("{}_{}".format('import', now_str))

    def create_dir(self, dirname):
        """
        Create a directory without failing if it already exists.
        """

        if not os.path.isdir(sol_dir):
            self.log.info("Checking directory... Creating {}".format(solnbr))
            os.makedirs(sol_dir)
        else:
            self.log.info("Checking directory... {} exists.".format(solnbr))
