from base.loader import AttachmentLoader


class GrantsAttachmentLoader(AttachmentLoader):
    '''
    This class loads the attachment files, which have already
    been downloaded by downloader.py, into Elasticsearch.

    It requires a shelf file bearing attachment metadata.
    '''

    module_name = 'grants_attach.loader'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
