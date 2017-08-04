// ©2013-2017 salesforce.com, inc. All rights reserved.
module.exports = {
    "_v" : "17.1",
    "type" : "object",
    "name" : "content_folder",
    "label" : "content_folder",
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
        "folders" : {
            "type" : "array",
            "format" : "list",
            "label" : "folders",
            "constraints" : {
                "nullable" : true
            },
            "items" : {
                "type" : "object",
                "name" : "content_folder"
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
        "parent_folder_id" : {
            "type" : "string",
            "label" : "parent_folder_id",
            "constraints" : {
                "nullable" : true
            }
        }
    }
};
