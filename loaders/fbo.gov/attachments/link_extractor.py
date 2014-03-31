from base import AttachmentsBase
from contextlib import closing
from pyquery import PyQuery as pq
from urllib.parse import urljoin

import log
import os
import os.path
import shelve
import sys


class LinkExtractor(AttachmentsBase):
    '''
    This class traverses a directory of opportunity source HTML and extracts
    the attachment link URLs from each file.

    It also instantiates a shelf file with metadata on the attachments.
    '''

    module_name = 'fbo_attach_importer.link_extractor'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fbo_base_url = 'https://www.fbo.gov'

    def run(self):
        self.log.info("Starting...")

        for filename in os.listdir(self.import_dir):
            self.log.info("Found {}, parsing with pyquery...".format(filename))
            doc = pq(filename=os.path.join(self.import_dir, filename))

            solnbr = self.get_opp_solnbr(doc)
            self.log.info("Pulled solicitation number (solnbr) {}".format(solnbr))

            num_links = self.get_links(doc, solnbr)
            self.log.info("Extracting and saving the attachment URLs and metadata. Found {}.".format(num_links))

    def get_opp_solnbr(self, doc):
        return doc('#dnf_class_values_procurement_notice__solicitation_number__widget').text().strip()

    def get_links(self, doc, solnbr):
        '''
        Parses the links from a doc. Returns the number of links found.
        '''
        with closing(shelve.open(os.path.join(self.import_dir, self.shelf_file))) as db:
            db[solnbr] = {}
            links = self.collect_link_attrs(doc)
            db[solnbr] = {'attachments': links}

        return len(links)

    def collect_link_attrs(self, doc):
        '''
        This would be the method to override if scraping a different site.
        It must return a list of dicts containing keys 'filename', 'url', and 'description'. Ala:
        [
            { 'filename': 'example1.txt', 'url': 'http://example.com/example1.txt', 'description': 'Just some file' },
            { 'filename': 'example2.doc', 'url': 'http://example.com/example2.doc', 'description': 'Some word doc' },
        ]
        '''

        attachments = []
        for div in doc('div.notice_attachment_ro'):
            a = {}
            d = pq(div)

            # only in cases where it's a file upload to FBO, then there's a '.file' div
            link_tag = d.find('div.file')('a') or d.find('div')('a')

            a['filename'] = link_tag.text().strip()
            a['url'] = urljoin(self.fbo_base_url, link_tag.attr('href'))
            a['desc'] = d.find('span.label').closest('div').remove('span').text().strip()

            attachments.append(a)

        return attachments


if __name__ == '__main__':
    extractor = LinkExtractor(sys.argv[1])
    extractor.run()
