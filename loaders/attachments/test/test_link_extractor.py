import unittest
from link_extractor import LinkExtractor

class TestLinkExtractor(unittest.TestCase):

    maxDiff = None

    def setUp(self):
        pass

    def test_get_opp_solnbr(self):
        extractor = LinkExtractor('samples/source1.html')
        self.assertEqual(extractor.get_opp_solnbr(), 'FA4626-14-R-0011')

    def test_collect_link_attrs(self):
        extractor = LinkExtractor('samples/source1.html')
        self.assertEqual(extractor.collect_link_attrs(), [
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
            },
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
        ])


if __name__ == '__main__':
    unittest.main()
