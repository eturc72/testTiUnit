// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/description.js - controller for description tab on PDP
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
// Use passed in parameter 'product' or global singleton
var currentProduct = args.product || Alloy.Models.product;
var logger = require('logging')('product:tabs:description', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    render();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');
    $.product_description.setHtml('');

    var shortDescription = currentProduct.getShortDescription();
    var longDescription = currentProduct.getLongDescription();
    if (!shortDescription && !longDescription) {
        return;
    }

    var descriptionText = shortDescription || longDescription;

    var html = '<meta name="viewport" content="user-scalable=0,initial-scale=0">' + '<style>' + Alloy.CFG.webViewCssReset + (Alloy.CFG.product.descriptionWebViewCss || '') + '</style>' + '<div>' + descriptionText + '</div>';

    $.product_description.setHtml(html);
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
