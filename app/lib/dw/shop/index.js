// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/index.js - Defines shop model data requires for convience
 *
 * @api public
 */
module.exports = {
    version : '17.1',

    Category : require('dw/shop/Category'),
    Content : require('dw/shop/Content'),
    ContentSearch : require('dw/shop/ContentSearch'),
    Folder : require('dw/shop/Folder'),
    Product : require('dw/shop/Product'),
    ProductSearch : require('dw/shop/ProductSearch'),
    Promotion : require('dw/shop/Promotion'),
    Site : require('dw/shop/Site'),
    Store : require('dw/shop/Store')
};
