// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/productPricing.js
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('product:components:productPricing', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.setPrice = setPrice;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('init called');
    if (args && args.model) {
        $model = args.model;
        $.listenTo($model, 'change:selected_details', onSelectionsDetails);
        setPrice($model.getPrice());
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * onSelectionsDetails - Selection change has occurred on product and need to udpate price
 *
 * @param {Object} model - the model that was selected
 * @api private
 */
function onSelectionsDetails(model) {
    logger.info('onSelectionsDetails called');
    if ($model.isProductSelected()) {
        updateSalesPrice(model);
    }
}

/**
 * setPrice - Set the price field
 *
 * @param {string} new_price - the new price to set
 * @api public
 */
function setPrice(new_price) {
    logger.info('setPrice called with ' + new_price);
    if (new_price) {
        $.sales_price.setText(eaUtils.toCurrency(new_price));
    }
}

/**
 * setListPrice - Set the list price field with strikethrough
 *
 * @param {string} list_price - the new list price to set
 * @api private
 */
function setListPrice(list_price) {
    logger.info('setListPrice called with ' + list_price);
    if (list_price) {
        $.list_price_container.setWidth(Ti.UI.SIZE);
        $.sales_price.setLeft(5);
        eaUtils.strikeThrough($.list_price, eaUtils.toCurrency(list_price));
    }
}

/**
 * clearListPrice - Clear the list price and only show the regular price
 *
 * @api private
 */
function clearListPrice() {
    logger.info('clearListPrice called');
    $.list_price_container.setWidth(0);
    $.sales_price.setLeft(0);
    $.list_price.setText('');
}

/**
 * updateSalesPrice - Update the sales price on PDP
 *
 * @param {Object} product - the model to get the prices from
 * @api private
 */
function updateSalesPrice(product) {
    logger.info('updateSalesPrice called with ' + JSON.stringify(product));
    var price = product.getPrice();
    var prices = product.getPrices();
    var promo_price = product.getPromoPrice();
    if (prices) {
        var listPrice = product.getListPrice();
        if (listPrice != price) {
            setListPrice(listPrice);
        } else {
            clearListPrice();
        }
    } else {
        logger.info('No price books retrieved');
    }
    if (promo_price && promo_price < price) {
        setPrice(promo_price);
        setListPrice(price);
    } else {
        // no promo, no sale, so set the price
        setPrice(price);
    }
}
