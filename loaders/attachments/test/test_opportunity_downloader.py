from contextlib import closing
from downloader import AttachmentDownloader

import unittest
import shelve
import os.path


class TestOpportunityDownloader(unittest.TestCase):

    def setUp(self):
        self.test_data = {
            'FA4626-14-R-0011': [
                {
                    'desc': 'Solicitation',
                    'filename': 'Solicitation.doc',
                    'url': 'https://www.fbo.gov/utils/view?id=46b7d20b80ba577b5e4dd10b1561b247'
                },
                {
                    'desc': 'Attch 1 Specifications',
                    'filename': 'Attch_1_Specifications.zip',
                    'url': 'https://www.fbo.gov/utils/view?id=f08375882eee4900f88a748fb8a941c7'
                },
                {
                    'desc': 'Attch 2 Material Submittal',
                    'filename': 'Attch_2_Submittal_Schedule.pdf',
                    'url': 'https://www.fbo.gov/utils/view?id=6b5544a2b5f254ae1dcfaea41f155960'
                }
            ], 
            'FA-FOO-BAR-BAZ': [
                {
                    'desc': 'Attch 3 Schedule of Drawings',
                    'filename': 'Attch_3_Schedule_of_Drawings.pdf',
                    'url': 'https://www.fbo.gov/utils/view?id=9e6640c9840978099dbe08351d0802bf'
                },
                {
                    'desc': 'Attch 4 Drawings',
                    'filename': 'Attch_4_Drawings.zip',
                    'url': 'https://www.fbo.gov/utils/view?id=58e041568e210a73884254db1c069855'
                },
                {
                    'desc': 'Attch 5 Wage Determination',
                    'filename': 'Attch_5_Wage_Determination.docx',
                    'url': 'https://www.fbo.gov/utils/view?id=7301f9274d34ebbf3ec3ff8df04968e4'
                },
                {
                    'desc': 'Attch 6 Base Entry Policy',
                    'filename': 'Attch_6_Base_Entry_Policy_Letter.pdf',
                    'url': 'https://www.fbo.gov/utils/view?id=b4e13ed9cdeb5eec3822465565810457'
                }
            ]
        }

        with closing(shelve.open('test_attach')) as db:
            for key in self.test_data:
                db[key] = self.test_data[key]

    def test_constructs_solnbr_download_directory_name(self):
        downloader = AttachmentDownloader(shelf='test_attach', dl_dir='py_test_dls')
        self.assertEqual(downloader.dir_for_solnbr('FA-FOO-BAR-BAZ'), 'py_test_dls/FA-FOO-BAR-BAZ')

    def test_creates_solnbr_download_directory(self):
        solnbr = 'FA-FOO-BAR-BAZ'
        downloader = AttachmentDownloader(shelf='test_attach', dl_dir='py_test_dls')
        dirpath = downloader.dir_for_solnbr(solnbr)

        downloader.create_dir_by_solnbr(solnbr)
        self.assertTrue(os.path.isdir(dirpath))

        # clean up
        os.rmdir(dirpath)
        self.assertFalse(os.path.isdir(dirpath))

    def test_downloader_does_not_care_if_directory_already_exists(self):
        solnbr = 'FA-FOO-BAR-BAZ'
        downloader = AttachmentDownloader(shelf='test_attach', dl_dir='py_test_dls')

        downloader.create_dir_by_solnbr(solnbr)
        downloader.create_dir_by_solnbr(solnbr)

        # clean up
        os.rmdir(downloader.dir_for_solnbr(solnbr))


if __name__ == '__main__':
    unittest.main()
