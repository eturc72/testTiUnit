// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/emailCollectorDialog.js - dialog to collect the email address
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var showError = require('EAUtils').showError;
var clearError = require('EAUtils').clearError;
var email_regex = new RegExp(Alloy.CFG.regexes.email, 'i');
var logger = require('logging')('checkout:cart:emailCollectorDialog', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.focus = focus;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    $.email_address.setHintText(_L('Enter email here'));
    logger.info('INIT called');

}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.send_button.removeEventListener('click', validateEmailAddress);
    $.email_address.removeEventListener('return', validateEmailAddress);
    $.cancel_button.removeEventListener('click', dismiss);
    $.stopListening();
    $.destroy();
}


//---------------------------------------------------
// ## FUNCTIONS

/**
 * focus -  bring up the keyboard by focusing on email address textfield
 *
 * @api public
 */
function focus() {
    $.email_address.focus();
}

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss(event) {
    logger.info('dimiss called');
    $.email_address.blur();
    $.trigger('email_collector_dialog:dismiss');
}

/**
 * validateEmailAddress - validate the email address and if valid, return it
 *
 * @api private
 */
function validateEmailAddress() {
    if ($.email_address.getValue()) {
        if (email_regex.test($.email_address.getValue())) {
            clearError($.email_address, $.email_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, false);
            $.email_address.blur();
            args.emailData.receiverEmail = $.email_address.getValue().trim();
            var promise = Alloy.Models.customer.productLists.mail.send(args.emailData);
            Alloy.Router.showActivityIndicator(promise);
            promise.done(function() {
                $.trigger('email_collector_dialog:continue');
                notify(args.successNotifyMessage);
            }).fail(function() {
                notify(args.failNotifyMessage);
            });
            return;
        } else {
            showError($.email_address, $.email_error, _L('Invalid email address'), false);
            return;
        }
    }
    showError($.email_address, $.email_error, _L('Enter email address'), false);
    return;
}

