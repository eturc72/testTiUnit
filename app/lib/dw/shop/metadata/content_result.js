// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "content_result",
    "label" : "content_result",
    "properties" : {
        "count" : {
            "type" : "integer",
            "label" : "count",
            "constraints" : {
                "nullable" : true
            }
        },
        "data" : {
            "type" : "array",
            "format" : "list",
            "label" : "data",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "content",
                "extra_properties" : true,
                "properties" : {
                    "description" : {
                        "type" : "string",
                        "label" : "description",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "id" : {
                        "type" : "string",
                        "label" : "id",
                        "constraints" : {
                            "min_length" : 1,
                            "max_length" : 256,
                            "nullable" : false,
                            "required" : true
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
                    "page_description" : {
                        "type" : "string",
                        "label" : "page_description",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "page_keywords" : {
                        "type" : "string",
                        "label" : "page_keywords",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "page_title" : {
                        "type" : "string",
                        "label" : "page_title",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    }
                }
            }
        },
        "total" : {
            "type" : "integer",
            "label" : "total",
            "constraints" : {
                "nullable" : true
            }
        }
    }
};
