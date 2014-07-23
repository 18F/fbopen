import requests
import argparse
import sys

aparse = argparse.ArgumentParser(add_help=False)
aparse.add_argument('-u', '--uri', help='the fbopen elasticsearch index uri')

args = vars(aparse.parse_args())

resp = requests.get("{0}{1}".format(args.get('uri'), '/_cluster/health'))

data = resp.json()

#disabling warning for yellow because we're in staging
#if data['status'] == 'yellow': 
#    print("WARNING: CLUSTER HEALTH IS YELLOW")
#    sys.exit(1)

if data['status'] == 'red': 
    print("ERROR: CLUSTER IS DOWN") #email!
    sys.exit(1)

elif data['status'] == 'green': print("All is well. Cluster is green")


