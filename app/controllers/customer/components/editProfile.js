// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/editProfile.js - Functions for handling editing of customer profile
 */

//---------------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var showError = require('EAUtils').showError;
var clearError = require('EAUtils').clearError;
var email_regex = new RegExp(Alloy.CFG.regexes.email, 'i');
var logger = require('logging')('customer:components:editProfile', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', closeKeyboards);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.save_button.addEventListener('click', onSaveClick);

$.cancel_button.addEventListener('click', onCancelClick);

//---------------------------------------------------
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
    clearAllErrors();
    Alloy.Models.customer.trigger('fetch', {});
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.save_button.removeEventListener('click', onSaveClick);
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * clearAllErrors - clear all the errors
 * @api private
 */
function clearAllErrors() {
    logger.info('clearAllErrors');
    clearError($.customer_profile_first_name, $.first_name_error, null, null, true);
    clearError($.customer_profile_last_name, $.last_name_error, null, null, true);
}

/**
 * closeKeyboards - close the keyboards
 * @api private
 */
function closeKeyboards() {
    logger.info('closeKeyboards');
    $.customer_profile_first_name.blur();
    $.customer_profile_last_name.blur();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onSaveClick - save button click
 * @api private
 */
function onSaveClick() {
    logger.info('save_button click event handler');
    closeKeyboards();
    clearAllErrors();
    var isValid = true;

    if (!($.customer_profile_first_name.value)) {
        showError($.customer_profile_first_name, $.first_name_error, _L('Please provide a first name.'), true);
        isValid = false;
    }
    if (!($.customer_profile_last_name.value)) {
        showError($.customer_profile_last_name, $.last_name_error, _L('Please provide a last name.'), true);
        isValid = false;
    }

    if (isValid) {
        var params = {
            first_name : $.customer_profile_first_name.value,
            last_name : $.customer_profile_last_name.value
        };

        var promise = currentCustomer.setProfile(params);
        Alloy.Router.showActivityIndicator(promise);
        promise.done(function(model, params, options) {
            notify(_L('Customer profile data successfully saved.'));
            $.edit_customer_profile.fireEvent('route', {
                page : 'profile',
                isCancel : true
            });
        });
    }

    if (!isValid) {
        notify(_L('Please fill in all the required fields.'));
    }
}

/**
 * onCancelClick - cancel button click
 * @api private
 */
function onCancelClick() {
    logger.info('cancel_button click event handler');
    clearAllErrors();
    closeKeyboards();
    $.edit_customer_profile.fireEvent('route', {
        page : 'profile',
        isCancel : true
    });
}
