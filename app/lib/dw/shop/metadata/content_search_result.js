// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "content_search_result",
    "label" : "content_search_result",
    "properties" : {
        "count" : {
            "type" : "integer",
            "label" : "count",
            "constraints" : {
                "nullable" : true
            }
        },
        "hits" : {
            "type" : "array",
            "format" : "list",
            "label" : "hits",
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
        "next" : {
            "type" : "string",
            "label" : "next",
            "constraints" : {
                "nullable" : true
            }
        },
        "previous" : {
            "type" : "string",
            "label" : "previous",
            "constraints" : {
                "nullable" : true
            }
        },
        "query" : {
            "type" : "string",
            "label" : "query",
            "constraints" : {
                "nullable" : true
            }
        },
        "refinements" : {
            "type" : "array",
            "format" : "list",
            "label" : "refinements",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "content_search_refinement",
                "properties" : {
                    "attribute_id" : {
                        "type" : "string",
                        "label" : "attribute_id",
                        "constraints" : {
                            "nullable" : false,
                            "required" : true
                        }
                    },
                    "label" : {
                        "type" : "string",
                        "label" : "label",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "values" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "values",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "content_search_refinement_value",
                            "properties" : {
                                "description" : {
                                    "type" : "string",
                                    "label" : "description",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "localized" : true
                                },
                                "hit_count" : {
                                    "type" : "integer",
                                    "label" : "hit_count",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "label" : {
                                    "type" : "string",
                                    "label" : "label",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "localized" : true
                                },
                                "presentation_id" : {
                                    "type" : "string",
                                    "label" : "presentation_id",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "value" : {
                                    "type" : "string",
                                    "label" : "value",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "values" : {
                                    "type" : "array",
                                    "format" : "list",
                                    "label" : "values",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "items" : {
                                        "type" : "object",
                                        "name" : "content_search_refinement_value"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "selected_refinements" : {
            "type" : "object",
            "format" : "map",
            "label" : "selected_refinements",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "string",
                "constraints" : {
                    "nullable" : false
                }
            }
        },
        "start" : {
            "type" : "integer",
            "label" : "start",
            "constraints" : {
                "nullable" : true
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
