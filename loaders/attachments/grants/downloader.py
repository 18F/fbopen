from base import AttachmentsBase
from contextlib import closing
from urllib.parse import urlparse
from sites import downloaders

import os
import os.path
import scrapelib
import shelve


class GrantsAttachmentDownloader(AttachmentsBase):
    '''
    This class downloads the attachment files. Requires a shelf file populated
    with URLs from link_extractor.py.
    '''

    module_name = 'grants_attach_import.downloader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.req_per_min = 0  # 0 for unlimited

    def run(self):
        self.log.info("Starting...")

        self.log.info("Downloading...")
        self.download_files()

        self.log.info("Done.")

    def download_files(self):
        s = scrapelib.Scraper(requests_per_minute=self.req_per_min, follow_robots=False, retry_attempts=2)

        with closing(shelve.open(os.path.join(self.import_dir, self.shelf_file))) as db:
            for key in db.keys():
                dir_for_solnbr = self.create_dir_by_solnbr(key)

                attachments = db[key]['attachments']

                for (i, a) in enumerate(attachments):
                    self.log.info("Downloading file ({}: {}) from {}".format(a['filename'], a['desc'], a['url']))

                    # parse URL into components
                    u = urlparse(a['url'])

                    # match main portion to dict of special cases, get function to use
                    downloader_func = downloaders.func_map.get(u.netloc, downloaders.default)

                    try:
                        local_file_path = downloader_func(s, a['url'], dir_for_solnbr, solnbr=key)
                        a.update({'local_file_path': local_file_path})
                    except:
                        self.log.exception("Attachment couldn't be retrieved for unknown reasons. URL: {} Continuing.".format(a['url']))
                        a.update({'exception': 1})
                        continue
                    finally:
                        attachments[i] = a

                meta = {'dl_complete': True, 'num_dl': len(attachments)}
                db[key] = {'attachments': attachments, 'meta': meta}

    def create_dir_by_solnbr(self, solnbr):
        return self.create_dir(self.dir_for_solnbr(solnbr))

    def dir_for_solnbr(self, solnbr):
        return os.path.join(self.import_dir, solnbr)


if __name__ == '__main__':
    retriever = GrantsAttachmentDownloader()
    retriever.run()
