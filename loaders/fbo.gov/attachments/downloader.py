from base import AttachmentsBase
from contextlib import closing

import log
import os
import os.path
import scrapelib
import shelve


class AttachmentDownloader(AttachmentsBase):
    '''
    This class downloads the attachment files. Requires a shelf file populated
    with URLs from link_extractor.py.
    '''

    module_name = 'fbo_attach_import.downloader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def run(self):
        self.log.info("Starting...")

        self.log.info("Downloading...")
        self.download_files()

        self.log.info("Done.")

    def download_files(self):
        s = scrapelib.Scraper(requests_per_minute=120, follow_robots=False)

        with closing(shelve.open(os.path.join(self.import_dir, self.shelf_file))) as db:
            for key in db.keys():
                self.create_dir_by_solnbr(key)

                attachments = db[key]['attachments']

                for (i,attachment) in enumerate(attachments):
                    self.log.info("Downloading file ({}: {}) from {}".format(attachment['filename'], attachment['desc'], attachment['url']))
                    try:
                        filename, response = s.urlretrieve(
                            attachment['url'], 
                            filename=os.path.basename(attachment['filename']),
                            dir=self.dir_for_solnbr(key)
                        )
                        attachment.update({'local_file_path': filename})
                        attachments[i] = attachment
                    except:
                        self.log.exception("Attachment couldn't be retrieved for unknown reasons. URL: {} Continuing.".format(attachment['url']))
                        continue

                meta = {'dl_complete': True, 'num_dl': len(attachments)}
                db[key] = {'attachments': attachments, 'meta': meta}

    def create_dir_by_solnbr(self, solnbr):
        sol_dir = self.dir_for_solnbr(solnbr)
        self.create_dir(sol_dir)

    def dir_for_solnbr(self, solnbr):
        return os.path.join(self.import_dir, solnbr)


if __name__ == '__main__':
    retriever = AttachmentDownloader()
    retriever.run()
