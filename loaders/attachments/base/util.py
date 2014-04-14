import os


def create_dir(log, dirname=None):
    """
    Create a directory without failing if it already exists.
    """

    if dirname and not os.path.isdir(dirname):
        log.info("Checking directory... Creating {}".format(dirname))
        os.makedirs(dirname)
    else:
        log.info("Checking directory... {} exists.".format(dirname))

    return dirname
