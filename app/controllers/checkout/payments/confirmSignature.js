// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/confirmSignature.js - Associate confirms the customer's signature
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:payments:confirmSignature', getFullControllerPath($.__controllerPath));

var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);

var signatureImage = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// associate accepts the signature
$.accept_button.addEventListener('click', onAcceptClick);

// clear out the signature
$.decline_button.addEventListener('click', onDeclineClick);

paymentTerminal.addEventListener('transactionComplete', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} image
 * @api public
 */
function init(image) {
    logger.info('INIT called');
    $.signature_view.setImage(image);
    signatureImage = image;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.accept_button.removeEventListener('click', onAcceptClick);
    $.decline_button.removeEventListener('click', onDeclineClick);
    paymentTerminal.removeEventListener('transactionComplete', dismiss);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAcceptClick - associate accepts the signature
 *
 * @api private
 */
function onAcceptClick() {
    logger.info('onAcceptClick called');
    $.trigger('confirmSignature:accepted', {
        image : signatureImage
    });
}

/**
 * onDeclineClick - associate declines the signature and cancels the transaction
 *
 * @api private
 */
function onDeclineClick() {
    logger.info('onDeclineClick called');
    dismiss();
}

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('confirmSignature:dismiss');
}