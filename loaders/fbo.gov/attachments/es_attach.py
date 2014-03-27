import os
import sys


# constants, configure to match your environment
HOST = 'http://localhost:9200'
INDEX = 'test'
TYPE = 'attachment'
TMP_FILE_NAME = 'tmp.json'

def main():

    if len(sys.argv) < 2:
        print 'No filename provided.\nUsage: "python es-attach.py filename".\nExiting...'
        exit()

    fname = sys.argv[1]

    createEncodedTempFile(fname)
    
    createIndexIfDoesntExist()

    postFileToTheIndex()

    os.remove(TMP_FILE_NAME)

def postFileToTheIndex():
    cmd = 'curl -X POST "{}/{}/{}" -d @'.format(HOST,INDEX,TYPE) + TMP_FILE_NAME
    print cmd
    os.system(cmd)
    

def createEncodedTempFile(fname):
    import json

    file64 = open(fname, "rb").read().encode("base64")

    print 'writing JSON with base64 encoded file to temp file {}'.format(TMP_FILE_NAME)

    f = open(TMP_FILE_NAME, 'w')
    data = { 'file': file64, 'title': fname }
    json.dump(data, f) # dump json to tmp file
    f.close()


def createIndexIfDoesntExist():
    import urllib2

    class HeadRequest(urllib2.Request):
        def get_method(self):
            return "HEAD"

    # check if type exists by sending HEAD request to index
    try:
        urllib2.urlopen(HeadRequest(HOST + '/' + INDEX + '/' + TYPE))
    except urllib2.HTTPError, e:
        if e.code == 404:
            print 'Index doesnt exist, creating...'

            os.system('curl -X PUT "{}/{}/{}/_mapping" -d'.format(HOST,INDEX,TYPE) + ''' '{
                  "attachment" : {
                    "properties" : {
                      "file" : {
                        "type" : "attachment",
                        "fields" : {
                          "title" : { "store" : "yes" },
                          "file" : { "term_vector":"with_positions_offsets", "store":"yes" }
                        }
                      }
                    }
                  }
                }' ''')
        else:
            print 'Failed to retrieve index with error code - %s.' % e.code

# kick off the main function when script loads
main()
