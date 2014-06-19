from base.importer import AttachmentsImporter
from contextlib import closing
from subprocess import call

import os
import os.path
import requests
import shelve


class AttachmentLoader(AttachmentsImporter):
    '''
    This class loads the attachment files, which have already
    been downloaded by downloader.py, into Elasticsearch.

    It requires a shelf file bearing attachment metadata.
    '''

    module_name = 'fbo_attach.loader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fbopen_uri = os.getenv('FBOPEN_URI')
        self.fbopen_index = os.getenv('FBOPEN_INDEX')
        self.fbopen_root = os.getenv('FBOPEN_ROOT')
        self.data_source = kwargs['data_source']

    def run(self):
        self.log.info("Starting...")

        self.log.info("Getting pre-load count of attachments:")
        pre_count = self.get_count()

        self.log.info("Loading...")
        load_count = self.load_attachments()

        self.log.info("Getting post-load count of attachments:")
        post_count = self.get_count()

        if post_count < pre_count + load_count:
            msg = "Not all attachments were loaded, as post_count differed from pre_count + load_count by {}"
            self.log.warn(msg.format(abs((pre_count + load_count) - post_count)))

        self.log.info("Done.")

    def load_attachments(self):
        with closing(shelve.open(os.path.join(self.import_dir, self.shelf_file))) as db:
            n = 0
            for key in db:
                self.log.info("Pulled solnbr {}".format(key))
                self.log.info(self.__dict__)
                record = db[key]
                for (i, a) in enumerate(record['attachments']):

                    # skip the ones that weren't successful downloads
                    if (not a.get('local_file_path')) or a.get('exception'):
                        continue

                    n += 1
                    attach_id = self.get_attachment_id(key, i)

                    self.log.info("Loading attachment {} with data: {}".format(attach_id, a))

                    script_output = call([
                        os.path.join(self.fbopen_root, 'loaders/common/load_attachment.sh'),
                        a['local_file_path'],
                        attach_id,
                        key,
                    ])

                    self.log.info(script_output)

            self.log.info('Attempted to load {} attachments.'.format(n))
            return n

    def get_count(self):
        r = requests.get('/'.join([self.fbopen_uri, self.fbopen_index, 'opp_attachment', '_count']))
        count = r.json()['count']
        self.log.info(count)
        return count

    def get_attachment_id(self, solnbr, i):
        return "{}:{}__{}".format(self.data_source, solnbr, i)
