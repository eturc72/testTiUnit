// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/unavailableProductItemRow.js - A row of unavailable product line item in the store pickup popover
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:address:unavailableProductItemRow', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## PUBLIC API

/**
 * DEINIT
 *
 * @api public
 */
$.product_item_row.deinit = function() {
    logger.info('DEINIT called');
    $.product_item.deinit();
    $.product_item_row.update = null;
    $.stopListening();
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
$.product_item_row.update = function(product, pli, showDivider) {
    logger.info('update called');
    $.product_item.init(product, pli);
    if (_.isFunction(pli.hasMessage) && pli.hasMessage()) {
        $.product_line_item_container.setHeight($.product_line_item_container.getHeight() + 10);
    }

};
