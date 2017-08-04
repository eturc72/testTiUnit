// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/associate/login.js - Handles Associate logins
 */

//---------------------------------------------------
// ## VARIABLES

var appSettings = require('appSettings');
var currentAssociate = Alloy.Models.associate;
//Alloy.Router/appIndex may not exist yet
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var logger = require('logging')('associate:login', getFullControllerPath($.__controllerPath));
var countryConfig = require('config/countries').countryConfig;
var languageConfig = require('config/countries').languageConfig;
var EAUtils = require('EAUtils');
var tempCountrySelected;
var tempLanguageSelected;
var tempLanguageOcapiLocale;
var tempLanguageStorefrontLocale;
var viewHeight = 362;
var manager = null;
var payload = null;
var forgotPasswordTimer = null;

// Localization constant
var errorLabelLength = 60;
var symbolErrorLabelLength = 27;
var symbolButtonTextLength = 9;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.employee_code.addEventListener('return', doLogin);
$.employee_pin.addEventListener('return', doLogin);

// login_button click event listener
$.login_button.addEventListener('click', doLogin);

if (Alloy.CFG.show_forgot_password_link) {
    $.forgot_password_label.addEventListener('click', doForgotPassword);

    $.assoc_button.addEventListener('click', validateAssociateExists);
    $.new_password_button.addEventListener('click', changePassword);
    $.success_ok_button.addEventListener('click', resetLoginForm);

    $.assoc_cancel_button.addEventListener('click', resetLoginForm);
    $.new_password_cancel_button.addEventListener('click', resetLoginForm);
}

if (Alloy.CFG.login_change_country_link) {
    // country dropdown event listeners
    $.change_country_label.addEventListener('click', onChangeCountryClick);
    $.country_apply_button.addEventListener('click', onCountryApplyClick);
    $.country_cancel_button.addEventListener('click', resetLoginForm);
}

if (EAUtils.isSymbolBasedLanguage()) {
    $.success_subtitle_label.setFont(Alloy.Styles.detailValueFont);
} else {
    $.success_subtitle_label.setFont(Alloy.Styles.appFont);
}

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options
 * @api public
 */
