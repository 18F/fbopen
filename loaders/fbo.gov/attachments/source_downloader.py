from base import AttachmentsBase 

import log
import os
import scrapelib
import sys


class SourceDownloader(AttachmentsBase):
    '''
    This class downloads the opportunity source HTML to support later steps
    of link extraction and download.

    Accepts either a single URL, or a file containing one URL per line.
    '''
    module_name = 'fbo_attach_import.source_downloader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # TODO: note that until proper args are put in place,
        # only passing in a file will work (see if __name___... part)
        self.urls = kwargs.get('url')
        self.urls_file = kwargs.get('file')


    def run(self):
        self.log.info("Starting: Source Downloader")

        self.grab_urls_from_file()

        self.get_sources()

    def grab_urls_from_file(self):
        if self.urls_file:
            self.log.info("Getting URLs from file {}".format(self.urls_file))
            try:
                with open(self.urls_file, 'r') as f:
                    self.urls = f.readlines()
            except IOError:
                self.log.error("Could not open URLs file at path given. Exiting.")
                exit()

        else:
            self.log.fatal("URLs file was not provided.")
       
    def get_sources(self):

        s = scrapelib.Scraper(requests_per_minute=120, follow_robots=True)

        for url in self.urls:
            try:
                filename, response = s.urlretrieve(url, dir=self.import_dir)
                self.log.debug("filename: {}, response: {}".format(filename, response))
            except:
                self.log.exception("Source couldn't be retrieved for {}".format(url))
                continue
        

if __name__ == '__main__':
    retriever = SourceDownloader(file=sys.argv[1], dir=sys.argv[2])
    retriever.run()
