// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/promptSignature.js - Collect the customer's signature
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:payments:promptSignature', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {};
var hideCancel = args.hideCancel;

var paintView = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// customer accepts the signature
$.accept_button.addEventListener('click', onAcceptClick);

// clear out the signature
$.clear_button.addEventListener('click', onClearClick);

// cancel out the signature
$.cancel_button.addEventListener('click', onCancelClick);

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
    if (hideCancel) {
        $.cancel_button.setVisible(false);
        $.cancel_button.setWidth(0);
        $.clear_button.setLeft(0);
    }
    var Paint = require('ti.paint');
    paintView = Paint.createPaintView({
        top : 0,
        right : 0,
        bottom : 0,
        left : 0,
        strokeColor : Alloy.Styles.color.text.black,
        strokeAlpha : 255,
        strokeWidth : 3,
        eraseMode : false
    });

    $.signature_view.add(paintView);
    paintView.clear();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    removeAllChildren($.signature_view);
    paintView = null;
    $.accept_button.removeEventListener('click', onAcceptClick);
    $.clear_button.removeEventListener('click', onClearClick);
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAcceptClick - customer accepts the signature
 *
 * @api private
 */
function onAcceptClick() {
    var sigImg = paintView.toImage();
    $.trigger('promptSignature:accept_signature', {
        image : sigImg
    });
}

/**
 * onClearClick - clear out the signature
 *
 * @api private
 */
function onClearClick() {
    paintView.clear();
}

/**
 * onAcceptClick - customer cancels the signature
 *
 * @api private
 */
function onCancelClick() {
    $.trigger('promptSignature:cancel_signature');
}
