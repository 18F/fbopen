import json
import os
from base.link_extractor import LinkExtractor


class GrantsLinkExtractor(LinkExtractor):
    module_name = 'grants_attach.link_extractor'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.base_url = 'http://www.grants.gov/grantsws/AttachmentDownload?attID={}'

    def extract_for_file(self, filename, shelf):
        self.log.info("Found {}, parsing the JSON...".format(filename))
        with open(os.path.join(self.import_dir, filename), 'r') as f:
            try:
                opp = json.load(f)
            except UnicodeDecodeError:
                f = open(os.path.join(self.import_dir, filename), encoding="latin-1")
                opp = json.load(f)
            except ValueError:
                self.log.error('Couldn\'t parse the JSON in {}'.format(filename))
                return
            except Exception as e:
                self.log.exception(e)
                return

            solnbr = self.get_opp_solnbr(opp)
            self.log.info('Pulled opp id ({}) number ({})'.format(opp['id'], solnbr))
            attachments = []
            for a in opp.get('synopsisAttachments', []):
                a_munged = {
                    'filename': a['fileName'],
                    'desc':     a['fileDescription'],
                    'url':      self.base_url.format(a['id']),
                }
                attachments.append(a_munged)
                self.log.info('Pulled attachment ID ({}) {}: {}'.format(
                    a['id'], a['fileName'], a['fileDescription']))

            shelf[solnbr] = {'attachments': attachments}

        self.log.info('finished extraction for {}'.format(filename))

    def get_opp_solnbr(self, opp):
        return opp['opportunityNumber']
