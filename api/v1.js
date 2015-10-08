schema = {
  "title": "FBOpen API v1",
  "type": "object",
  "$schema": "http://json-schema.org/draft-04/hyper-schema",
  "additionalProperties": false,
  "properties": {
    "numFound": {
      "type": "integer",
      "description": "Total number of records found matching a search"
    },
    "start": {
      "type": "integer",
      "description": "The index of the record to start returning results at (zero-indexed)"
    },
    "maxScore": {
      "type": "integer",
      "description": "The top score given to any record matching the search"
    },
    "docs": {
      "type": "array",
      "description": "A paginated subset of records matching the search",
      "items": {
        "$ref": "#/definitions/doc"
      },
    }
  }, // end properties
  "definitions": {
    "doc": {
      "type": "object",
      "description": "A single record outlining an opportunity to do business with the federal government",
      "additionalProperties": false,
      "properties": {
        "required": [ "numFound", "start", "maxScore", "docs" ],
        "_type": {
          "type": { "enum": [ "opp", "opp_attachment" ] },
          "description": "The type of record in the FBOpen system"
        },
        "data_source": {
          "type": { "enum": ["FBO", "fbo.gov", "grants.gov", "dodsbir.net", "bids.state.gov"] },
          "description": "The source of the data",
        },
        "notice_type": {
          "type": "string",
          "description": "The notice type from the source system, e.g. COMBINE, MOD from fbo.gov"
        },
        "solnbr": {
          "type": "string",
          "description": "The solicitation number. Terminology comes from fbo.gov, but has been used to represent the unique IDs from all source systems."
        },
        "solnbr_ci": {
          "type": "string",
          "description": "Case-insensitive version to search against (Solr backend only-- deprecated)"
        },
        "id": {
          "type": "string",
          "description": "Unique ID in FBOpen. Combines `data_source` with `solnbr`."
        },
        "posted_dt": {
          "type": "string",
          "format": "date",
          "description": "The date the opportunity was published in the source system"
        },
        "agency": {
          "type": "string",
          "description": "The soliciting agency"
        },
        "office": {
          "type": "string",
          "description": "The soliciting office within the agency"
        },
        "location": {
          "type": "string",
          "description": "Content varies. May be a sub-office, may be an agency abbreviation, may be a physical location or building name."
        },
        "zipcode": {
          "type": "string",
          "description": "The ZIP or postal code."
        },
        "title": {
          "type": "string",
          "description": "Title of the opportunity."
        },
        "close_dt": {
          "type": "string",
          "format": "date",
          "description": "Date the opportunity closes."
        },
        "description": {
          "type": "string",
          "description": "The description of the opportunity."
        },
        "listing_url": {
          "type": "string",
          "description": "The description of the opportunity."
        },
        "_score": {
          "type": "number",
          "description": "The search score"
        },
        "highlights": {
          "type": "object",
          "description": "Object containing the fields matched, with search terms wrapped in <highlight></highlight> tags.",
          "additionalProperties": true
        },
        "ext": {
          "type": "object",
          "description": "Extended attributes, attributes unique to each data source that go beyond the core set of fields we have standardized",
          "additionalProperties": true
        }
      } // end properties
    } // end doc
  }, // end definitions
} // end schema

module.exports = schema;
