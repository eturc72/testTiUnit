// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/gcBalanceDetails.js - Controller to show the balance of a gift card
 */

//----------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var logger = require('logging')('checkout:payments:gcBalanceDetails', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.ok_button.addEventListener('click', onOKClick);

$.cancel_button.addEventListener('click', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE


/**
 * INIT
 *
 * @param {Object} details
 * @api public
 */
function init(details) {
    logger.info('init');
    $.message.setText(details.message);
    $.current_balance_value.setText(toCurrency(details.currentBalance));
    $.amount_applied_value.setText(toCurrency(details.toApply));
    $.remaining_balance_value.setText(toCurrency(details.remainingBalance));
    // ok button can only be enabled if there is a non-zero balance
    $.ok_button.setEnabled(details.currentBalance != 0);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit(){
    $.ok_button.removeEventListener('click', onOKClick);
    $.cancel_button.removeEventListener('click', dismiss);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('gc_balance:dismiss');
}

/**
 * onOKClick- handle the ok button click
 *
 * @api private
 */
function onOKClick() {
    $.trigger('gc_balance:continue');
}

