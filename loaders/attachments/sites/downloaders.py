def default(*args, **kwargs):
    scraper, url, directory = args
    filename, response = scraper.urlretrieve(url, dir=directory, verify=False)
    return filename

def dibbs_bsm_dla_mil(*args, **kwargs):
    scraper, url, directory = args
    solnbr = kwargs['solnbr']
    solnbr = solnbr.replace('-', '')
    url = 'https://dibbs2.bsm.dla.mil/Downloads/RFQ/{}/{}.PDF'.format(solnbr[-1], solnbr)
    filename, response = scraper.urlretrieve(url, dir=directory, verify=False)
    return filename

func_map = {
    'default': default,
    'www.dibbs.bsm.dla.mil': dibbs_bsm_dla_mil,
}
