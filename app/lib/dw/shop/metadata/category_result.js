// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "category_result",
    "label" : "category_result",
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
                "name" : "category",
                "extra_properties" : true,
                "properties" : {
                    "categories" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "categories",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "category"
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
                    },
                    "parent_category_id" : {
                        "type" : "string",
                        "label" : "parent_category_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "thumbnail" : {
                        "type" : "string",
                        "label" : "thumbnail",
                        "constraints" : {
                            "nullable" : true
                        }
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
