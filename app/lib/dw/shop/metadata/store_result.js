// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "store_result",
    "label" : "store_result",
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
                "name" : "store",
                "extra_properties" : true,
                "properties" : {
                    "address1" : {
                        "type" : "string",
                        "label" : "address1",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "address2" : {
                        "type" : "string",
                        "label" : "address2",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "city" : {
                        "type" : "string",
                        "label" : "city",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "country_code" : {
                        "type" : "string",
                        "label" : "country_code",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "distance" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "distance",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "distance_unit" : {
                        "type" : "string",
                        "label" : "distance_unit",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "email" : {
                        "type" : "string",
                        "label" : "email",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "fax" : {
                        "type" : "string",
                        "label" : "fax",
                        "constraints" : {
                            "nullable" : true
                        }
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
                    "image" : {
                        "type" : "string",
                        "label" : "image",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "inventory_id" : {
                        "type" : "string",
                        "label" : "inventory_id",
                        "constraints" : {
                            "max_length" : 256,
                            "nullable" : true
                        }
                    },
                    "latitude" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "latitude",
                        "constraints" : {
                            "min_number_value" : -90.0,
                            "max_number_value" : 90.0,
                            "nullable" : true
                        }
                    },
                    "longitude" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "longitude",
                        "constraints" : {
                            "min_number_value" : -180.0,
                            "max_number_value" : 180.0,
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
                    "phone" : {
                        "type" : "string",
                        "label" : "phone",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "postal_code" : {
                        "type" : "string",
                        "label" : "postal_code",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "state_code" : {
                        "type" : "string",
                        "label" : "state_code",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "store_events" : {
                        "type" : "string",
                        "label" : "store_events",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "store_hours" : {
                        "type" : "string",
                        "label" : "store_hours",
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
