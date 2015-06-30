import os
import json

debug_raw = os.getenv('DEBUG')

DEBUG = False
if debug_raw:
    if debug_raw.lower() == 'false' or debug_raw == '0':
        DEBUG = False
    else:
        DEBUG = True

FBOPEN_API_HOST, FBOPEN_API_PATH = os.getenv('FBOPEN_API_HOST'), os.getenv('FBOPEN_API_PATH')

# for sensitive vars provided by the user-provided service
# should just be API_KEY for now
CF_ENV = json.loads(os.getenv('VCAP_SERVICES'))
CREDS = CF_ENV['user-provided'][0]['credentials']
API_KEY = CREDS.get('API_KEY', 'DEMO_KEY')

#FBOPEN_API_PATH = '/v0/opps'  # for api.data.gov, this should include the account and api name, ala: /gsa/fbopen-dev/v0/opps

DATA_SOURCES = {
    '': 'All',
    'fbo.gov': 'FedBizOpps (fbo.gov)',
    'grants.gov': 'grants.gov',
    'dodsbir.net': 'DoD SBIR',
    'bids.state.gov': 'bids.state.gov',
}
