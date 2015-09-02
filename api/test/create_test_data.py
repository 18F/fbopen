from elasticsearch import Elasticsearch
import json
import sys

try:
    FBOPEN_INDEX = sys.argv[1]
except:
    FBOPEN_INDEX = 'fbopen0'
    print("Warning: Using fbopen0 as default index since none provided")

try:
    SKIP_NUM = int(sys.argv[2])
except:
    SKIP_NUM = 10


test_data = []
es = Elasticsearch()
outfile = open('data/test_data.json', 'w')


for data_type in ('opp', 'opp_attachment'):
    #get opps 
    resp = es.search(index=FBOPEN_INDEX, doc_type=data_type, body={"query":{"match_all":{}}})
    num = 0 
    total = resp['hits']['total']

    while num < total :
        rec = es.search(index=FBOPEN_INDEX, doc_type=data_type, body={"size": 1, "from": num, "query":{"match_all":{}}})
        obj = rec['hits']['hits'][0]
        test_data.append(json.dumps(obj))
        num += SKIP_NUM
        
outfile.write('\n'.join(test_data))
