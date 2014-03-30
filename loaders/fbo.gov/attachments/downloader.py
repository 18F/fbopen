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

    def __init__(self, *args, **kwargs):
        self.shelf_file = kwargs.get('shelf', 'attach_meta')
        self.dl_dir = kwargs.get('dl_dir', 'py_dls')

        self.log = log.set_up_logger('fbo_attch_imp.downloader')

    def run(self):
        self.log.info("Starting...")

        self.log.info("Downloading...")
        self.download_files()

        self.log.info("Done.")

    def download_files(self):
        s = scrapelib.Scraper(requests_per_minute=120, follow_robots=False)

        with closing(shelve.open(self.shelf_file)) as db:
            for key in db:
                self.create_dir_by_solnbr(key)

                data = db[key]

                for attachment in data:
                    self.log.info("Downloading file for {}: {}".format(attachment['filename'], attachment['desc']))
                    filename, response = s.urlretrieve(attachment['url'], os.path.join(self.dir_for_solnbr(key), attachment['filename']))
                    attachment['local_file_path'] = filename

                db[key]['dl_complete'] = True
                db[key]['num_dl'] = len(attachment)

    def create_dir_by_solnbr(self, solnbr):
        sol_dir = self.dir_for_solnbr(solnbr)
        self.create_dir(soldir)

    def dir_for_solnbr(self, solnbr):
        return os.path.join(self.dl_dir, solnbr)


if __name__ == '__main__':
    #parser = argparse.ArgumentParser(description='Get the attachment URLs from a source URL (opportunity)')
    #parser.add_argument('-u', '--url', nargs=1, action= 'store', 
    #parser.parse_args()
    retriever = AttachmentDownloader()
    retriever.run()
