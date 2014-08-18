---
layout: main
published: true
---

### Guidelines for Contributing Data to FBOpen

FBOpen’s mission is to help small businesses search for opportunities to work with the U.S. government. Two important ways that we are accomplishing this is by offering a better search engine and aggregating data about opportunities in one place, so we welcome additional sources of data about opportunities. This document outlines guidelines for contributing data to FBOpen.

**Basic requirements:**

* The data should be opportunities to work with U.S. federal, state, or local government, or with an organization that is working with the government (for example, subcontracts).
* The data should be structured, machine readable data.
* You should ensure that your data can be shared with the public.
* FBOpen does not fulfill your FAR reporting requirements or system of record requirements, so the opportunity’s metadata must include the URL of a listing-of-record for the opportunity

**Required Core Metadata Fields**

The data should include the following core metadata fields, or you should provide documentation explaining which fields in your data map to these. All other data will be placed in a nested key specific to the data source.

* `title`: the opportunity’s title
* `listing_url`: as described above, the link to the listing-of-record for this opportunity
* `close_dt`: "2013-12-01T17:00:00Z", date/time when applications are due (month precedes day)
* `posted_dt`: "2013-11-06T00:00:00Z", date/time when this opportunity was made public (month precedes day), (optional if `open_dt` is present)
* `open_dt`: "2013-11-09T00:00:00Z", first date/time when applications may be submitted (month precedes day), (optional if `posted_dt` is present)
* `agency`: "General Services Administration"
* `office`: "Presidential Innovation Fellows", (optional)
* `location`: "1800 F Street, Washington, DC", (optional)
* `zipcode`: "20008", (optional)
* `summary`: "A short executive summary of the opportunity goes here.", (optional)
* `description`: "More details about the opportunity might be included here",

We also welcome suggestions of resources available on the web that we could scrape, but we need to access the resources without special registration or IP whitelisting.
