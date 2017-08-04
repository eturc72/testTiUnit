// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/ConfirmationDialog.js - generic dialog for confirmation
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:ConfirmationDialog', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {};
var okButtonText = args.okButtonString || _L('OK');
var cancelButtonText = args.cancelButtonString || _L('Cancel');
var messageText = args.messageString;
var titleText = args.titleString || _L('Confirm');
var hideCancel = args.hideCancel || false;
var icon = args.icon;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.ok_button.addEventListener('click', onOKButton);
$.cancel_button.addEventListener('click', dismiss);

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
function init() {
    logger.info('INIT called');
    titleText && $.title.setText(titleText);
    messageText && $.message.setText(messageText);

    okButtonText && $.ok_button.setTitle(okButtonText);
    if (hideCancel) {
        $.cancel_button.setWidth(0);
        $.cancel_button.hide();
    } else {
        cancelButtonText && $.cancel_button.setTitle(cancelButtonText);
        $.ok_button.setLeft(20);
    }
    if (icon) {
        $.message.setLeft(10);
        $.icon.setWidth(64);
        $.icon.setHeight(64);
        $.icon.setImage(icon);
        $.icon.setVisible(true);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.ok_button.removeEventListener('click', onOKButton);
    $.cancel_button.removeEventListener('click', dismiss);
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onOKButton - handler for when the ok button is tapped
 *
 * @api private
 */
function onOKButton() {
    $.trigger('confirmation_dialog:continue');
}

/**
 * dismiss - the confirmation dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('confirmation_dialog:dismiss');
}
