from downloader import AttachmentDownloader
from link_extractor import LinkExtractor
from source_downloader import SourceDownloader
from base import AttachmentsBase
from log import set_up_logger

import os
import sys


class FBOAttachmentsImporter(AttachmentsBase):
    '''
    This class will run the various FBO attachment downloading scripts as a single step.
    It also knows what FBO-specific code to use. If writing importers for other datasources,
    these will need to be overridden.
    '''

    def __init__(self, *args, **kwargs):
        self.log = set_up_logger('fbo_attch_imp')

        self.urls = kwargs.get('url')
        self.urls_file = kwargs.get('file')
        self.dir = kwargs.get('dir')

    def run(self):
        self.log.info("Starting: FBO Attachments Importer")

        # source download
        retriever = SourceDownloader(file=self.urls_file, dir=self.dir)
        self.dir = self.dir || retriever.import_dir
        retriever.run()

        # link extraction
        # loop over files in dir (need to get it from previous script, or this one)
        for filename in os.listdir(self.dir):
            # TODO: Let's make the extractor work on a directory natively...
            # but let's not change two things at once.
            extractor = LinkExtractor(os.path.join(self.dir, filename))
            extractor.run()

        # attach dl
        AttachmentDownloader().run()
        # load:
        AttachmentLoader().run()
        
        self.log.info("Done: FBO Attachments Importer")


if __name__ == '__main__':
    importer = FBOAttachmentsImporter(file=sys.argv[1], dir=sys.argv[2])
    importer.run()
