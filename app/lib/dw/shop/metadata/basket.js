// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "basket",
    "label" : "basket",
    "extra_properties" : true,
    "properties" : {
        "billing_address" : {
            "type" : "object",
            "name" : "order_address",
            "label" : "billing_address",
            "constraints" : {
                "nullable" : true
            },
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
        },
        "coupon_items" : {
            "type" : "array",
            "format" : "list",
            "label" : "coupon_items",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "coupon_item",
                "extra_properties" : true,
                "properties" : {
                    "code" : {
                        "type" : "string",
                        "label" : "code",
                        "constraints" : {
                            "max_length" : 256,
                            "nullable" : true,
                            "required" : true
                        }
                    },
                    "status_code" : {
                        "type" : "string",
                        "format" : "enum",
                        "label" : "status_code",
                        "constraints" : {
                            "enum" : ["coupon_code_already_in_basket", "coupon_code_already_redeemed", "coupon_code_unknown", "coupon_disabled", "redemption_limit_exceeded", "customer_redemption_limit_exceeded", "timeframe_redemption_limit_exceeded", "no_active_promotion", "coupon_already_in_basket", "no_applicable_promotion", "applied", "adhoc"],
                            "nullable" : true
                        }
                    },
                    "valid" : {
                        "type" : "boolean",
                        "label" : "valid",
                        "constraints" : {
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "currency" : {
            "type" : "string",
            "label" : "currency",
            "constraints" : {
                "nullable" : true
            }
        },
        "customer_info" : {
            "type" : "object",
            "name" : "customer_info",
            "label" : "customer_info",
            "constraints" : {
                "nullable" : true
            },
            "properties" : {
                "email" : {
                    "type" : "string",
                    "label" : "email",
                    "constraints" : {
                        "nullable" : false,
                        "required" : true
                    }
                }
            }
        },
        "order_price_adjustments" : {
            "type" : "array",
            "format" : "list",
            "label" : "order_price_adjustments",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "price_adjustment",
                "extra_properties" : true,
                "properties" : {
                    "coupon_code" : {
                        "type" : "string",
                        "label" : "coupon_code",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "item_text" : {
                        "type" : "string",
                        "label" : "item_text",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "price" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "price",
                        "constraints" : {
                            "nullable" : true,
                            "required" : true
                        }
                    },
                    "promotion_id" : {
                        "type" : "string",
                        "label" : "promotion_id",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "promotion_link" : {
                        "type" : "string",
                        "label" : "promotion_link",
                        "constraints" : {
                            "nullable" : true
                        }
                    }
                }
            }
        },
        "order_total" : {
            "type" : "number",
            "format" : "decimal",
            "label" : "order_total",
            "constraints" : {
                "nullable" : true
            }
        },
        "payment_method" : {
            "type" : "object",
            "name" : "payment_method",
            "label" : "payment_method",
            "constraints" : {
                "nullable" : true
            },
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
        },
        "product_items" : {
            "type" : "array",
            "format" : "list",
            "label" : "product_items",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "product_item",
                "extra_properties" : true,
                "properties" : {
                    "adjusted_price" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "adjusted_price",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "base_price" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "base_price",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "bundled_product_items" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "bundled_product_items",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "bundled_product_item",
                            "extra_properties" : true,
                            "properties" : {
                                "bundled_product_items" : {
                                    "type" : "array",
                                    "format" : "list",
                                    "label" : "bundled_product_items",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "items" : {
                                        "type" : "object",
                                        "name" : "bundled_product_item"
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
                                "item_text" : {
                                    "type" : "string",
                                    "label" : "item_text",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "product_id" : {
                                    "type" : "string",
                                    "label" : "product_id",
                                    "constraints" : {
                                        "max_length" : 100,
                                        "nullable" : true,
                                        "required" : true
                                    }
                                },
                                "product_name" : {
                                    "type" : "string",
                                    "label" : "product_name",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "quantity" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "quantity",
                                    "constraints" : {
                                        "min_number_value" : 0.0,
                                        "max_number_value" : 999.0,
                                        "nullable" : true,
                                        "required" : true
                                    }
                                }
                            }
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
                    "item_text" : {
                        "type" : "string",
                        "label" : "item_text",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "option_items" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "option_items",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "option_item",
                            "properties" : {
                                "base_price" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "base_price",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "item_text" : {
                                    "type" : "string",
                                    "label" : "item_text",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "option_id" : {
                                    "type" : "string",
                                    "label" : "option_id",
                                    "constraints" : {
                                        "max_length" : 256,
                                        "nullable" : true,
                                        "required" : true
                                    }
                                },
                                "option_value_id" : {
                                    "type" : "string",
                                    "label" : "option_value_id",
                                    "constraints" : {
                                        "max_length" : 256,
                                        "nullable" : true,
                                        "required" : true
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
                                "quantity" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "quantity",
                                    "constraints" : {
                                        "min_number_value" : 0.01,
                                        "max_number_value" : 999.0,
                                        "nullable" : true
                                    }
                                }
                            }
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
                    "price_adjustments" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "price_adjustments",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "price_adjustment",
                            "extra_properties" : true,
                            "properties" : {
                                "coupon_code" : {
                                    "type" : "string",
                                    "label" : "coupon_code",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "item_text" : {
                                    "type" : "string",
                                    "label" : "item_text",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "price" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "price",
                                    "constraints" : {
                                        "nullable" : true,
                                        "required" : true
                                    }
                                },
                                "promotion_id" : {
                                    "type" : "string",
                                    "label" : "promotion_id",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "promotion_link" : {
                                    "type" : "string",
                                    "label" : "promotion_link",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                }
                            }
                        }
                    },
                    "product_id" : {
                        "type" : "string",
                        "label" : "product_id",
                        "constraints" : {
                            "max_length" : 100,
                            "nullable" : true,
                            "required" : true
                        }
                    },
                    "product_name" : {
                        "type" : "string",
                        "label" : "product_name",
                        "constraints" : {
                            "nullable" : true
                        }
                    },
                    "quantity" : {
                        "type" : "number",
                        "format" : "decimal",
                        "label" : "quantity",
                        "constraints" : {
                            "min_number_value" : 0.0,
                            "max_number_value" : 999.0,
                            "nullable" : true,
                            "required" : true
                        }
                    }
                }
            }
        },
        "product_sub_total" : {
            "type" : "number",
            "format" : "decimal",
            "label" : "product_sub_total",
            "constraints" : {
                "nullable" : true
            }
        },
        "product_total" : {
            "type" : "number",
            "format" : "decimal",
            "label" : "product_total",
            "constraints" : {
                "nullable" : true
            }
        },
        "shipments" : {
            "type" : "array",
            "format" : "list",
            "label" : "shipments",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "shipment",
                "extra_properties" : true,
                "properties" : {
                    "shipping_address" : {
                        "type" : "object",
                        "name" : "order_address",
                        "label" : "shipping_address",
                        "constraints" : {
                            "nullable" : true
                        },
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
                    },
                    "shipping_items" : {
                        "type" : "array",
                        "format" : "list",
                        "label" : "shipping_items",
                        "constraints" : {
                            "nullable" : true
                        },
                        "items" : {
                            "type" : "object",
                            "name" : "shipping_item",
                            "extra_properties" : true,
                            "properties" : {
                                "adjusted_price" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "adjusted_price",
                                    "constraints" : {
                                        "nullable" : true,
                                        "required" : true
                                    }
                                },
                                "item_text" : {
                                    "type" : "string",
                                    "label" : "item_text",
                                    "constraints" : {
                                        "nullable" : true
                                    }
                                },
                                "price" : {
                                    "type" : "number",
                                    "format" : "decimal",
                                    "label" : "price",
                                    "constraints" : {
                                        "nullable" : true,
                                        "required" : true
                                    }
                                },
                                "price_adjustments" : {
                                    "type" : "array",
                                    "format" : "list",
                                    "label" : "price_adjustments",
                                    "constraints" : {
                                        "nullable" : true
                                    },
                                    "items" : {
                                        "type" : "object",
                                        "name" : "price_adjustment",
                                        "extra_properties" : true,
                                        "properties" : {
                                            "coupon_code" : {
                                                "type" : "string",
                                                "label" : "coupon_code",
                                                "constraints" : {
                                                    "nullable" : true
                                                }
                                            },
                                            "item_text" : {
                                                "type" : "string",
                                                "label" : "item_text",
                                                "constraints" : {
                                                    "nullable" : true
                                                }
                                            },
                                            "price" : {
                                                "type" : "number",
                                                "format" : "decimal",
                                                "label" : "price",
                                                "constraints" : {
                                                    "nullable" : true,
                                                    "required" : true
                                                }
                                            },
                                            "promotion_id" : {
                                                "type" : "string",
                                                "label" : "promotion_id",
                                                "constraints" : {
                                                    "nullable" : true
                                                }
                                            },
                                            "promotion_link" : {
                                                "type" : "string",
                                                "label" : "promotion_link",
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
                    "shipping_method" : {
                        "type" : "object",
                        "name" : "shipping_method",
                        "label" : "shipping_method",
                        "constraints" : {
                            "nullable" : true
                        },
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
                            "price" : {
                                "type" : "number",
                                "format" : "decimal",
                                "label" : "price",
                                "constraints" : {
                                    "nullable" : true
                                }
                            },
                            "shipping_promotions" : {
                                "type" : "array",
                                "format" : "list",
                                "label" : "shipping_promotions",
                                "constraints" : {
                                    "nullable" : true
                                },
                                "items" : {
                                    "type" : "object",
                                    "name" : "shipping_promotion",
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
                                        "promotion_id" : {
                                            "type" : "string",
                                            "label" : "promotion_id",
                                            "constraints" : {
                                                "nullable" : true
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
        "shipping_total" : {
            "type" : "number",
            "format" : "decimal",
            "label" : "shipping_total",
            "constraints" : {
                "nullable" : true
            }
        },
        "tax_total" : {
            "type" : "number",
            "format" : "decimal",
            "label" : "tax_total",
            "constraints" : {
                "nullable" : true
            }
        }
    }
};
