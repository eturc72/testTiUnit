// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/customerPopover.js - Handles the customer popover
 */

//---------------------------------------------------
// ## VARIABLES

var customerAddress = Alloy.Models.customerAddress;
var currentCustomer = Alloy.Models.customer;
var showCustomerAddressAlert = require('EAUtils').showCustomerAddressAlert;
var logger = require('logging')('components:customerPopover', getFullControllerPath($.__controllerPath));

//-----------------------------------------------------
// ## UI EVENT LISTENERS

// logout_button click event listener
$.logout_button.addEventListener('click', onLogoutClick);

// profile_button click event listener
$.profile_button.addEventListener('click', onProfileClick);

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
    $.profile_button.removeEventListener('click', onProfileClick);
    $.backdrop.removeEventListener('click', dismiss);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - close the dialog
 *
 * @api private
 */
function dismiss() {
    logger.info('dismissing dialog');
    $.trigger('customerPopover:dismiss');
}

/**
 * onLogoutClick - tap on logout button for customer
 *
 * @api private
 */
function onLogoutClick() {
    if (currentCustomer.isLoggedIn() && customerAddress.isCustomerAddressPage()) {
        showCustomerAddressAlert(true).done(function() {
            Alloy.Router.customerLogout();
        });
    } else {
        Alloy.Router.customerLogout();
    }
    dismiss();
}

/**
 * onProfileClick - tap on profile button for customer
 *
 * @api private
 */
function onProfileClick() {
    if (currentCustomer.isLoggedIn() && customerAddress.isCustomerAddressPage()) {
        showCustomerAddressAlert(true).done(function() {
            Alloy.Router.navigateToCustomer();
        });
    } else {
        Alloy.Router.navigateToCustomer();
    }
    dismiss();
}
