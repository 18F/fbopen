from dodsbir.scrape import Scraper
from sys import argv


s = Scraper()
s.stage_current_solicitation()
s.get_all_topics() #takes one second per topic (roughly 90 seconds total)
s.save_as_json(argv[-1]) #saves to alltopics.json by default
