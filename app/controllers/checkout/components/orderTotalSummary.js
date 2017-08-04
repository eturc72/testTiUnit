// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/orderTotalSummary.js - Controller that shows the order totals in the right hand summary
 */

//---------------------------------------------------
// ## VARIABLES
var args = arguments[0] || {};

var currentBasket = Alloy.Models.basket;
var EAUtils = require('EAUtils');
var toCurrency = require('EAUtils').toCurrency;
var zero = require('EAUtils').zero;
var logger = require('logging')('checkout:components:orderTotalSummary', getFullControllerPath($.__controllerPath));
var oldOrderTotal,
    oldShippingTotal,
    oldProductSubtotal,
    oldOrderDiscount,
    oldTaxTotal,
    oldShippingDiscount = null;

//---------------------------------------------------
// ## APP LISTENERS

// when the order has been fulfilled, set the data to that order
$.listenTo(Alloy.eventDispatcher, 'order_just_created', function(event) {
    logger.info('Showing order totals for the newly fufilled order');
    oldOrderTotal = null;
    oldShippingTotal = null;
    oldProductSubtotal = null;
    oldOrderDiscount = null;
    oldTaxTotal = null;
    oldShippingDiscount = null;
    render(event.toJSON());
});

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentBasket, 'basket_sync change:order_price_adjustments basket_shipping_methods', function(type, model, something, options) {
    logger.info('Event fired: ' + type);
    render(currentBasket.toJSON(), true);
});

$.listenTo(currentBasket, 'change:checkout_status', function() {
    if (currentBasket.getCheckoutStatus() == 'cart') {
        render(currentBasket.toJSON(), true);
    }
});

if (EAUtils.isLatinBasedLanguage()) {
    $.order_total_label.setFont(Alloy.Styles.detailTextFont);
} else {
    $.order_total_label.setFont(Alloy.Styles.sectionTitleFont);
}

//---------------------------------------------------
// ## PUBLIC API

exports.render = render;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 *
 * @param {Object} basket - the basket to render
 * @param {Boolean} hasShippingMethods - whether the shipping methods are on the current basket
 * @api public
 */
function render(basket, hasShippingMethods) {
    logger.info('render called');
    $.basket.clear();
    $.basket.set(basket);
    // an order won't have shipping methods, but the currentBasket still will have the right ones
    $.basket.shippingMethods = currentBasket.shippingMethods;
    setProductSubtotal();
    setOrderDiscount();
    setOrderTotal();
    setShippingDiscount(hasShippingMethods);
    setShippingTotal(hasShippingMethods);
    setTaxTotal();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * setProductSubtotal - fill in the product subtotal field
 *
 * @api private
 */
function setProductSubtotal() {
    var productSubtotal = zero(parseFloat($.basket.getProductSubtotal()));
    if (oldProductSubtotal != productSubtotal) {
        $.subtotal_value.setText(productSubtotal != 0 ? toCurrency(productSubtotal, $.basket.getCurrencyCode()) : _L('No Value'));
        oldProductSubtotal = productSubtotal;
    }
}

/**
 * setOrderDiscount - fill in the order discount field
 *
 * @api private
 */
function setOrderDiscount() {
    var orderDiscount = $.basket.calculateOrderPriceAdjustments();
    if (oldOrderDiscount != orderDiscount) {
        $.discounts_value.setText(orderDiscount != 0 ? toCurrency(orderDiscount, $.basket.getCurrencyCode()) : _L('No Value'));
        oldOrderDiscount = orderDiscount;
    }
}

/**
 * setShippingTotal - fill in the shipping total field
 *
 * @param hasShippingMethods whether the shipping methods have been fetched yet
 * @api private
 */
function setShippingTotal(hasShippingMethods) {
    var shippingMethod = $.basket.getShippingMethod();
    var shippingTotal = zero(parseFloat($.basket.getShippingTotal()));
    if (shippingMethod && $.basket.shippingMethods && $.basket.hasProductItems()) {
        shippingTotal = $.basket.getShippingMethodPrice(shippingMethod.getID());
    }
    // if we haven't fetched the shipping methods, the calculations in the basket will be completely off, so don't show them
    if (!$.basket.shippingMethods && hasShippingMethods) {
        shippingTotal = 0;
    }
    if (oldShippingTotal != shippingTotal) {
        $.shipping_total.setText(shippingTotal != 0 ? toCurrency(shippingTotal, $.basket.getCurrencyCode()) : _L('No Value'));
        oldShippingTotal = shippingTotal;
    }
}

/**
 * setShippingDiscount - fill in the product subtotal field
 *
 * @param hasShippingMethods whether the shipping methods have been fetched yet
 * @api private
 */
function setShippingDiscount(hasShippingMethods) {
    var shippingMethod = $.basket.getShippingMethod();
    var shippingCost = zero(parseFloat($.basket.getShippingTotal()));
    if (shippingMethod && $.basket.shippingMethods && $.basket.hasProductItems()) {
        shippingCost = $.basket.getShippingMethodPrice(shippingMethod.getID());
    }
    // if we haven't fetched the shipping methods, the calculations in the basket will be completely off, so don't show them
    if (!$.basket.shippingMethods && hasShippingMethods) {
        shippingCost = 0;
        shippingDiscount = 0;
    } else {
        // the shipping_total in the basket is the shipping cost - the shipping discount, so we can calculate the shipping discount.
        if ($.basket.getShippingTotalBasePrice()) {
            shippingCost = $.basket.getShippingTotalBasePrice();
        }
        shippingDiscount = shippingMethod ? $.basket.getShippingTotal() - shippingCost : 0;
    }
    if (oldShippingDiscount != shippingDiscount) {
        $.shipping_discount.setText(shippingDiscount != 0 ? toCurrency(shippingDiscount, $.basket.getCurrencyCode()) : _L('No Value'));
        oldShippingDiscount = shippingDiscount;
    }
}

/**
 * setTaxTotal - fill in the tax total field
 * @api private
 */
function setTaxTotal() {
    var taxTotal = zero(parseFloat($.basket.getTaxTotal()));
    if (oldTaxTotal != taxTotal) {
        $.sales_tax_total.setText(taxTotal != 0 ? toCurrency(taxTotal, $.basket.getCurrencyCode()) : _L('No Value'));
        oldTaxTotal = taxTotal;
    }
}

/**
 * setOrderTotal - fill in the order total field
 * @api private
 */
function setOrderTotal() {
    var orderTotal = zero(parseFloat($.basket.getOrderTotal() || $.basket.getProductTotal()));
    if (oldOrderTotal != orderTotal) {
        $.order_total_value.setText(orderTotal != 0 ? toCurrency(orderTotal, $.basket.getCurrencyCode()) : _L('No Value'));
        oldOrderTotal = orderTotal;
    }
}

