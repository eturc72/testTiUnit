// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "site",
    "label" : "site",
    "properties" : {
        "currency" : {
            "type" : "string",
            "label" : "currency",
            "constraints" : {
                "nullable" : true
            }
        },
        "default_locale" : {
            "type" : "string",
            "label" : "default_locale",
            "constraints" : {
                "nullable" : true
            }
        },
        "http_hostname" : {
            "type" : "string",
            "label" : "http_hostname",
            "constraints" : {
                "nullable" : true
            }
        },
        "http_library_content_url" : {
            "type" : "string",
            "label" : "http_library_content_url",
            "constraints" : {
                "nullable" : true
            }
        },
        "https_hostname" : {
            "type" : "string",
            "label" : "https_hostname",
            "constraints" : {
                "nullable" : true
            }
        },
        "http_site_content_url" : {
            "type" : "string",
            "label" : "http_site_content_url",
            "constraints" : {
                "nullable" : true
            }
        },
        "https_library_content_url" : {
            "type" : "string",
            "label" : "https_library_content_url",
            "constraints" : {
                "nullable" : true
            }
        },
        "https_site_content_url" : {
            "type" : "string",
            "label" : "https_site_content_url",
            "constraints" : {
                "nullable" : true
            }
        },
        "id" : {
            "type" : "string",
            "label" : "id",
            "constraints" : {
                "nullable" : true
            }
        },
        "name" : {
            "type" : "string",
            "label" : "name",
            "constraints" : {
                "nullable" : true
            }
        },
        "status" : {
            "type" : "string",
            "format" : "enum",
            "label" : "status",
            "constraints" : {
                "enum" : ["online", "offline"],
                "nullable" : true
            }
        },
        "timezone" : {
            "type" : "string",
            "label" : "timezone",
            "constraints" : {
                "nullable" : true
            }
        },
        "timezone_offset" : {
            "type" : "integer",
            "label" : "timezone_offset",
            "constraints" : {
                "nullable" : true
            }
        }
    }
};
