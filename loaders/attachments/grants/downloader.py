from base.downloader import AttachmentsDownloader


class GrantsAttachmentDownloader(AttachmentsImporter):
    '''
    This class downloads the attachment files. Requires a shelf file populated
    with URLs from link_extractor.py.
    '''

    module_name = 'grants_attach.downloader'
