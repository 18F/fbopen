from contextlib import closing
from pyquery import PyQuery as pq
from urllib.parse import urljoin

import log
import os
import os.path
import shelve
import sys


class LinkExtractor(object):
    '''
    This class traverses a directory of opportunity source HTML and extracts
    the attachment link URLs from each file.

    It also instantiates a shelf file with metadata on the attachments.
    '''

    def __init__(self, filepath, *args, **kwargs):
        self.filepath = filepath
        self.shelf_file = kwargs.get('shelf', 'attach_meta')

        self.doc = pq(filename=self.filepath)
        self.log = log.set_up_logger('link_extractor')
        self.fbo_base_url = 'https://www.fbo.gov'

    def run(self):
        self.log.info("Starting...")

        self.log.info("Getting solicitation number (solnbr)")
        self.solnbr = self.get_opp_solnbr()

        self.log.info("Extracting and saving the attachment URLs and metadata")
        self.get_links()

    def get_opp_solnbr(self):
        return self.doc('#dnf_class_values_procurement_notice__solicitation_number__widget').text().strip()

    def get_links(self):
        # set up shelf for resumability
        with closing(shelve.open(self.shelf_file)) as db:

            db[self.solnbr] = self.collect_link_attrs()

    def collect_link_attrs(self):
        '''
        This would be the method to override if scraping a different site.
        It must return a list of dicts containing keys 'filename', 'url', and 'description'. Ala:
        [
            { 'filename': 'example1.txt', 'url': 'http://example.com/example1.txt', 'description': 'Just some file' },
            { 'filename': 'example2.doc', 'url': 'http://example.com/example2.doc', 'description': 'Some word doc' },
        ]
        '''

        attachments = []
        for div in self.doc('div.notice_attachment_ro'):
            a = {}
            d = pq(div)
            link_tag = d.find('div.file')('a')

            a['filename'] = link_tag.text().strip()
            a['url'] = urljoin(self.fbo_base_url, link_tag.attr('href'))
            a['desc'] = d.find('span.label').closest('div').remove('span').text().strip()

            attachments.append(a)

        return attachments


if __name__ == '__main__':
    #parser = argparse.ArgumentParser(description='Get the attachment URLs from a source URL (opportunity)')
    #parser.add_argument('-u', '--url', nargs=1, action= 'store', 
    #parser.parse_args()
    retriever = LinkExtractor(sys.argv[1])
    retriever.run()