function init(options) {
    logger.info('INIT');
    $.change_country_label.setHeight(0);
    $.change_country_label.setVisible(Alloy.CFG.login_change_country_link);
    if (Alloy.CFG.login_change_country_link) {
        var countrySelected = Alloy.CFG.countrySelected;
        var displayName = String.format(_L('%s (Change)'), _L(countryConfig[countrySelected].displayName));
        $.storefront_label.setText(_L('Current Country: '));
        $.change_country_label.setText(displayName);
        $.change_country_label.setHeight(Ti.UI.SIZE);
        $.country_dropdown_view.init();
        $.listenTo($.country_dropdown_view, 'country:change', onCountryChange);
        $.country_dropdown_view.updateCountrySelectedItem(countryConfig[countrySelected].value);
        $.language_dropdown_view.init();
        $.language_dropdown_view.populateLanguages(countrySelected);
        $.language_dropdown_view.updateLanguageSelectedItem(countrySelected);
        $.listenTo($.language_dropdown_view, 'language:change', onLanguageChange);
    } else {
        $.storefront_view.setHeight(0);
        $.login_button.setBottom(20);
    }
    $.forgot_password_label.setVisible(Alloy.CFG.show_forgot_password_link);

    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    $.toolbar.setTextFields([$.employee_code, $.employee_pin]);
    if (options && options.employee_id) {
        $.employee_code.setValue(options.employee_id);
        $.employee_pin.setValue('');
    }

    $.associate.hide();
    $.associate.setHeight(0);
    $.manager.hide();
    $.manager.setHeight(0);
    $.new_password.hide();
    $.new_password.setHeight(0);
    $.success.hide();
    $.success.setHeight(0);
    hideCountrySelector();
    if (EAUtils.isSymbolBasedLanguage() && $.assoc_button.getTitle().length > symbolButtonTextLength) {
        $.assoc_button.setFont(Alloy.Styles.calloutCopyFont);
        $.assoc_cancel_button.setFont(Alloy.Styles.calloutCopyFont);
    } else {
        $.assoc_button.setFont(Alloy.Styles.tabFont);
        $.assoc_cancel_button.setFont(Alloy.Styles.tabFont);
    }
    if (EAUtils.isLatinBasedLanguage()) {
        $.assoc_button.setFont(Alloy.Styles.detailTextCalloutFont);
        $.assoc_cancel_button.setFont(Alloy.Styles.detailTextCalloutFont);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT');

    $.toolbar && $.toolbar.deinit();

    $.employee_code.removeEventListener('return', doLogin);
    $.employee_pin.removeEventListener('return', doLogin);

    // login_button click event listener
    $.login_button.removeEventListener('click', doLogin);

    if (Alloy.CFG.show_forgot_password_link) {
        $.forgot_password_label.removeEventListener('click', doForgotPassword);

        $.assoc_button.removeEventListener('click', validateAssociateExists);
        $.new_password_button.removeEventListener('click', changePassword);
        $.success_ok_button.removeEventListener('click', resetLoginForm);

        $.assoc_cancel_button.removeEventListener('click', resetLoginForm);
        $.new_password_cancel_button.removeEventListener('click', resetLoginForm);
    }
    if (Alloy.CFG.login_change_country_link) {
        $.change_country_label.removeEventListener('click', onChangeCountryClick);
        $.country_apply_button.removeEventListener('click', onCountryApplyClick);
        $.country_cancel_button.removeEventListener('click', resetLoginForm);
        $.country_dropdown_view.deinit();
        $.language_dropdown_view.deinit();
    }

    $.manager_view.deinit();

    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * onCountryChange - handles the change in the country selector
 *
 * @api {Object} event
 * @api private
 */
function onCountryChange(event) {
    tempCountrySelected = event.selectedCountry;
    if ($.language_dropdown_view && countryConfig[tempCountrySelected]) {
        $.language_dropdown_view.populateLanguages(tempCountrySelected);
        $.language_dropdown_view.updateLanguageSelectedValue(tempLanguageSelected);
        $.country_apply_button.setEnabled(true);
    } else {
        Alloy.Dialog.showConfirmationDialog({
            messageString : String.format(_L('There is no corresponding key for the value \'%s\' in countryConfig'), tempCountrySelected),
            titleString : _L('Configuration Error'),
            okButtonString : _L('OK'),
            hideCancel : true,
            okFunction : function() {
                return false;
            }
        });
        $.language_dropdown_view.populateLanguages();
        $.country_apply_button.setEnabled(false);
    }

}

/**
 * onLanguageChange - handles the change in the language selector
 *
 * @param {Object} event
 * @api private
 */
function onLanguageChange(event) {
    if (event) {
        tempLanguageSelected = event.selectedLanguage;
        tempLanguageOcapiLocale = event.ocapiLocale;
        tempLanguageStorefrontLocale = event.storefrontLocale;
        $.country_apply_button.setEnabled(true);
    } else {
        $.country_apply_button.setEnabled(false);
    }

}

/**
 * onCountryApplyClick - Change the settings related to the country and language
 *
 * @api private
 */
function onCountryApplyClick() {
    //setting country related global variables
    var promise = EAUtils.updateLocaleGlobalVariables(tempCountrySelected);
    showActivityIndicator(promise);
    promise.done(function() {
        //Setting the language of the application
        Ti.Locale.setLanguage(tempLanguageSelected);
        Alloy.eventDispatcher.trigger('countryChange:selected');

        //setting language related global variables
        appSettings.setSetting('languageSelected', tempLanguageSelected);
        appSettings.setSetting('ocapi.default_locale', tempLanguageOcapiLocale);
        appSettings.setSetting('storefront.locale_url', tempLanguageStorefrontLocale);
        updateLabels();
        appSettings.setSetting('countrySelected', tempCountrySelected);
        hideCountrySelector();
        var displayName = String.format(_L('%s (Change)'), _L(countryConfig[Alloy.CFG.countrySelected].displayName));
        $.storefront_label.setText(_L('Current Country: '));
        $.change_country_label.setText(displayName);

        resetLoginForm();
    });

}

/**
 * onChangeCountryClick - Handles the click on the change Country Label
 *
 * @api private
 */
function onChangeCountryClick() {
    $.country_dropdown_view.updateCountrySelectedItem(countryConfig[Alloy.CFG.countrySelected].value);
    $.language_dropdown_view.updateLanguageSelectedItem(Alloy.CFG.languageSelected);
    showCountrySelector();
}

/**
 * updateLabels- update the labels on the login screen
 * when the language is changed and applied
 *
 * @api private
 */
function updateLabels() {
    $.login_title.setText(_L('Associate Login'));
    $.login_subtitle_label.setText(_L('Enter your credentials'));
    $.employee_code.setHintText(_L('Associate ID'));
    $.employee_pin.setHintText(_L('Password'));
    $.login_button.setTitle(_L('Login'));
    $.forgot_password_label.setText(_L('Forgot Password'));
    $.country_label.setText(_L('Select Country and Language'));
    $.country_cancel_button.setTitle(_L('Cancel'));
    $.country_apply_button.setTitle(_L('Apply'));
    $.assoc_title.setText(_L('Change Password'));
    $.assoc_subtitle_label.setText(_L('Enter Associate ID'));
    $.assoc_code.setHintText(_L('Associate ID'));
    $.assoc_cancel_button.setTitle(_L('Cancel'));
    $.assoc_button.setTitle(_L('Reset Password'));
    $.new_password_title.setText(_L('Change Password'));
    $.new_password_subtitle_label.setText(_L('Enter New Password'));
    $.password.setHintText(_L('Enter New Password'));
    $.password_verify.setHintText(_L('Repeat New Password'));
    $.new_password_cancel_button.setTitle(_L('Cancel'));
    $.new_password_button.setTitle(_L('Change Password'));
    $.success_title.setText(_L('Success'));
    $.success_subtitle_label.setText(_L('Password Successfully Changed'));
    $.success_ok_button.setTitle(_L('OK'));
    $.toolbar && $.toolbar.deinit();
    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    $.toolbar.setTextFields([$.employee_code, $.employee_pin]);
    $.manager_view.updateLabels();
}

/**
 * showCountrySelector - show the country selector
 *
 * @api private
 */
function showCountrySelector() {
    $.country_selector.show();
    $.country_selector.setHeight(viewHeight);
    $.contents.hide();
    $.contents.setHeight(0);
}

/**
 * hideCountrySelector - hide the country selector
 *
 * @api private
 */
function hideCountrySelector() {
    $.country_selector.hide();
    $.country_selector.setHeight(0);
    $.contents.show();
    $.contents.setHeight(Ti.UI.SIZE);
}

/**
 * doLogin - Execute the login functionality
 *
 * @api private
 */
function doLogin() {
    logger.info('doLogin called');
    $.login_button.animate(Alloy.Animations.bounce);
    var employee_code = $.employee_code.getValue();
    var employee_pin = $.employee_pin.getValue();
    // Real data call ...
    if (!employee_code || !employee_pin) {
        renderError(_L('You must provide employee code and pin.'));
        return;
    }
    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    currentAssociate.loginAssociate({
        employee_id : employee_code,
        passcode : employee_pin
    }).done(function() {
        // check for log on behalf of permissions. If there aren't any, don't log into the app
        if (!currentAssociate.getPermissions().allowLOBO) {
            renderError(_L('This associate does not have permission to log on'));
            currentAssociate.clear();
            return;
        }
        setTimeout(function() {
            $.employee_code.setValue('');
            $.employee_pin.setValue('');
            resetError($.login_error_label, $.login_subtitle_label);
        }, 200);

        // remove keyboard
        $.employee_pin.blur();
        $.employee_code.blur();

        $.trigger('login:dismiss', {
            employee_id : employee_code
        });
    }).fail(function(data) {
        var failMsg = _L('Login attempt failed. Re-enter your ID and password.');
        if (data && data.faultDescription) {
            failMsg = data.faultDescription;
        } else if (currentAssociate.get('httpStatus') != 200 && currentAssociate.get('fault')) {
            failMsg = currentAssociate.get('fault').message;
        }
        $.employee_pin.setValue('');
        renderError(failMsg);
    }).always(function() {
        deferred.resolve();
    });
}

/**
 * showPasswordChangedSuccessfully - Display the password successfully changed screen.
 *
 * @api private
 */
function showPasswordChangedSuccessfully() {
    $.success.setHeight(viewHeight);
    $.success.show();
    $.new_password.hide();
    $.new_password.setHeight(0);

    $.password.setValue('');
    $.password_verify.setValue('');
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
 * changePassword - Make the request to change the password.
 *
 * @api private
 */
function changePassword() {
    resetError();

    if ($.password.getValue() == '' || $.password_verify.getValue() == '') {
        renderError(_L('Both fields must have a password'));
        return;
    }

    if ($.password.getValue() != $.password_verify.getValue()) {
        renderError(_L('Passwords do not match'));
        return;
    }

    if (!validatePassword($.password.getValue())) {
        renderError(_L('Password does not meet minimum criteria'));
        return;
    }

    payload.new_password = $.password.getValue();

    if (manager) {
        var deferred = new _.Deferred();
        showActivityIndicator(deferred);
        manager.changePassword(payload).done(function(model) {
            if (model.get('httpStatus') == 200 && model.get('result')) {
                showPasswordChangedSuccessfully();
            } else if (model.get('httpStatus') == 200 && !model.get('result') && model.get('message')) {
                renderError(model.get('message'));
            } else if (model.get('httpStatus') == 200 && !model.get('result')) {
                renderError(_L('Error changing password'));
            }
        }).fail(function(model) {
            if (model.get('httpStatus') != 200 && model.get('fault')) {
                renderError(model.get('fault').message);
            } else {
                renderError(_L('Error changing password'));
            }
        }).always(function() {
            deferred.resolve();
        });
    }
}

/**
 * getAssociateId - Render the associate id request screen and setup a 1 minute timeout.
 *
 * @api private
 */
function getAssociateId() {
    resetError();

    $.associate.setHeight(viewHeight);
    $.associate.show();
    $.manager.hide();
    $.manager.setHeight(0);

    forgotPasswordTimer = setTimeout(function() {
        resetLoginForm();
    }, 60000);
}

/**
 * getNewPassword - Render the new password request screen
 *
 * @api private
 */
function getNewPassword() {
    resetError();

    $.new_password.setHeight(viewHeight);
    $.new_password.show();
    $.associate.hide();
    $.associate.setHeight(0);

    $.assoc_code.setValue('');
}

/**
 * validateAssociateExists - Validates that the given associate id exists before proceeding futher into the forgot password logic.
 *
 * @api private
 */
function validateAssociateExists() {
    if ($.assoc_code.getValue() == '') {
        renderError(_L('The associate ID is required'));
        return;
    }

    resetError();

    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    manager.validateAssociateExists({
        employee_id : 'A' + $.assoc_code.getValue(),
        store_id : Alloy.CFG.store_id
    }).done(function(model) {
        if (model.get('httpStatus') == 200 && !model.get('fault')) {
            payload = {
                employee_id : 'A' + $.assoc_code.value,
                store_id : Alloy.CFG.store_id
            };
            getNewPassword();
        } else if (model.get('httpStatus') != 200 && model.get('fault')) {
            renderError(model.get('fault').message);
        } else {
            renderError(model.get('fault').message);
        }
    }).fail(function(model) {
        if (model.get('httpStatus') != 200 && model.get('fault')) {
            renderError(model.get('fault').message);
        } else {
            renderError(model.get('message'));
        }
    }).always(function() {
        deferred.resolve();
    });
}

/**
 * doForgotPassword - Initiates the forgot password wizard. This function displays the view that requests the
 * associate id to change.
 *
 * @api private
 */
function doForgotPassword() {
    $.manager_view.getView('enter_manager_authorization').setHeight(viewHeight);
    $.manager.setHeight(viewHeight);
    $.manager.show();

    manager = Alloy.createModel('associate');
    $.manager_view.init({
        associate : manager,
        subTitleText : _L('Enter Manager Credentials Password'),
        submitFunction : function(data) {
            if (data && data.result) {
                getAssociateId();
            }
        },
        cancelFunction : function() {
            resetLoginForm();
        }
    });

    var authorizationView = $.manager_view.getView('enter_manager_authorization');
    authorizationView.setLeft(0);
    authorizationView.setTop(0);

    $.contents.hide();
    $.contents.setHeight(0);

    resetError();
}

/**
 * resetLoginForm - Resets the login form back to the main login view with username, password and login button
 *
 * @api private
 */
function resetLoginForm() {
    if (forgotPasswordTimer) {
        clearTimeout(forgotPasswordTimer);
        forgotPasswordTimer = null;
    }

    if (manager && manager.isLoggedIn()) {
        manager.logout().fail(function() {
            if (model.get('httpStatus') != 200 && model.get('fault')) {
                logger.info(model.get('fault').message);
            } else {
                logger.info('Error logging out manager after password change');
            }
        });
    }
    manager = null;
    payload = null;
    $.employee_code.setValue('');
    $.employee_pin.setValue('');
    $.associate.hide();
    $.associate.setHeight(0);
    $.manager.hide();
    $.manager.setHeight(0);
    $.new_password.hide();
    $.new_password.setHeight(0);
    $.success.hide();
    $.success.setHeight(0);
    hideCountrySelector();
    $.assoc_code.setValue('');
    $.password.setValue('');
    $.password_verify.setValue('');
    $.manager_view.clearErrorMessage();
    resetError($.login_error_label, $.login_subtitle_label);
    resetError($.assoc_error_label, $.assoc_subtitle_label);
    resetError($.new_password_error_label, $.new_password_subtitle_label);
}

/**
 * renderError - Displays an error message in the login window, error_label and subtitle_label are optional
 *
 * @api private
 */
function renderError(text, error_label, subtitle_label) {
    logger.info('RENDER ERROR in associate/login');

    if (!error_label && !subtitle_label) {
        if ($.contents.getVisible()) {
            error_label = $.login_error_label;
            subtitle_label = $.login_subtitle_label;
        } else if ($.associate.getVisible()) {
            error_label = $.assoc_error_label;
            subtitle_label = $.assoc_subtitle_label;
        } else if ($.new_password.getVisible()) {
            error_label = $.new_password_error_label;
            subtitle_label = $.new_password_subtitle_label;
        } else {
            return;
        }
    }
    subtitle_label.hide();
    subtitle_label.setHeight(0);

    if (text.length > errorLabelLength || (EAUtils.isSymbolBasedLanguage() && text.length > symbolErrorLabelLength)) {
        error_label.setFont(Alloy.Styles.smallerCalloutCopyFont);
    } else {
        error_label.setFont(Alloy.Styles.calloutCopyFont);
    }
    error_label.setHeight(50);
    error_label.setText(text);
    error_label.show();
}

/**
 * resetError - Resets the login window so that the error message is hidden, arguments are optional
 *
 * @api private
 */
function resetError(error_label, subtitle_label) {
    if (!error_label && !subtitle_label) {
        if ($.contents.getVisible()) {
            error_label = $.login_error_label;
            subtitle_label = $.login_subtitle_label;
        } else if ($.associate.getVisible()) {
            error_label = $.assoc_error_label;
            subtitle_label = $.assoc_subtitle_label;
        } else if ($.new_password.getVisible()) {
            error_label = $.new_password_error_label;
            subtitle_label = $.new_password_subtitle_label;
        } else {
            return;
        }
    }
    error_label.setText('');
    error_label.setHeight(0);
    error_label.hide();
    subtitle_label.show();
    subtitle_label.setHeight(50);
}

