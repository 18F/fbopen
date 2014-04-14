from base.importer import AttachmentsImporter


class GrantsAttachmentsImporter(AttachmentsImporter):

    module_name = 'grants_attach'

    def __init__(self, *args, **kwargs):
        self.data_source = 'grants'  # this must be defined in the sub classes
        super().__init__(*args, **kwargs)
