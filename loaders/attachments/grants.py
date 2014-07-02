from grants.downloader import GrantsAttachmentDownloader
from grants.link_extractor import GrantsLinkExtractor
from grants.loader import GrantsAttachmentLoader
from grants.source_downloader import GrantsSourceDownloader
from base.runner import AttachmentsRunner

import argparse


class GrantsAttachmentsRunner(AttachmentsRunner):
    '''
    This class will run the various grants.gov attachment downloading scripts as a single step.
    It also knows what grants.gov-specific code to use. If writing importers for other datasources,
    these will need to be overridden.
    '''
    module_name = 'grants_attach'

    def __init__(self, *args, **kwargs):
        
        self.data_source = "grants.gov"

        super().__init__(*args, **kwargs)

        self.urls_file = kwargs.get('file')
        self.resume_url = kwargs.get('resume_url')

    def run(self, *args, **kwargs):
        self.log.info("Starting: grants.gov Attachments Importer")

        # source just reads from a text file. that should be the same.
        self.source()

        # extracting links may be different. we may need to do some click-through.
        # for grants.gov let's try Ghost.py
        self.extract()

        self.download()

        self.load()

        self.log.info("Done: grants.gov Attachments Importer")

    def source(self):
        GrantsSourceDownloader(log=self.log, file=self.urls_file, dir=self.import_dir, resume_url=self.resume_url).run()

    def extract(self):
        GrantsLinkExtractor(log=self.log, dir=self.import_dir).run()

    def download(self):
        GrantsAttachmentDownloader(log=self.log, dir=self.import_dir).run()

    def load(self):
        GrantsAttachmentLoader(log=self.log, dir=self.import_dir, data_source="grants.gov").run()

    # TODO: pull all into a base class so we can reuse for other datasets

    # TODO: keep this disabled until it's made a bit more safe
    # @arg('--last-n', default=5, help="The number of the most recent import dirs to leave in place")
    # def clean(self, *args, **kwargs):
    #     attach_dirs = [ x for x in os.listdir('.') if x.startswith('attach_') ]
    #     attach_dirs2 = sorted(attach_dirs, key=os.path.getmtime, reverse=True)

    #     # add a print and stdin confirmation here
    #     for dir in attach_dirs2[kwargs.get('last_n'):]:
    #         self.log.info("Removing directory {}".format(dir))
    #         shutil.rmtree(dir)


if __name__ == '__main__':
    init_parser = argparse.ArgumentParser(add_help=False)
    init_parser.add_argument('-d', '--dir', help='an existing import directory path to use-- good for resuming attachment retrieval')
    init_parser.add_argument('-r', '--resume-url', help='provide the downloader a URL to resume from')
    init_parser.add_argument('-f', '--file', help='the file containing the links (one per line) to source files to download')
    init_parser.add_argument('--log-to-stdout', action='store_true', help='send log output to stdout instead of a file')

    parser = argparse.ArgumentParser(description='Run the grants.gov attachment import commands.')

    subparsers = parser.add_subparsers(dest='command',  help='sub-command help')

    parser_run = subparsers.add_parser('run', parents=[init_parser], help='run all the commands')
    parser_source = subparsers.add_parser('source', parents=[init_parser], help='download the solicitations\' source')
    parser_extract = subparsers.add_parser('extract', parents=[init_parser], help='pull the links and metadata from the sources')
    parser_dl = subparsers.add_parser('download', parents=[init_parser], help='download the attachment links')
    parser_load = subparsers.add_parser('load', parents=[init_parser], help='load the attachments into Elasticsearch')

    args = vars(parser.parse_args())

    runner = GrantsAttachmentsRunner(file=args.get('file'), dir=args.get('dir'), resume_url=args.get('resume_url'), stdout=args.get('log_to_stdout'))
    getattr(runner, args.get('command'))()
