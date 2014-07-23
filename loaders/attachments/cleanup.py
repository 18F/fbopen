import argparse
import os
import time
import shutil

if __name__ == '__main__':
    
    now = time.time()
    cur_dir = os.getcwd()
    
    for fil in os.listdir(cur_dir):
        if 'attach_' in fil:
            last_mod = os.stat(fil).st_mtime
            if (now-last_mod) > 345600:
                print("Older than 4 days -- removing %s" % fil )
                shutil.rmtree(fil)
                
    cache_dir = os.path.join(cur_dir, 'cache')
    for response in os.listdir(cache_dir):
        last_read = os.stat(os.path.join(cache_dir, response)).st_atime
        if (now-last_read) > 691200: #not accessed/read for 8 days
            print("Cached file has not been read for 8 days -- removing %s" % response)
            os.remove(os.path.join(cache_dir, response))
