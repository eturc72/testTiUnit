// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/associatePopover.js - Handles the associate popover
 */

//---------------------------------------------------
// ## VARIABLES

var customerAddress = Alloy.Models.customerAddress;
var currentCustomer = Alloy.Models.customer;
var showCustomerAddressAlert = require('EAUtils').showCustomerAddressAlert;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// logout_button click event listener
$.logout_button.addEventListener('click', onLogoutClick);

// backdrop click event listener
$.backdrop.addEventListener('click', dismiss);

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
    // do nothing - needed for showCustomDialog
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.logout_button.removeEventListener('click', onLogoutClick);
    $.backdrop.removeEventListener('click', dismiss);
    $.stopListening();
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
    $.trigger('associatePopover:dismiss');
}

/**
 * onLogoutClick - tap on Logout associate button
 *
 * @api private
 */
function onLogoutClick() {
    if (currentCustomer.isLoggedIn()) {
        if (customerAddress.isCustomerAddressPage()) {
            showCustomerAddressAlert(true).done(function() {
                logoutCustomerThenAssosciate();
            });
        } else {
            logoutCustomerThenAssosciate();
        }
    } else {
        Alloy.Router.associateLogout();
    }
    dismiss();
}

/**
 * logoutCustomerThenAssosciate - if customer is logged in, logout it first then associate
 *
 * @api private
 */
function logoutCustomerThenAssosciate() {
    Alloy.Router.customerLogout({
        noHomeScreenNavigation : true
    }).done(function() {
        Alloy.Router.associateLogout();
    });
}
