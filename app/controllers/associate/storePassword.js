// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/associate/storePassword.js - Handles store password changes
 */

//---------------------------------------------------
// ## VARIABLES

var currentAssociate = Alloy.Models.associate;
//Alloy.Router/appIndex may not exist yet (for kiosk mode)
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var logger = require('logging')('associate:storePassword', getFullControllerPath($.__controllerPath));
var EAUtils = require('EAUtils');
var storePasswordHelpers = require('storePasswordHelpers');
// set the height of the authorization so that it lines up with the height of this dialog
var viewHeight = 379;

var args = arguments[0] || {};
// used for kiosk mode after manager has logged in
var isManager = args.isManager || false;

// Localization constant
var errorLabelLength = 60;
var symbolErrorLabelLength = 27;
var symbolButtonTextLength = 9;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.store_password_cancel_button.addEventListener('click', dismiss);
$.change_store_password_button.addEventListener('click', changePassword);
$.current_password.addEventListener('return', changePassword);
$.password.addEventListener('return', changePassword);
$.password_verify.addEventListener('return', changePassword);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT');

    // If they are proactively setting the store password then we may not have fetched the expiration at startup
    var deferred = new _.Deferred();
    if (!Alloy.Models.storeUser) {
        deferred = storePasswordHelpers.checkStorePassword(true);
    } else {
        deferred.resolve();
    }

    deferred.done(function() {
        $.store_subtitle.setText(String.format(_L('Enter current and new password for \'%s\''), Alloy.Models.storeUser.getStoreUsername()));
        // Only let an administrator change the store password without credentials.  If already logged in as administrator then allow change.
        if (currentAssociate.hasAdminPrivileges() || isManager || (getKioskManager() && getKioskManager().hasAdminPrivileges())) {
            displayStorePasswordChange();
        } else {
            displayManagerCredentials();
        }
    });
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT');

    $.toolbar && $.toolbar.deinit();

    $.store_password_cancel_button.removeEventListener('click', dismiss);
    $.change_store_password_button.removeEventListener('click', changePassword);
    $.current_password.removeEventListener('return', changePassword);
    $.password.removeEventListener('return', changePassword);
    $.password_verify.removeEventListener('return', changePassword);

    $.manager_view.deinit();

    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * displayManagerCredentials - display manager credentials view
 *
 * @api private
 */
function displayManagerCredentials() {
    $.store_password.hide();
    $.store_password.setHeight(0);

    var manager = Alloy.createModel('associate');
    $.manager_view.init({
        associate : manager,
        subTitleText : _L('Enter Manager Credentials Store'),
        successMessage : _L('Manager Credentials Accepted'),
        submitFunction : displayStorePasswordChange,
        cancelFunction : dismiss
    });

    $.manager.setHeight(viewHeight);

    var authorizationView = $.manager_view.getView('enter_manager_authorization');
    authorizationView.setHeight(Ti.UI.FILL);
    authorizationView.setWidth(Ti.UI.FILL);
    authorizationView.setLeft(0);
    authorizationView.setTop(0);

    $.manager.show();
}

/**
 * displayStorePasswordChange - display the store password view
 *
 * @api private
 */
function displayStorePasswordChange() {
    $.manager.hide();
    $.manager.setHeight(0);

    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    $.toolbar.setTextFields([$.current_password, $.password, $.password_verify]);

    $.store_password.setHeight(Ti.UI.SIZE);
    $.store_password.show();
}

/**
 * validatePassword - Placeholder function to allow password rules to be added to validate password conforms to
 * acceptance criteria.
 *
 * @param {String} newPassword - given password
 * @api private
 */
function validatePassword(newPassword) {
    // Add logic here to perform minimum password validation logic
    return true;
}

/**
 * renderError - Displays an error message in the change store password window
 *
 * @param text - error message
 * @api private
 */
function renderError(text) {
    if (text.length > errorLabelLength || (EAUtils.isSymbolBasedLanguage() && text.length > symbolErrorLabelLength)) {
        $.store_password_error_label.setFont(Alloy.Styles.smallerCalloutCopyFont);
    } else {
        $.store_password_error_label.setFont(Alloy.Styles.calloutCopyFont);
    }
    $.store_password_error_label.setHeight(Ti.UI.SIZE);
    $.store_password_error_label.setText(text);
    $.store_password_error_label.show();
}

/**
 * changePassword - called when change button is clicked to change the password
 *
 * @api private
 */
function changePassword() {
    $.current_password.blur();
    $.password.blur();
    $.password_verify.blur();

    var currentPassword = $.current_password.getValue();
    var newPassword = $.password.getValue();
    var verifyPassword = $.password_verify.getValue();

    if (newPassword == '' || verifyPassword == '' || currentPassword == '') {
        renderError(_L('All fields must have a password.'));
        clearFields();
        return;
    }

    if (newPassword != verifyPassword) {
        renderError(_L('Passwords do not match'));
        clearFields();
        return;
    }

    if (newPassword === currentPassword) {
        renderError(_L('New password cannot be the same as current password'));
        clearFields();
        return;
    }

    if (!validatePassword(newPassword)) {
        renderError(_L('Password does not meet minimum criteria'));
        clearFields();
        return;
    }

    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    Alloy.Models.storeUser.updateStorePassword(currentPassword, newPassword).done(function() {
        var customObjects = Alloy.createModel('customObjects');
        customObjects.updateStorePasswords(Alloy.Models.storeUser.getStoreUsername(), newPassword).done(function() {
            deferred.resolve();
            dismiss();
            notify(_L('Store password has been changed successfully.'));
        }).fail(function(error) {
            deferred.reject();
            clearFields();
            renderError( error ? error.message : _L('Unable to change the store password for all stores.'));
        });
    }).fail(function(error) {
        deferred.reject();
        clearFields();
        renderError( error ? error.message : _L('Unable to change the store password.'));
    });
}

/**
 * dismiss - trigger the closing of the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('storePassword:dismiss');
}

/**
 * clearFields - clear the input fields of data
 *
 * @api private
 */
function clearFields() {
    $.current_password.setValue('');
    $.password.setValue('');
    $.password_verify.setValue('');
}
