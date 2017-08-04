// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/welcomePopover.js - Welcome popover message that occurs if the app settings db doesn't exist and we need to save initial settings
 */

//---------------------------------------------------
// ## VARIABLES

var appSettings = require('appSettings');
var loadConfigurations = require('appConfiguration').loadConfigurations;
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var EAUtils = require('EAUtils');
var countryConfig = require('config/countries').countryConfig;
var logger = require('logging')('components:welcomePopover', getFullControllerPath($.__controllerPath));
var changesMade = [];

// clean this out from the user.js settings as they come from the local db or server now
Alloy.CFG.store_id = '';

//-----------------------------------------------------
// ## UI EVENT LISTENERS

// ok button click event listener
$.ok_button.addEventListener('click', onOKClick);

// back button click event listener
$.back_button.addEventListener('click', onBackClick);

// next button click event listener
$.next_button.addEventListener('click', onNextClick);

//---------------------------------------------------
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
    logger.info('INIT called');
    $.app_settings_view.init(true);
    $.app_settings_view.setScrollingEnabled(false);
    $.app_settings_view.render();
    $.welcome_title.setText(L('_Welcome_to_Endless_Aisle'));
    $.startup_config.hide();
    $.startup_config.setHeight(0);
    $.welcome_message.hide();
    $.welcome_message.setHeight(0);
    $.next_button.show();
    $.ok_button.setEnabled(false);
    $.country_dropdown_view.init();
    $.language_dropdown_view.init();
    $.next_button.setEnabled(false);
    $.listenTo($.country_dropdown_view, 'country:change', onCountryChange);
    $.listenTo($.language_dropdown_view, 'language:change', onLanguageChange);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.app_settings_view.deinit();
    $.country_dropdown_view.deinit();
    $.language_dropdown_view.deinit();
    $.ok_button.removeEventListener('click', onOKClick);
    $.back_button.removeEventListener('click', onBackClick);
    $.next_button.removeEventListener('click', onNextClick);
    changesMade = [];
    removeAllChildren($.startup_config);
    kioskSettingsDeinit();
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * kioskSettingsDeinit - cleanup the kiosk_settings view that may have been added
 *
 * @api private
 */
function kioskSettingsDeinit() {
    if ($.kiosk_settings) {
        removeAllChildren($.kiosk_config);
        $.kiosk_settings.deinit();
        $.stopListening($.kiosk_settings, 'setting:change', handleChange);
        $.kiosk_settings = null;
    }
}

/**
 * loadKioskMode - load configs for kiosk mode
 *
 * @api private
 */
