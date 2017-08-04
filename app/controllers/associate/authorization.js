// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/authorization.js - Handles the authorization prompts once already logged in
 */

//---------------------------------------------------
// ## VARIABLES

var appSettings = require('appSettings');
var dialogUtils = require('dialogUtils');
var EAUtils = require('EAUtils');

var checkForAdminPrivileges = true,
    showCancelButton = true;
var postAuthorizationFunction,
    submitFunction,
    cancelFunction;
var associate,
    initConfig,
    successMessage;

// Localization constant
var errorLabelLength = 60;
var symbolErrorLabelLength = 22;

//---------------------------------------------------
// ## UI LISTENERS

$.manager_id.addEventListener('return', validateManager);
$.manager_password.addEventListener('return', validateManager);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.showErrorMessage = showErrorMessage;
exports.clearErrorMessage = clearErrorMessage;
exports.updateLabels = updateLabels;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param config optional dialog configuration object to control behavior. Supplied object can have the following properties:
 *               checkForAdminPrivileges: (default: true) in addition to logging in, will also check if associate has admin privileges.
 *               showCancelButton: (default: true) will show a cancel button in the dialog.
 *               titleText: (default: Manager Authorization) allows for customization of the dialog title.
 *               subTitleText: (default: none) allows for customization of the dialog subtitle.
 *               managerIdHintText: (default: Enter Manager ID) allows for customization of the manager id text box hint text.
 *               managerPasswordHintText: (default: Enter Manager Password) allows for customization of the manager password text box hint text.
 *               submitButtonText: (default: Authorize) allows for customization of the submit button text.
 *               cancelButtonText: (default: Cancel) allows for customization of the cancel button text.
 *               postAuthorizationFunction: (default: none) allows for a function to be executed after associate is logged in and before  they are logged out.
 *               submitFunction: (default: none) used when controller is embedded in another dialog. The function to execute when submit button is clicked.
 *               cancelFunction: (default: none) used when controller is embedded in another dialog. The function to execute when cancel button is clicked.
 *               associate: (default: none) allows an existing associate model object to be supplied and used by the dialog rather than a new one be created.
 *               successMessage: (default: Associate Credentials Accepted) allows a custom message to be displayed in the growl when authorization is successful.
 *
 * @api public
 */
