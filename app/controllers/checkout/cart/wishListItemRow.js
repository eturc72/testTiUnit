// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/wishListItemRow.js - A row of product list item in the wish list
 */

//----------------------------------------------
// ## VARIABLES

// Localization constant
var buttonTextLength = 18;
var logger = require('logging')('checkout:cart:wishListItemRow', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## PUBLIC API

/**
 * DEINIT
 *
 * @api public
 */
$.product_list_item_row_table.deinit = function() {
    logger.info('DEINIT called');
    $.product_list_item.deinit();
    $.destroy();
};


/**
 * update - update the display of the row
 *
 * @param {Object} product
 * @param {Object} pli
 * @param {Object} showDivider
 * @api public
 */
$.product_list_item_row_table.update = function(product, pli, showDivider) {
    logger.info('update called');
    $.product_list_item.init(product, pli);
    if (!showDivider) {
        $.product_list_item_container.setBackgroundImage(null);
    }
};

//----------------------------------------------
// ## CONSTRUCTOR

if ($.add_to_cart_button.getTitle().length > buttonTextLength) {
    $.add_to_cart_button.setFont(Alloy.Styles.detailInfoBoldFont);
}