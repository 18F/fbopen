from downloader import AttachmentDownloader
from link_extractor import LinkExtractor
from loader import AttachmentLoader
from source_downloader import SourceDownloader
from base import AttachmentsBase
from log import set_up_logger

from argh import ArghParser, arg
import os
import sys


class FBOAttachmentsImporter(AttachmentsBase):
    '''
    This class will run the various FBO attachment downloading scripts as a single step.
    It also knows what FBO-specific code to use. If writing importers for other datasources,
    these will need to be overridden.
    '''
    module_name = 'fbo_attach_import'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        #self.urls = kwargs.get('url')
        #self.urls_file = kwargs.get('file')

    def __iter__(self):
        '''
        Returns the class's available commands for ArghParser
        '''
        for i in ['run', 'load']: # add more methods here later
            yield getattr(self, i)

    @arg('--file', dest='urls_file', required=True, help='The file containing the links (one per line) to source files to download')
    @arg('--dir', dest='import_dir')
    @arg('-S', dest='get_source', action='store_false', help='Skip source download step.')
    def run(self, urls_file=None, import_dir=None, get_source=True):
        if import_dir:
            self.import_dir = import_dir

        self.log.info("Starting: FBO Attachments Importer")

        # dl source
        if get_source:
            retriever = SourceDownloader(file=urls_file, dir=self.import_dir)
            retriever.run()

        # extract links
        extractor = LinkExtractor(dir=self.import_dir)
        extractor.run()

        # dl attachments
        self.load()

        # load
        
        self.log.info("Done: FBO Attachments Importer")

    @arg('--dir', dest='import_dir')
    def load(self, import_dir=None):
        if import_dir:
            self.import_dir = import_dir

        AttachmentLoader(dir=self.import_dir).run()

    # TODO: extract other bits into their own commands
    # TODO: add cleanup command
    # TODO: pull all into a base class so we can reuse for other datasets


parser = ArghParser()
parser.add_commands(FBOAttachmentsImporter())


if __name__ == '__main__':
    parser.dispatch()
    #importer = FBOAttachmentsImporter(file=sys.argv[1], dir=sys.argv[2])
    #importer.run()
