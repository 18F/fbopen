from base.loader import AttachmentLoader


class GrantsAttachmentLoader(AttachmentLoader):
    '''
    This class loads the attachment files, which have already
    been downloaded by downloader.py, into Elasticsearch.

    It requires a shelf file bearing attachment metadata.
    '''

    module_name = 'grants_attach_import.loader'


if __name__ == '__main__':
    loader = GrantsAttachmentLoader()
    loader.run()
