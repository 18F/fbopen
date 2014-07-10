import argparse
import os
import time
import shutil

if __name__ == '__main__':
    
    cur_dir = os.getcwd()
    
    for fil in os.listdir(cur_dir):
        if 'attach_' in fil:
            last_mod = os.stat(fil).st_mtime
            now = time.time()
            if (now-last_mod) > 345600:
                print("Older than 4 days -- removing %s" % fil )
                shutil.rmtree(fil)
