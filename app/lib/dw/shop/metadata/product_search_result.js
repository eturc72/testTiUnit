// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "product_search_result",
    "label" : "product_search_result",
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
                "name" : "product_search_hit",
                "properties" : {
                    "currency" : {
                        "type" : "string",
                        "label" : "currency",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "image" : {
                        "type" : "object",
                        "name" : "image",
                        "label" : "image",
                        "constraints" : {
                            "nullable" : true
                        },
                        "properties" : {
                            "alt" : {
                                "type" : "string",
                                "label" : "alt",
                                "constraints" : {
                                    "nullable" : true
                                },
                                "localized" : true
                            },
                            "link" : {
                                "type" : "string",
                                "label" : "link",
                                "constraints" : {
                                    "nullable" : true
                                }
                            },
                            "title" : {
                                "type" : "string",
                                "label" : "title",
                                "constraints" : {
                                    "nullable" : true
                                },
                                "localized" : true
                            }
                        }
                    },
                    "link" : {
                        "type" : "string",
                        "label" : "link",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "orderable" : {
                        "type" : "boolean",
                        "label" : "orderable",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "price" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "price",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "price_max" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "price_max",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "product_id" : {
                        "type" : "string",
                        "label" : "product_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "product_name" : {
                        "type" : "string",
                        "label" : "product_name",
                        "constraints" : {
                            "nullable" : true
                        },
                        "localized" : true
                    },
                    "variation_attributes" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "variation_attributes",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "variation_attribute",
                            "properties" : {
                                "id" : {
                                    "type" : "string",
                                    "label" : "id",
                                    "constraints" : {
                                        "min_length" : 1,
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
                                "values" : {
                                    "type" : "array",
                                    "format" : "list",
                                    "label" : "values",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "items" : {
                                        "type" : "object",
                                        "name" : "variation_attribute_value",
                                        "properties" : {
                                            "description" : {
                                                "type" : "string",
                                                "label" : "description",
                                                "constraints" : {
                                                    "nullable" : true
                                                },
                                                "localized" : true
                                            },
                                            "image" : {
                                                "type" : "object",
                                                "name" : "image",
                                                "label" : "image",
                                                "constraints" : {
                                                    "nullable" : true
                                                },
                                                "properties" : {
                                                    "alt" : {
                                                        "type" : "string",
                                                        "label" : "alt",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        },
                                                        "localized" : true
                                                    },
                                                    "link" : {
                                                        "type" : "string",
                                                        "label" : "link",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        }
                                                    },
                                                    "title" : {
                                                        "type" : "string",
                                                        "label" : "title",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        },
                                                        "localized" : true
                                                    }
                                                }
                                            },
                                            "image_swatch" : {
                                                "type" : "object",
                                                "name" : "image",
                                                "label" : "image_swatch",
                                                "constraints" : {
                                                    "nullable" : true
                                                },
                                                "properties" : {
                                                    "alt" : {
                                                        "type" : "string",
                                                        "label" : "alt",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        },
                                                        "localized" : true
                                                    },
                                                    "link" : {
                                                        "type" : "string",
                                                        "label" : "link",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        }
                                                    },
                                                    "title" : {
                                                        "type" : "string",
                                                        "label" : "title",
                                                        "constraints" : {
                                                            "nullable" : true
                                                        },
                                                        "localized" : true
                                                    }
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
                                            "orderable" : {
                                                "type" : "boolean",
                                                "label" : "orderable",
                                                "constraints" : {
                                                    "nullable" : true
                                                }
                                            },
                                            "value" : {
                                                "type" : "string",
                                                "label" : "value",
                                                "constraints" : {
                                                    "min_length" : 1,
                                                    "nullable" : false,
                                                    "required" : true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
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
                "name" : "product_search_refinement",
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
                            "name" : "product_search_refinement_value",
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
                                        "name" : "product_search_refinement_value"
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
        "selected_sorting_option" : {
            "type" : "string",
            "label" : "selected_sorting_option",
            "constraints" : {
                "nullable" : true
            }
        },
        "sorting_options" : {
            "type" : "array",
            "format" : "list",
            "label" : "sorting_options",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product_search_sorting_option",
                "properties" : {
                    "id" : {
                        "type" : "string",
                        "label" : "id",
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
                    }
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