function loadKioskMode() {
    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    loadConfigurations().done(function() {
        kioskSettingsDeinit();
        if (Alloy.CFG.kiosk_mode.hasOwnProperty('has_credentials') && Alloy.CFG.kiosk_mode.has_credentials) {
            Alloy.CFG.kiosk_mode.username = '<hidden>';
            $.kiosk_settings = Alloy.createController('components/appSettingsView');
            $.kiosk_config.add($.kiosk_settings.getView());
            $.kiosk_settings.init(true, ['kiosk_mode.enabled']);
            $.kiosk_settings.setScrollingEnabled(false);
            $.listenTo($.kiosk_settings, 'setting:change', handleChange);
            $.kiosk_settings.render().always(function() {
                deferred.resolve();
                $.kiosk_config.setVisible(true);
                $.kiosk_message.setVisible(true);
                $.kiosk_config.setHeight(Ti.UI.SIZE);
                $.kiosk_message.setHeight(Ti.UI.SIZE);
            });
        } else {
            $.kiosk_message.setVisible(false);
            $.kiosk_config.setVisible(false);
            $.kiosk_config.setHeight(0);
            deferred.resolve();
        }
    }).fail(function() {
        deferred.resolve();
        var messageString = _L('Reason: ') + _L('Unable to load application settings.');
        Alloy.Dialog.showConfirmationDialog({
            messageString : messageString,
            titleString : _L('Unable to start the application'),
            okButtonString : _L('Retry'),
            hideCancel : true,
            okFunction : function() {
                removeNotify();
                loadKioskMode();
            }
        });
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onOKClick - handles the ok/continue button click
 *
 * @api private
 */
function onOKClick() {
    _.each(changesMade, function(change) {
        appSettings.setSetting(change.configName, change.newValue);
    });
    $.trigger('welcomePopover:dismiss');

}

/**
 * onBackClick - handles the back button click
 *
 * @api private
 */
function onBackClick() {
    $.welcome_message.setHeight(0);
    $.welcome_message.hide();
    $.startup_config.setHeight(0);
    $.startup_config.hide();
    $.country_message.setHeight(50);
    $.country_message.show();
    $.country_config.setHeight(Ti.UI.SIZE);
    $.country_config.show();
    $.language_config.setHeight(Ti.UI.SIZE);
    $.language_config.show();
    $.country_dropdown_view.updateCountrySelectedItem(Alloy.CFG.countrySelected);
    $.language_dropdown_view.updateLanguageSelectedItem(Alloy.CFG.languageSelected);
}

/**
 * onCountryChange - saves the country selected in the global variable
 * and populates the languages supported for that site.
 *
 * @param {Object} event event attributes from the view changes
 *
 * @api private
 */
function onCountryChange(event) {
    appSettings.setSetting('countrySelected', event.selectedCountry);
    if (countryConfig[Alloy.CFG.countrySelected]) {
        $.language_dropdown_view.populateLanguages(Alloy.CFG.countrySelected);
        $.language_dropdown_view.updateLanguageSelectedValue(Alloy.CFG.languageSelected);
        $.next_button.setEnabled(true);
    } else {
        Alloy.Dialog.showConfirmationDialog({
            messageString : String.format(_L('There is no corresponding key for the value \'%s\' in countryConfig'), Alloy.CFG.countrySelected),
            titleString : _L('Configuration Error'),
            okButtonString : _L('OK'),
            hideCancel : true,
            okFunction : function() {
                return false;
            }
        });
        $.language_dropdown_view.populateLanguages();
        $.next_button.setEnabled(false);
    }
}

/**
 * onLanguageChange - saves the language selected and the ocapi locale
 * in the global variables and enables the next button
 *
 * @param {Object} event attributes from the view changes
 *
 * @api private
 */
function onLanguageChange(event) {
    if (event) {
        Alloy.CFG.languageSelected = event.selectedLanguage;
        Alloy.CFG.language_ocapi_locale = event.ocapiLocale;
        Alloy.CFG.language_storefront_locale = event.storefrontLocale;
        $.next_button.setEnabled(true);
    } else {
        $.next_button.setEnabled(false);
    }

}

/**
 * onNextClick - handles the next button click
 *
 * @api private
 */
function onNextClick() {
    var promise = EAUtils.updateLocaleGlobalVariables(Alloy.CFG.countrySelected);
    showActivityIndicator(promise);
    promise.done(function() {
        $.welcome_message.show();
        $.welcome_message.setHeight(Ti.UI.SIZE);
        $.startup_config.show();
        $.startup_config.setHeight(Ti.UI.SIZE);
        $.country_message.hide();
        $.country_message.setHeight(0);
        $.country_config.hide();
        $.country_config.setHeight(0);
        $.country_message.hide();
        $.language_config.hide();
        $.language_config.setHeight(0);
        appSettings.setSetting('languageSelected', Alloy.CFG.languageSelected);
        //set the language selected in the db
        Ti.Locale.setLanguage(Alloy.CFG.languageSelected);
        appSettings.setSetting('ocapi.default_locale', Alloy.CFG.language_ocapi_locale);
        appSettings.setSetting('storefront.locale_url', Alloy.CFG.language_storefront_locale);
        $.welcome_title.setText(L('_Welcome_to_Endless_Aisle'));
        $.welcome_message.setText(L('_Welcome_Message_'));
        $.change_settings.setText(L('_Welcome_Message_change_later'));
        $.kiosk_message.setText(L('_Welcome_Kiosk_Message_'));
        $.ok_button.setTitle(L('_Continue'));
        $.language_label.setText(L('_Language'));
        $.country_label.setText(L('_Country__'));
        $.country_message.setText(L('_Country_Message_'));
        $.back_button.setTitle(L('_Back'));
        Alloy.eventDispatcher.trigger('countryChange:selected');
        $.listenTo($.app_settings_view, 'setting:change', handleChange);
    });
}

/**
 * handleChange - is when a change occurs on the appSettingsView for startup params
 * Ensures that the setting is only saved out once and only the latest changes are saved
 *
 * @param {Object} event event attributes from the view changes
 * @api private
 */
function handleChange(event) {
    logger.info('Change for configName: ' + event.configName + ' new value: ' + event.value);
    var found = _.find(changesMade, function(change) {
        return change.configName == event.configName;
    });
    if (found) {
        var index = changesMade.indexOf(found);
        changesMade.splice(index, 1);
    }
    changesMade.push({
        configName : event.configName,
        newValue : event.value,
        restart : event.restart
    });
    // Don't let them continue until they select the store id
    if (event.configName == 'store_id') {
        Alloy.CFG.store_id = event.value;
        // username will not be reset if the value is empty from the server as
        // there is no default value from configs to reset to,
        // loadConfigurations call below will get the default value
        delete Alloy.CFG.kiosk_mode.username;
        loadKioskMode();
        $.ok_button.setEnabled(true);
    }
}
