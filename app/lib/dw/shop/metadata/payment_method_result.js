// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "payment_method_result",
    "label" : "payment_method_result",
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
                "name" : "payment_method",
                "extra_properties" : true,
                "properties" : {
                    "cards" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "cards",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "payment_method"
                        }
                    },
                    "card_type" : {
                        "type" : "string",
                        "label" : "card_type",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
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
                            "max_length" : 256,
                            "nullable" : false,
                            "required" : true
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
