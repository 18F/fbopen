from base.importer import AttachmentsImporter
from contextlib import closing
from pyquery import PyQuery as pq
from urllib.parse import urljoin

import os
import os.path
import shelve


class LinkExtractor(AttachmentsImporter):
    '''
    This class traverses a directory of opportunity source HTML and extracts
    the attachment link URLs from each file.

    It also instantiates a shelf file with metadata on the attachments.
    '''

    module_name = 'fbo_attach.link_extractor'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fbo_base_url = 'https://www.fbo.gov'

    def run(self):
        self.log.info("Starting...")

        for filename in os.listdir(self.import_dir):
            # don't try to parse the shelf file!
            if not (filename == '{}.db'.format(self.shelf_file) or os.path.isdir(os.path.join(self.import_dir, filename))):
                with closing(shelve.open(os.path.join(self.import_dir, self.shelf_file))) as db:
                    self.extract_for_file(filename, db)

    def extract_for_file(self, filename, shelf):
        self.log.info("Found {}, parsing with pyquery...".format(filename))

        try:
            doc = pq(filename=os.path.join(self.import_dir, filename))
        except UnicodeDecodeError as e:
            self.log.exception(e)
            self.log.info("Continuing with next one...")
            return

        solnbr = self.get_opp_solnbr(doc)
        self.log.info("Pulled solicitation number (solnbr) {}".format(solnbr))

        num_links = self.get_links(doc, solnbr, shelf)
        self.log.info("Extracting and saving the attachment URLs and metadata. Found {}.".format(num_links))

    def get_opp_solnbr(self, doc):
        return doc('#dnf_class_values_procurement_notice__solicitation_number__widget').text().strip()

    def get_links(self, doc, solnbr, shelf):
        '''
        Parses the links from a doc. Returns the number of links found.
        '''
        shelf[solnbr] = {}
        links = self.collect_link_attrs(doc)
        shelf[solnbr] = {'attachments': links}

        return len(links)

    def collect_link_attrs(self, doc):
        '''
        This would be the method to override if scraping a different site.
        It must return a list of dicts containing keys 'filename', 'url', and 'description'. Ala:
        [
            { 'filename': 'example1.txt', 'url': 'http://example.com/example1.txt', 'description': 'Just some file' },
            { 'filename': 'example2.doc', 'url': 'http://example.com/example2.doc', 'description': 'Some word doc' },
        ]
        'filename' can be left as None, but it should be defined. This will help indicate that we have some
        more special processing to do, later down the line, than to just download a URL.
        '''

        attachments = []
        for div in doc('div.notice_attachment_ro'):
            a = {}
            d = pq(div)

            # only in cases where it's a file upload to FBO, then there's a '.file' div
            link_tag = d.find('div.file')('a') or d.find('div')('a')

            a = {
                'filename': link_tag.text().strip(),
                'url': urljoin(self.fbo_base_url, link_tag.attr('href')),
                'desc': d.find('span.label').closest('div').remove('span').text().strip(),
            }

            attachments.append(a)

        if not attachments:  # keep looking
            addl_info_link = doc('div#dnf_class_values_procurement_notice__additional_info_link__widget')('a')
            if addl_info_link:
                a = {
                    'filename': None,
                    'url': addl_info_link.attr('href'),
                    'desc': addl_info_link.text().strip(),
                }

                attachments.append(a)

        return attachments
