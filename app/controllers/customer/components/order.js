// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/order.js - Functions for handling Customer Order Details
 */

//---------------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var logger = require('logging')('customer:components:order', getFullControllerPath($.__controllerPath));
var args = arguments[0] || $.args || {};

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.customer_order.addEventListener('click', customerOrderClickEventHandler);

$.backdrop.addEventListener('click', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise
 * @api public
 */
function init() {
    logger.info('Calling INIT');
    var order = Alloy.Models.customerOrder;
    var deferred = new _.Deferred();
    $.order_header.render(order, false);

    // Display Shipments Details
    $.shipping_details.render(order);

    // Payment Information
    $.payment_details_view.render(order);
    // Order Summary Information
    $.order_summary.render(order.toJSON(), false);
    // Order product details
    $.order_product_details.render(order).always(function() {
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.backdrop.removeEventListener('click', dismiss);
    $.customer_order.removeEventListener('click', customerOrderClickEventHandler);
    $.order_product_details.deinit();
    $.order_header.deinit();
    $.order_summary.deinit();
    $.shipping_details.deinit();
    $.payment_details_view.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * customerOrderClickEventHandler - handle the order click event
 * @api private
 */
function customerOrderClickEventHandler(event) {
    logger.info('customer_order click event listener');
    event.cancelBubble = true;
    dismiss();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the view
 * @api private
 */
function dismiss() {
    logger.info('dimissing order history');
    $.trigger('order_history:dismiss');
}
