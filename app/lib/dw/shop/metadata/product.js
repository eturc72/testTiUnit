// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "product",
    "label" : "product",
    "extra_properties" : true,
    "properties" : {
        "brand" : {
            "type" : "string",
            "label" : "brand",
            "constraints" : {
                "nullable" : true
            }
        },
        "bundled_products" : {
            "type" : "array",
            "format" : "list",
            "label" : "bundled_products",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product"
            }
        },
        "currency" : {
            "type" : "string",
            "label" : "currency",
            "constraints" : {
                "nullable" : true
            }
        },
        "ean" : {
            "type" : "string",
            "label" : "ean",
            "constraints" : {
                "nullable" : true
            }
        },
        "id" : {
            "type" : "string",
            "label" : "id",
            "constraints" : {
                "min_length" : 1,
                "max_length" : 100,
                "nullable" : false,
                "required" : true
            }
        },
        "image_groups" : {
            "type" : "array",
            "format" : "list",
            "label" : "image_groups",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "image_group",
                "properties" : {
                    "images" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "images",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "image",
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
                        }
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
                                        "name" : "variation_attribute_value",
                                        "properties" : {
                                            "value" : {
                                                "type" : "string",
                                                "label" : "value",
                                                "constraints" : {
                                                    "nullable" : true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "view_type" : {
                        "type" : "string",
                        "label" : "view_type",
                        "constraints" : {
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "inventories" : {
            "type" : "array",
            "format" : "list",
            "label" : "inventories",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "inventory",
                "properties" : {
                    "ats" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "ats",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "backorderable" : {
                        "type" : "boolean",
                        "label" : "backorderable",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "id" : {
                        "type" : "string",
                        "label" : "id",
                        "constraints" : {
                            "nullable" : false,
                            "required" : true
                        }
                    },
                    "in_stock_date" : {
                        "type" : "string",
                        "format" : "date_time",
                        "label" : "in_stock_date",
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
                    "preorderable" : {
                        "type" : "boolean",
                        "label" : "preorderable",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "stock_level" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "stock_level",
                        "constraints" : {
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "inventory" : {
            "type" : "object",
            "name" : "inventory",
            "label" : "inventory",
            "constraints" : {
                "nullable" : true
            },
            "properties" : {
                "ats" : {
                    "type" : "number",
                    "format" : "decimal",
                    "label" : "ats",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "backorderable" : {
                    "type" : "boolean",
                    "label" : "backorderable",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "id" : {
                    "type" : "string",
                    "label" : "id",
                    "constraints" : {
                        "nullable" : false,
                        "required" : true
                    }
                },
                "in_stock_date" : {
                    "type" : "string",
                    "format" : "date_time",
                    "label" : "in_stock_date",
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
                "preorderable" : {
                    "type" : "boolean",
                    "label" : "preorderable",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "stock_level" : {
                    "type" : "number",
                    "format" : "decimal",
                    "label" : "stock_level",
                    "constraints" : {
                        "nullable" : true
                    }
                }
            }
        },
        "long_description" : {
            "type" : "string",
            "label" : "long_description",
            "constraints" : {
                "nullable" : true
            },
            "localized" : true
        },
        "manufacturer_name" : {
            "type" : "string",
            "label" : "manufacturer_name",
            "constraints" : {
                "nullable" : true
            }
        },
        "manufacturer_sku" : {
            "type" : "string",
            "label" : "manufacturer_sku",
            "constraints" : {
                "nullable" : true
            }
        },
        "master" : {
            "type" : "object",
            "name" : "master",
            "label" : "master",
            "constraints" : {
                "nullable" : true
            },
            "properties" : {
                "link" : {
                    "type" : "string",
                    "label" : "link",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "master_id" : {
                    "type" : "string",
                    "label" : "master_id",
                    "constraints" : {
                        "min_length" : 1,
                        "max_length" : 100,
                        "nullable" : false,
                        "required" : true
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
        "options" : {
            "type" : "array",
            "format" : "list",
            "label" : "options",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "option",
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
                            "max_length" : 100,
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
                            "name" : "option_value",
                            "properties" : {
                                "default" : {
                                    "type" : "boolean",
                                    "label" : "default",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "id" : {
                                    "type" : "string",
                                    "label" : "id",
                                    "constraints" : {
                                        "min_length" : 1,
                                        "max_length" : 100,
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
                                "price" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "price",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                }
                            }
                        }
                    }
                }
            }
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
        "prices" : {
            "type" : "object",
            "format" : "map",
            "label" : "prices",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "number",
                "format" : "decimal",
                "constraints" : {
                    "nullable" : false
                }
            }
        },
        "primary_category_id" : {
            "type" : "string",
            "label" : "primary_category_id",
            "constraints" : {
                "nullable" : true
            }
        },
        "product_links" : {
            "type" : "array",
            "format" : "list",
            "label" : "product_links",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product_link",
                "properties" : {
                    "source_product_id" : {
                        "type" : "string",
                        "label" : "source_product_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "source_product_link" : {
                        "type" : "string",
                        "label" : "source_product_link",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "target_product_id" : {
                        "type" : "string",
                        "label" : "target_product_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "target_product_link" : {
                        "type" : "string",
                        "label" : "target_product_link",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "type" : {
                        "type" : "string",
                        "format" : "enum",
                        "label" : "type",
                        "constraints" : {
                            "enum" : ["cross_sell", "replacement", "up_sell", "accessory", "newer_version", "alt_orderunit", "spare_part", "other"],
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "product_promotions" : {
            "type" : "array",
            "format" : "list",
            "label" : "product_promotions",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product_promotion",
                "properties" : {
                    "callout_msg" : {
                        "type" : "string",
                        "label" : "callout_msg",
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
                    "promotional_price" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "promotional_price",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "promotion_id" : {
                        "type" : "string",
                        "label" : "promotion_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "set_products" : {
            "type" : "array",
            "format" : "list",
            "label" : "set_products",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product"
            }
        },
        "short_description" : {
            "type" : "string",
            "label" : "short_description",
            "constraints" : {
                "nullable" : true
            },
            "localized" : true
        },
        "type" : {
            "type" : "object",
            "name" : "product_type",
            "label" : "type",
            "constraints" : {
                "nullable" : true
            },
            "properties" : {
                "bundle" : {
                    "type" : "boolean",
                    "label" : "bundle",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "item" : {
                    "type" : "boolean",
                    "label" : "item",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "master" : {
                    "type" : "boolean",
                    "label" : "master",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "option" : {
                    "type" : "boolean",
                    "label" : "option",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "set" : {
                    "type" : "boolean",
                    "label" : "set",
                    "constraints" : {
                        "nullable" : true
                    }
                },
                "variant" : {
                    "type" : "boolean",
                    "label" : "variant",
                    "constraints" : {
                        "nullable" : true
                    }
                }
            }
        },
        "unit" : {
            "type" : "string",
            "label" : "unit",
            "constraints" : {
                "nullable" : true
            }
        },
        "upc" : {
            "type" : "string",
            "label" : "upc",
            "constraints" : {
                "nullable" : true
            }
        },
        "variants" : {
            "type" : "array",
            "format" : "list",
            "label" : "variants",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "variant",
                "properties" : {
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
                    "product_id" : {
                        "type" : "string",
                        "label" : "product_id",
                        "constraints" : {
                            "min_length" : 1,
                            "max_length" : 100,
                            "nullable" : false,
                            "required" : true
                        }
                    },
                    "variation_values" : {
                        "type" : "object",
                        "format" : "map",
                        "label" : "variation_values",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "string",
                            "constraints" : {
                                "nullable" : false
                            }
                        }
                    }
                }
            }
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
        },
        "variation_values" : {
            "type" : "object",
            "format" : "map",
            "label" : "variation_values",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "string",
                "constraints" : {
                    "nullable" : false
                }
            }
        }
    }
};
