// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "promotion",
    "label" : "promotion",
    "extra_properties" : true,
    "properties" : {
        "callout_msg" : {
            "type" : "string",
            "label" : "callout_msg",
            "constraints" : {
                "nullable" : true
            },
            "localized" : true
        },
        "details" : {
            "type" : "string",
            "label" : "details",
            "constraints" : {
                "nullable" : true
            },
            "localized" : true
        },
        "discounted_products_link" : {
            "type" : "string",
            "label" : "discounted_products_link",
            "constraints" : {
                "nullable" : true
            }
        },
        "end_date" : {
            "type" : "string",
            "format" : "date_time",
            "label" : "end_date",
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
        "image" : {
            "type" : "string",
            "label" : "image",
            "constraints" : {
                "nullable" : true
            }
        },
        "name" : {
            "type" : "string",
            "label" : "name",
            "constraints" : {
                "nullable" : true
            },
            "localized" : true
        },
        "start_date" : {
            "type" : "string",
            "format" : "date_time",
            "label" : "start_date",
            "constraints" : {
                "nullable" : true
            }
        }
    }
};