function init(config) {
    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    $.toolbar.setTextFields([$.manager_id, $.manager_password]);

    $.submit_button.addEventListener('click', validateManager);
    $.cancel_button.addEventListener('click', onCancel);

    if (config) {
        if (config.hasOwnProperty('checkForAdminPrivileges')) {
            checkForAdminPrivileges = config.checkForAdminPrivileges;
        }
        if (config.hasOwnProperty('showCancelButton')) {
            showCancelButton = config.showCancelButton;
            if (!showCancelButton) {
                $.cancel_button.setLeft(0);
                $.cancel_button.setWidth(0);
                $.submit_button.setWidth(400);
                $.submit_button.setLeft(3);
                $.cancel_button.setVisible(false);
                $.cancel_button.removeEventListener('click', onCancel);
            }
        }
        if (config.hasOwnProperty('postAuthorizationFunction')) {
            postAuthorizationFunction = config.postAuthorizationFunction;
        }
        if (config.hasOwnProperty('submitFunction')) {
            submitFunction = config.submitFunction;
        }
        if (showCancelButton && config.hasOwnProperty('cancelFunction')) {
            cancelFunction = config.cancelFunction;
        }
        if (config.hasOwnProperty('associate')) {
            associate = config.associate;
        }
        if (config.hasOwnProperty('successMessage')) {
            successMessage = config.successMessage;
        }
    }
    // keep around for lable updates
    initConfig = config;

    // perform after setting up showCancelButton
    updateLabels();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.submit_button.removeEventListener('click', validateManager);
    $.cancel_button.removeEventListener('click', dismiss);
    $.manager_id.removeEventListener('return', validateManager);
    $.manager_password.removeEventListener('return', validateManager);
    $.toolbar && $.toolbar.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showErrorMessage - show an error message in the error field
 *
 * @param message the text of the message to show in the error field
 * @param resetFields flag indicating whether id and password fields should be cleared
 *
 * @api public
 */
function showErrorMessage(message, resetFields) {
    // hide the subtitle message so that the keyboard does not cover up the fields
    if ($.subtitle.getText()) {
        $.subtitle.hide();
        $.subtitle.setHeight(0);
    }

    if (message.length > errorLabelLength || (EAUtils.isSymbolBasedLanguage() && message.length > symbolErrorLabelLength)) {
        $.error.setFont(Alloy.Styles.smallerCalloutCopyFont);
    } else {
        $.error.setFont(Alloy.Styles.calloutCopyFont);
    }

    $.error.setText(message);
    $.error.setHeight(Ti.UI.SIZE);
    $.error.show();
    if (resetFields) {
        $.manager_id.setValue('');
        $.manager_password.setValue('');
    }
}

/**
 * clearErrorMessage - clears the error message in the error field
 *
 * @api public
 */
function clearErrorMessage() {
    $.error.hide();
    $.error.setText('');
    $.error.setHeight(0);

    if ($.subtitle.getText()) {
        $.subtitle.setHeight(Ti.UI.SIZE);
        $.subtitle.show();
    }
}

/**
 * updateLabels- update the labels on the login screen
 * when the language is changed and applied
 *
 * @api public
 */
function updateLabels() {
    if (initConfig && initConfig.hasOwnProperty('titleText')) {
        $.title.setText(initConfig.titleText);
    } else {
        $.title.setText(_L('Manager Authorization'));
    }
    if (initConfig && initConfig.hasOwnProperty('subTitleText')) {
        $.subtitle.setText(initConfig.subTitleText);
        $.subtitle.setHeight(Ti.UI.SIZE);
        $.subtitle.show();
    }
    if (initConfig && initConfig.hasOwnProperty('managerIdHintText')) {
        $.manager_id.setHintText(initConfig.managerIdHintText);
    } else {
        $.manager_id.setHintText(_L('Enter Manager ID'));
    }
    if (initConfig && initConfig.hasOwnProperty('managerPasswordHintText')) {
        $.manager_password.setHintText(initConfig.managerPasswordHintText);
    } else {
        $.manager_password.setHintText(_L('Enter Manager Password'));
    }
    if (initConfig && initConfig.hasOwnProperty('submitButtonText')) {
        $.submit_button.setTitle(initConfig.submitButtonText);
    } else {
        $.submit_button.setTitle(_L('Authorize'));
    }
    if (initConfig && showCancelButton && initConfig.hasOwnProperty('cancelButtonText')) {
        $.cancel_button.setTitle(initConfig.cancelButtonText);
    } else {
        $.cancel_button.setTitle(_L('Cancel'));
    }
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * validateManager - when the user taps apply or hits enter in a field try login
 *
 * @api private
 */
function validateManager() {
    $.manager_password.blur();
    $.manager_id.blur();

    var employee_id = $.manager_id.getValue();
    var passcode = $.manager_password.getValue();
    if (!employee_id || !passcode) {
        showErrorMessage(_L('You must provide employee code and pin.'), false);
        return;
    }

    var deferred = new _.Deferred();
    dialogUtils.showActivityIndicator(deferred);
    var shouldLogout = false;
    var shouldResolve = true;

    // get the permissions for the manager
    if (!associate) {
        associate = Alloy.createModel('associate');
        shouldLogout = true;
    }
    associate.loginAssociate({
        employee_id : employee_id,
        passcode : passcode
    }).done(function(model) {
        var result = checkForAdminPrivileges ? associate.hasAdminPrivileges() : true;
        if (result) {
            notify( successMessage ? successMessage : _L('Associate Credentials Accepted'));

            $.manager_id.setValue('');
            $.manager_password.setValue('');

            var data = {
                result : result,
                associate : associate
            };
            if (postAuthorizationFunction) {
                shouldResolve = false;
                postAuthorizationFunction(this, deferred).done(function() {
                    completionHandler(data, shouldLogout);
                }).always(function() {
                    deferred.resolve();
                });
            } else {
                completionHandler(data, shouldLogout);
            }
        } else {
            showErrorMessage(_L('This manager does not have administrative privileges.'), true);
        }
    }).fail(function(model) {
        if ( model instanceof Backbone.Model && model.has('httpStatus') && model.get('httpStatus') != 200 && model.has('fault')) {
            showErrorMessage(model.get('fault').message, false);
        } else if (model.hasOwnProperty('error') && model.hasOwnProperty('success') && model.success == false) {
            showErrorMessage(model.error, false);
        } else {
            showErrorMessage(_L('Error logging in associate'), false);
        }
        $.manager_password.setValue('');
    }).always(function() {
        if (shouldResolve) {
            deferred.resolve();
        }
    });
}

/**
 * completionHandler - function which handles the complete
 *
 * @param data the data object we are sending to the submitFunction
 * @param shouldLogout flag indicating whether or not we should logout the associate
 *
 * @api private
 */
function completionHandler(data, shouldLogout) {
    dismiss(data);
    if (submitFunction) {
        submitFunction(data);
    }
    if (shouldLogout) {
        associate.logout();
    }
}

/**
 * onCancel - called when the cancel button is pressed
 *
 * @api private
 */
function onCancel() {
    dismiss();
    if (cancelFunction) {
        cancelFunction();
    }
    $.manager_id.setValue('');
    $.manager_password.setValue('');
}

/**
 * dismiss - trigger the closing of the dialog
 *
 * @api private
 */
function dismiss(data) {
    $.trigger('authorization:dismiss', data ? {
        result : data.result,
        associate : data.associate
    } : {
        result : false,
        associate : associate
    });
}

