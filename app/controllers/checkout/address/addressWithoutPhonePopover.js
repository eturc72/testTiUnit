// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/addressWithoutPhoneNumberPopover.js - dialog for requesting phone number when address does not contain one
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var countryCode = args.countryCode;
var message = args.message;
var phoneNumber = args.phoneNumber;
var title = args.title;

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.phone_number.addEventListener('return', continueSubmit);

$.confirm_button.addEventListener('click', continueSubmit);

$.cancel_button.addEventListener('click', dismiss);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    // needed for showCustomDialog
    if (message) {
        $.message.setText(message);
    }
    if (phoneNumber) {
        $.phone_number.setValue(phoneNumber);
    }
    if (title) {
        $.confirm_title.setText(title);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.stopListening();
    $.phone_number.removeEventListener('return', continueSubmit);
    $.confirm_button.removeEventListener('click', continueSubmit);
    $.cancel_button.removeEventListener('click', dismiss);
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('addressWithoutPhoneNumber:dismiss');
}

/**
 * continueSubmit - occurs when the dialog needs to be submitted, either by enter or button
 *
 * @api private
 */
function continueSubmit() {
    var phoneNumber = $.phone_number.getValue().trim();
    var phone_regex;
    var regex = Alloy.CFG.regexes.phone[countryCode];
    phone_regex = new RegExp(regex, 'i');

    if (phoneNumber && phoneNumber != '' && phone_regex && phone_regex.test(phoneNumber)) {
        $.phone_error.setText('');
        $.phone_error.setHeight(0);
        $.phone_number_container.setHeight(60);
        $.trigger('addressWithoutPhoneNumber:confirm', {
            phoneNumber : phoneNumber
        });
    } else {
        $.phone_number_container.setHeight(80);
        $.phone_error.setHeight(20);
        $.phone_error.setText(_L('Please provide a valid phone number.'));
    }
}
