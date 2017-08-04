// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "customer_address_result",
    "label" : "customer_address_result",
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
                "name" : "customer_address",
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
                    "address_id" : {
                        "type" : "string",
                        "label" : "address_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "address_name" : {
                        "type" : "string",
                        "label" : "address_name",
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
                    "company_name" : {
                        "type" : "string",
                        "label" : "company_name",
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
                    "first_name" : {
                        "type" : "string",
                        "label" : "first_name",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "full_name" : {
                        "type" : "string",
                        "label" : "full_name",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "job_title" : {
                        "type" : "string",
                        "label" : "job_title",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "last_name" : {
                        "type" : "string",
                        "label" : "last_name",
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
                    "post_box" : {
                        "type" : "string",
                        "label" : "post_box",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "salutation" : {
                        "type" : "string",
                        "label" : "salutation",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "second_name" : {
                        "type" : "string",
                        "label" : "second_name",
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
                    "suffix" : {
                        "type" : "string",
                        "label" : "suffix",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "suite" : {
                        "type" : "string",
                        "label" : "suite",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "title" : {
                        "type" : "string",
                        "label" : "title",
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
