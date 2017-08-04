// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/notifyGrowl.js - notify growl message that appears at the bottom of EA
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:notifyGrowl', getFullControllerPath($.__controllerPath));
var preventAutoClose = false;
var timeout = Alloy.CFG.notification_display_timeout;
var dismissTimer = null;

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.growl_popover_container.addEventListener('click', dismiss);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getPreventAutoClose = getPreventAutoClose;
exports.setPreventAutoClose = setPreventAutoClose;
exports.setMessage = setMessage;
exports.getMessage = getMessage;
exports.dismiss = dismiss;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @params {Object} args
 *  timeout - optional timeout for the notify to dismiss
 *  preventAutoClose - Boolean to add close button and prevent timeout dismiss
 *  label - message to put in the notify
 *
 * @api public
 */
function init(args) {
    logger.info('init called');
    var label = args.label || 'No growl message set.';
    $.growl_label.setText(label);

    args.timeout && ( timeout = args.timeout);
    preventAutoClose = args.preventAutoClose;

    if (!preventAutoClose) {
        createTimeout(label);
    } else {
        $.close_button.setVisible(true);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called ' + $.growl_label.getText());
    dismissTimer && clearTimeout(dismissTimer);
    $.growl_popover_container.removeEventListener('click', dismiss);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getPreventAutoClose - returns if prevent auto close is true or false
 *
 * @api public
 */
function getPreventAutoClose() {
    return preventAutoClose;
}

/**
 * setPreventAutoClose - change the notify to prevent it from auto closing
 *
 * @api public
 */
function setPreventAutoClose(enabled) {
    if (enabled) {
        dismissTimer && clearTimeout(dismissTimer);
        $.close_button.setVisible(true);
    }
}

/**
 * setMessage - sets the notify message and resets the timer to dismiss the dialog
 *
 * @param {Object} message
 *
 * @api public
 */
function setMessage(message) {
    logger.info('setMessage called ' + message);
    // don't reset the timer if the message is the same
    if (message != $.growl_label.getText()) {
        clearTimeout(dismissTimer);
        $.growl_label.setText(message);
        createTimeout(message);
    }
}

/**
 * getMessage - returns the message currently set for the growl
 *
 * @api public
 */
function getMessage() {
    return $.growl_label.getText();
}

/**
 * createTimeout - creates the timeout for notify dismissal
 *
 * @param {Object} label
 *
 * @api private
 */
function createTimeout(label) {
    logger.info('createTimeout called ' + label);
    dismissTimer = setTimeout(function() {
        logger.info('timeout called ' + label);
        dismiss();
    }, timeout);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - remove the notify dialog
 *
 * @api public
 */
function dismiss() {
    $.trigger('notifyGrowl:dismiss');
}
