// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/shippingSummary.js - shows the shipping details (address and method) in the right side summary pane
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};

$model = $model || args.shipping_address;

var currentBasket = Alloy.Models.basket;
var toCountryName = require('EAUtils').countryCodeToCountryName;
var logger = require('logging')('checkout:components:shippingSummary', getFullControllerPath($.__controllerPath));

var oldShippingAddress = null;
var oldShippingMethod = null;

//---------------------------------------------------
// ## APP LISTENERS

// when the order has just been created, show the details from the order, not the basket
$.listenTo(Alloy.eventDispatcher, 'order_just_created', function(order) {
    logger.info('Event fired: order_just_created');
    $.shippingMethod.clear();
    $.shippingMethod.set(order.getShippingMethod().toJSON());
    $.shipping_address.set(order.getShippingAddress().toJSON());
    $.email_address_label.setText(order.getCustomerEmail());
    // adjust height of phone if it's not present
    $.phone.setHeight($.shipping_address.getPhone() && $.shipping_address.getPhone() != 'undefined' ? 15 : 0);
    $.giftMessage.init(order.getIsGift(), order.getGiftMessage());
});

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentBasket, 'change:shipments reset:shipments basket_shipping_methods', function(type, model, something, options) {
    logger.info('Event fired: shipments');
    render(currentBasket);
});

$.listenTo(currentBasket, 'change:customer_info reset:customer_info', function(type, model, something, options) {
    logger.info('Event fired: customer_info');
    if (currentBasket.getCustomerInfo()) {
        $.email_address_label.setText(currentBasket.getCustomerEmail());
    }
});

$.listenTo(currentBasket, 'change:checkout_status', function() {
    var checkoutStatus = currentBasket.getCheckoutStatus();

    // on the cart page, don't show the shipping details
    if (checkoutStatus != 'cart') {
        // on the shipping address page, show the shipping details, but only if there's an address to show
        if (checkoutStatus == 'shippingAddress') {
            if (currentBasket.getShippingAddress()) {
                this.getView().show();
            } else {
                this.getView().hide();
            }
        } else {
            this.getView().show();
        }
    } else {
        this.getView().hide();
    }
});

//---------------------------------------------------
// ## PUBLIC API

exports.render = render;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 *
 * @api public
 * @param model
 */
function render(model) {
    if (model) {
        var shippingAddress = model.getShippingAddress();
        var newAddress = shippingAddress ? Ti.Utils.sha256(JSON.stringify(shippingAddress.toJSON())) : null;
        if (newAddress != oldShippingAddress) {
            logger.info('updating shipping address');
            $.shipping_address.clear();
            if (shippingAddress) {
                $.shipping_address.set(shippingAddress.toJSON());
            } else {
                $.email_address_label.setText('');
            }
            // adjust height of phone if it's not present
            $.phone.setHeight($.shipping_address.getPhone() && ($.shipping_address.getPhone() != 'undefined') ? 15 : 0);
            oldShippingAddress = newAddress;
        }
        var shippingMethod = model.getShippingMethod();
        var newMethod = shippingMethod ? Ti.Utils.sha256(JSON.stringify(shippingMethod.toJSON())) : null;
        if (newMethod != oldShippingMethod) {
            oldShippingMethod = newMethod;
            if (shippingMethod && shippingMethod.getName()) {
                $.shipping_type.setText(shippingMethod.getName());
            } else {
                $.shipping_type.setText(_L('No Value'));
            }
        }

        var isGift = model.getIsGift();
        $.giftMessage.init(isGift, model.getGiftMessage());

        $.email_address_label.setText(model.getCustomerEmail());
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.giftMessage.deinit();
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

// when showing the shipping address, change some of the default fields so they'll display better
$.shipping_address.transform = function() {
    var phone = $.shipping_address.getPhone();
    return {
        addressLabel : $.shipping_address.getAddressDisplay('shipping'),
        phone : phone && (phone != 'undefined') ? phone : ''
    };
};
