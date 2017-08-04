// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/confirmation/createAccount.js - create account post checkout for guest checkout
 */

//----------------------------------------------
// ## VARIABLES

var showError = require('EAUtils').showError;
var clearError = require('EAUtils').clearError;
var showErrorLabelOnly = require('EAUtils').showErrorLabelOnly;
var EAUtils = require('EAUtils');
var logger = require('logging')('checkout:confirmation:createAccount', getFullControllerPath($.__controllerPath));
var email_regex = new RegExp(Alloy.CFG.regexes.email, 'i');
var address;
var originalEmailBorderColor = $.email.getBorderColor();
var originalEmailBackgroundColor = $.email.getBackgroundColor();

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.skip_button.addEventListener('click', dismiss);

$.create_button.addEventListener('click', onCreateClick);

$.email.addEventListener('change', validate);
$.email.addEventListener('blur', onBlur);

$.first_name.addEventListener('change', validate);
$.last_name.addEventListener('change', validate);

$.backdrop.addEventListener('click', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;
exports.showErrorMessage = showErrorMessage;
exports.focusFirstField = focusFirstField;
exports.dismiss = dismiss;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('INIT called');
    clearError($.email, $.error_message, originalEmailBorderColor, originalEmailBackgroundColor, false);
    if (args && args.order) {
        var basket = Alloy.createModel('baskets', args.order.toJSON());
        address = basket.getShippingAddress();
        if (address) {
            $.first_name.setValue(address.getFirstName());
            $.last_name.setValue(address.getLastName());
            $.email.setValue(basket.getCustomerEmail());
        }
        validate();
    } else {
        $.skip_button.setTitle(_L('Cancel'));
        if (EAUtils.isSymbolBasedLanguage()) {
            $.save_address_container.setWidth(400);
            $.save_address_label.setWidth(300);
            $.create_account_header_label.setLeft(70);
            $.create_button.setLeft(80);
        } else {
            $.save_address_container.setWidth(300);
            $.save_address_label.setWidth(210);
        }
        $.save_address_label.setText(_L('Login and Shop For Customer'));
        $.save_address_label.setAccessibilityLabel('login_customer_label');
        $.save_address_container.setTop(20);
        $.create_button.setEnabled(false);
        $.skip_button.setAccessibilityValue('account_cancel_button');
        $.save_address_switch.setAccessibilityLabel('login_customer_switch');
    }
    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    $.toolbar.setTextFields([$.first_name, $.last_name, $.email]);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.skip_button.removeEventListener('click', dismiss);
    $.create_button.removeEventListener('click', onCreateClick);
    $.email.removeEventListener('change', validate);
    $.email.removeEventListener('blur', onBlur);
    $.first_name.removeEventListener('change', validate);
    $.last_name.removeEventListener('change', validate);
    $.backdrop.removeEventListener('click', dismiss);
    $.toolbar && $.toolbar.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showErrorMessage - display error message on the dialog
 *
 * @param {String} error
 * @api public
 */
function showErrorMessage(error) {
    var errorMessage;
    if (!error) {
        errorMessage = _L('Error creating account');
    } else {
        switch(Object.prototype.toString.apply(error)) {
        case '[object String]':
            errorMessage = error;
            break;
        case '[object Object]':
            if (error.type === 'InvalidEmailException') {
                showError($.email, $.error_message, _L('Please enter a valid email address.'), false);
                return;
            } else if (error.type) {
                errorMessage = _L(error.type);
            } else if (error.details) {
                errorMessage = error.details.StatusMsg;
            } else {
                errorMessage = error.message;
            }
            break;
        }

    }
    showErrorLabelOnly($.error_message, errorMessage);
}




/**
 * focusFirstField - after the dialog is displayed this is called to focus the name field for entry
 *
 * @api public
 */
function focusFirstField() {
    $.first_name.focus();
}

/**
 * dismiss - trigger the dismiss for the dialog
 *
 * @api public
 */
function dismiss() {
    $.trigger('createAccount:dismiss');
}

/**
 * validateEmailAddress - determine if the email address is valid
 *
 * @api private
 */
function validateEmailAddress() {
    var email = $.email.getValue().trim();
    if (email_regex.test(email)) {
        return true;
    } else {
        return false;
    }
}

/**
 * validate - validates the email address and if lastname and firstname have values to enable create button
 *
 * @api private
 */
function validate() {
    logger.info('validate called');
    var firstName = $.first_name.getValue().trim();
    var lastName = $.last_name.getValue().trim();
    var emailValid = validateEmailAddress();
    $.create_button.setEnabled(emailValid && firstName != '' && lastName != '');
    return emailValid;
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCreateClick - user wants to create the account
 *
 * @api private
 */
function onCreateClick() {
    var valid = validate();
    $.first_name.blur();
    $.last_name.blur();
    $.email.blur();

    if (valid) {
        var customer_info = {
            customer : {
                first_name : $.first_name.getValue(),
                last_name : $.last_name.getValue(),
                email : $.email.getValue(),
                login : $.email.getValue()
            }
        };
        $.trigger('createAccount:create', customer_info, address, $.save_address_switch.getValue());
    }
}

/**
 * onBlur - when field has lost focus check validation
 *
 * @api private
 */
function onBlur() {
    if (validateEmailAddress()) {
        clearError($.email, $.error_message, originalEmailBorderColor, originalEmailBackgroundColor, false);
    } else {
        showError($.email, $.error_message, _L('Please enter a valid email address.'), false);
    }
}
