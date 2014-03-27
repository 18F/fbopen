from contextlib import closing
from subprocess import call

import log
import os
import os.path
import shelve


class AttachmentLoader(object):

    def __init__(self, *args, **kwargs):
        self.shelf = kwargs.get('shelf', 'loader_queue')

        self.log = log.set_up_logger('loader')

    def run(self):
        self.log.info("Starting...")

        self.log.info("Loading...")
        self.load_attachments()

        self.log.info("Done.")

    def load_attachments(self):
        with closing(shelve.open(self.shelf)) as db:
            for key in db:
                attachments = db[key]
                for (i,a) in enumerate(attachments):
                    attach_id = self.get_attachment_id(key, i)

                    self.log.info("Loading attachment {}".format(attach_id))

                    script_output = call('../../common/load_attachment.sh', [
                        a['local_file_path'], 
                        attach_id,
                        key,
                    ])

                    self.log.info(script_output)

    def get_attachment_id(self, solnbr, i):
        return "{}__attach__{}".format(solnbr, i)


if __name__ == '__main__':
    loader = AttachmentLoader()
    loader.run()

