// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/paymentSummary.js - Show the list of payments that have been applied to the order
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var toCurrency = require('EAUtils').toCurrency;
var currencyCode;
var logger = require('logging')('checkout:components:paymentSummary', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

// if the order has been fulfilled, the payments can't be deleted
$.listenTo(Alloy.eventDispatcher, 'order_just_created', function(order) {
    logger.info('responding to order_just_created');
    render(order);
});

//---------------------------------------------------
// ## MODEL LISTENERS

// when the payments change on the basket, reset the data
$.listenTo(currentBasket, 'change:payment_details reset:payment_details', function(type, model, something, options) {
    logger.info('responding to change:payment_details or reset:payment_details');
    var payments = currentBasket.getPaymentDetails();
    deinitRows();
    if (payments && payments.length > 0) {
        // these payments can be deleted
        setCanDeletePayment(currentBasket, true);
        $.payments.reset(payments);
    } else {
        $.payments.reset([]);
    }
});

$.listenTo(currentBasket, 'change:checkout_status', function() {
    var checkoutStatus = currentBasket.getCheckoutStatus();

    // on the payments page or the confirmation page, show the entered payments
    if (checkoutStatus == 'payments' || (checkoutStatus == 'confirmation' && Alloy.CFG.payment_entry != 'pos' )) {
        this.getView().show();
        this.getView().setHeight(289);
    } else {
        this.getView().hide();
        this.getView().setHeight(0);
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
 * @param {Payment} model
 * @api public
 */
function render(model) {
    currencyCode = model.getCurrencyCode();
    setCanDeletePayment(model, false);
    deinitRows();
    $.payments.reset(model.getPaymentInstruments());
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
    deinitRows();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * transformPayments - transform the payments into a displayable format
 *
 * @param {Payment} model
 * @api private
 */
function transformPayments(model) {
    if (model.isCreditCard()) {
        return {
            payment : (model.getCreditCardType() ? model.getCreditCardType() + ' ' : '') + model.getLastFourDigits(),
            amount : '- ' + toCurrency(model.getAmountAuth(), currencyCode)
        };
    } else if (model.isGiftCard()) {
        return {
            payment : 'Gift Card ' + model.getLastFourDigits(),
            amount : '- ' + toCurrency(model.getAmountAuth(), currencyCode)
        };
    } else {
        return {
            payment : '',
            amount : ''
        };
    }
}

/**
 * deinitRows - deinit the old rows in the table to remove listeners
 * @api private
 */
function deinitRows() {
    // cleanup the old rows
    if ($.payment_table.getSections().length > 0) {
        _.each($.payment_table.getSections()[0].getRows(), function(row) {
            row.deinit();
        });
    }
}

/**
 * setCanDeletePayment - set whether the payments can be deleted
 *
 * @api private
 * @param {Object} order
 * @param {Boolean} canDelete
 */
function setCanDeletePayment(order, canDelete) {
    _.each(order.getPaymentDetails(), function(payment) {
        payment.can_delete = canDelete;
    });
}

