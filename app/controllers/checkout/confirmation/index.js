// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/confirmation/inex.js - Controller for confirmation tab
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:confirmation:index', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

moment.locale(Alloy.CFG.languageSelected);
$.listenTo($.order_header, 'orderAbandoned', function() {
    $.trigger('orderAbandoned');
});

//---------------------------------------------------
// ## PUBLIC API
exports.render = render;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 *
 * @api public
 */
function render(order) {
    logger.secureLog('Basket: ' + JSON.stringify(order.toJSON()));
    $.order_header.render(order, true);
    $.order_product_details.render(order);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.stopListening();
    $.order_header.deinit();
    $.order_product_details.deinit();
    $.destroy();
}