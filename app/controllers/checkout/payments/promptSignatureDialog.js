// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/promptSignatureDialog.js - Collect the customer's signature in a standalone dialog
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:payments:promptSignatureDialog', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

// customer accepts the signature
$.listenTo($.prompt_signature, 'promptSignature:accept_signature', onAcceptSignature);
$.listenTo($.prompt_signature, 'promptSignature:cancel_signature', onCancelSignature);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('INIT called');
    $.prompt_signature.init();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.prompt_signature.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAcceptSignature - customer accepts the signature
 *
 * @param {Object} event
 * @api private
 */
function onAcceptSignature(event) {
    logger.info('onAcceptSignature called');
    // store this in a global variable so the printer can access it
    Alloy.sigBlob = event.image;
    $.trigger('promptSignatureDialog:accept_signature', {
        image : event.image
    });
}

/**
 * onCancelSignature - customer cancels the signature
 *
 * @api private
 */
function onCancelSignature() {
    logger.info('onCancelSignature called');
    $.trigger('promptSignatureDialog:dismiss');
}
