from base.source_downloader import SourceDownloader
from urllib.parse import urlparse, parse_qs

import os
import sys


class GrantsSourceDownloader(SourceDownloader):
    '''
    This class downloads the opportunity source HTML to support later steps
    of link extraction and download.

    Accepts either a single URL, or a file containing one URL per line.
    '''
    module_name = 'grants_attach_import.source_downloader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # this is where to pull the JSON for the opportunity,
        # which contains the attachment IDs we'll need to download later.
        self.base_url = 'http://www.grants.gov/grantsws/OppDetails?oppId='

    def grab_urls_from_file(self):
        if self.urls_file:
            self.log.info("Getting URLs from file {}".format(self.urls_file))
            try:
                with open(self.urls_file, 'r') as f:
                    self.urls = f.readlines()
            except IOError:
                self.log.fatal("Could not open URLs file at path given. Exiting.")
                sys.exit(1)

        else:
            self.log.fatal("URLs file was not provided.")
            sys.exit(1)

    def get_sources(self):

        at_resume_point = False
        skipped = 0
        chunk_count = 0

        # loop over things
        for url in self.urls:

            url = url.strip()

            if (not at_resume_point) and self.resume_url and self.resume_url.strip():
                if url != self.resume_url.strip():
                    skipped += 1
                    continue
                else:
                    at_resume_point = True
                    self.log.info("Resuming. Skipped {} URLs.".format(skipped))

            if not chunk_count % self.chunk_max:
                s = self._new_scrape_session()

            chunk_count += 1

            try:
                opp_id = parse_qs(urlparse(url).query)['oppId'][0]
                self.log.debug(opp_id)

                filename, response = s.urlretrieve(''.join([self.base_url, opp_id]), dir=self.import_dir)
                self.log.debug("{} stored at {}".format(url, os.path.basename(filename)))
            except KeyboardInterrupt:
                self._log_resume_info(url)
            except SystemExit:
                self._log_resume_info(url)
            except:
                self.log.exception("Source couldn't be retrieved for {}".format(url))
                continue

    def _log_resume_info(self, url):
        self.log.info("Resume download by adding --resume (-r) flag with last URL logged")


if __name__ == '__main__':
    retriever = GrantsSourceDownloader(file=sys.argv[1], dir=sys.argv[2])
    retriever.run()
