// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/paymentTerminal.js -  Modal to request the payment terminal is used to swipe a credit card or a gift card
 */

//----------------------------------------------
// ## VARIABLES

var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var logger = require('logging')('checkout:payments:paymentTerminal', getFullControllerPath($.__controllerPath));

var currentOptions = null;
var retryData = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// event listeners for buttons on the page

$.cancel_button.addEventListener('click', onCancelClick);

$.manual_entry_button.addEventListener('click', onManualEntryClick);

$.retry_button.addEventListener('click', onRetryClick);

$.listenTo(Alloy.eventDispatcher, 'payment_terminal:manual_card_data_on', onManualCardOn);

$.listenTo(Alloy.eventDispatcher, 'payment_terminal:dismiss', dismiss);

$.listenTo(Alloy.eventDispatcher, 'payment_terminal:disable_cancel', disableCancelButton);

// Cannot use backbone event here because retry may cause code path to return to enableRetry function
// causing a loop. Backbone will block the event the second time.
Ti.App.addEventListener('payment_terminal:enable_retry', enableRetry);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.dismiss = dismiss;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args
 * @api public
 */
function init(args) {
    retryData = null;
    $.manual_entry_button.setEnabled(true);

    if (paymentTerminal.supports('solicited')) {
        args.options = {
            solicited : true
        };
    }

    currentOptions = args;

    logger.info('cancelling pending request(s)');
    paymentTerminal.cancelPayment();
    // only cancels payment on the payment terminal. This is just a safety check.

    // Tell registered payment_terminal to listen payment/card info
    logger.info('requesting standard payment (not manual)');
    paymentTerminal.acceptPayment(args);

    if (!paymentTerminal.supports('payment_terminal_cancel')) {
        $.cancel_button.hide();
        $.cancel_button.setWidth(0);
    }

    if (!args.hideManualEntry && paymentTerminal.supports('manual_entry')) {
        $.manual_entry_button.show();
    } else {
        $.manual_entry_button.hide();
        $.manual_entry_button.setWidth(0);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    retryData = null;
    paymentTerminal.removeEventListener('transactionComplete', dismiss);
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.manual_entry_button.removeEventListener('click', onManualEntryClick);
    $.stopListening(Alloy.eventDispatcher, 'payment_terminal:manual_card_data_on', onManualCardOn);
    $.stopListening(Alloy.eventDispatcher, 'payment_terminal:dismiss', dismiss);
    $.stopListening(Alloy.eventDispatcher, 'payment:payment_listeners_stopped', paymentListenersStopped);
    // just in case
    $.stopListening(Alloy.eventDispatcher, 'payment_terminal:disable_cancel', disableCancelButton);
    // Cannot use backbone event here because retry may cause code path to return to enableRetry function
    // causing a loop. Backbone will block the event the second time.
    Ti.App.removeEventListener('payment_terminal:enable_retry', enableRetry);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * dismiss - trigger the closing of the dialog
 *
 * @api public
 */
function dismiss() {
    $.trigger('payment_terminal:dismiss');
}

/**
 * enableRetry - enable the retry button
 *
 * @param {Object} event
 * @api private
 */
function enableRetry(event) {
    logger.info('paymentTerminal: enabling retry');
    retryData = event.payment_data;
    $.payment_terminal_label.setText(event.message);
    $.cancel_button.setEnabled(true);
    $.retry_button.setVisible(true);
    $.retry_button.setWidth($.cancel_button.getWidth());
    if (paymentTerminal.supports('manual_entry')) {
        $.manual_entry_button.hide();
        $.manual_entry_button.setWidth(0);
    }
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCancelClick - when cancel is tapped
 *
 * @api private
 */
function onCancelClick() {
    $.cancel_button.setEnabled(false);

    $.listenTo(Alloy.eventDispatcher, 'payment:payment_listeners_stopped', paymentListenersStopped);

    logger.info('paymentTerminal: cancel clicked');
    Alloy.eventDispatcher.trigger('payment:stop_payment_listening');

    logger.info('paymentTerminal: cancelPayment on payment terminal');
    paymentTerminal.cancelPayment();

    var orderNo = Alloy.Models.basket.getOrderNo();
    retryData = null;

    setTimeout(function() {
        logger.info('paymentTerminal: cancelServerTransaction');
        paymentTerminal.cancelServerTransaction({
            order_no : orderNo
        });
    }, 5000);
}

/**
 * paymentListenersStopped - dismiss the payment terminal dialog only after the payment listeners have stopped
 *
 * @api private
 */
function paymentListenersStopped() {
    $.stopListening(Alloy.eventDispatcher, 'payment:payment_listeners_stopped', paymentListenersStopped);
    dismiss();
}

/**
 * disableCancelButton - disable the cancel button, used by event
 *
 * @api private
 */
function disableCancelButton() {
    $.cancel_button.setEnabled(false);
}

/**
 * onManualEntryClick - when the user taps on the manual entry button
 *
 * @api private
 */
function onManualEntryClick() {
    $.manual_entry_button.setEnabled(false);
    paymentTerminal.cancelPayment({
        sendEvent : 0
    });

    setTimeout(function() {
        paymentTerminal.acceptPayment({
            amount : currentOptions.amount,
            options : {
                manual : true
            }
        });
    }, 3000);
    // This number can be adjusted depending on the device.  The cancel seems to happen faster with the Verifone e335 vs the Verifone e355.  A lower number like 2000 works with the e335.
}

/**
 * onManualCardOn - when the payment terminal has been turned to on
 *
 * @api private
 */
function onManualCardOn() {
    $.manual_entry_button.setTitle(_L('Manual Entry (on)'));
}

/**
 * onRetryClick() - handle the retry button
 *
 * @api private
 */
function onRetryClick() {
    if (retryData) {
        logger.info('Retrying payment approved event: ' + JSON.stringify(retryData));
        var eventType = Alloy.CFG.devices.payment_terminal_module == 'adyenDevice' ? 'payment:cc_approved' : 'payment:credit_card_data';
        Alloy.eventDispatcher.trigger(eventType, retryData);
        $.retry_button.setVisible(false);
        $.retry_button.setWidth(0);
        $.payment_terminal_label.setText(_L('Retrying attempt to complete order'));
        retryData = null;
    }
}
