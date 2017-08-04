// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/savedProductItemRow.js - product item row for a saved item
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:cart:savedProductItemRow', getFullControllerPath($.__controllerPath));

// Localization constant
var buttonTextLength = 18;

//----------------------------------------------
// ## FUNCTIONS

/**
 * update - update the display of the row
 *
 * @param {Object} product
 * @param {Object} pli
 * @param {Boolean} showDivider
 * @api public
 */
$.productItemRowTable.update = function(product, pli, showDivider) {
    $.product_item.init(product, pli);
    if (!showDivider) {
        $.product_line_item_container.setBackgroundImage(null);
    }
};

/**
 * DEINIT - deinit the row
 *
 * @api public
 */
$.productItemRowTable.deinit = function() {
    logger.info('DEINIT called');
    $.product_item.deinit();
    $.destroy();
};

//----------------------------------------------
// ## CONSTRUCTOR

// remove add_to_wish_list_button button if customer not logged in and wish list is enabled
if (!Alloy.Models.customer.isLoggedIn() && Alloy.CFG.enable_wish_list) {
    $.button_container.remove($.more_menu_button);
} else if ((Alloy.Models.customer.isLoggedIn() && Alloy.CFG.enable_wish_list && Alloy.Models.customer.productLists.getWishListCount() < 1) || (Alloy.Models.customer.isLoggedIn() && !Alloy.CFG.enable_wish_list)) {
    // remove more_menu_button button if customer is logged in and wish list is enabled but customer has no wish list
    $.button_container.remove($.more_menu_button);
} else {
    // remove add_button button if customer is logged in and wish list is enabled and  customer has wish list
    $.button_container.remove($.add_button);
}

if ($.add_button && $.add_button.getTitle().length > buttonTextLength) {
    $.add_button.setFont(Alloy.Styles.detailInfoBoldFont);
}
