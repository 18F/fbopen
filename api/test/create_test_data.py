from elasticsearch import Elasticsearch
import json

try:
    fbopen_index = sys.argv[1]
except:
    fbopen_index = 'fbopen0'
    print("Warning: Using fbopen0 as default index since none provided")


test_data = []
es = Elasticsearch()
outfile = open('data/test_data.json', 'w')


for data_type in ('opp', 'opp_attachment'):
    #get opps 
    resp = es.search(index=fbopen_index, doc_type=data_type, body={"query":{"match_all":{}}})
    num = 0 
    total = resp['hits']['total']

    while num < total :
        rec = es.search(index=fbopen_index, doc_type=data_type, body={"size": 1, "from": num, "query":{"match_all":{}}})
        obj = rec['hits']['hits'][0]
        test_data.append(json.dumps(obj))
        num += 10
        
outfile.write('[' + '\n,'.join(test_data)  + ']')

