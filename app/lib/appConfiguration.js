// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/appConfiguration.js - This file ensures configurations are loaded in a particular order during startup
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('application:appConfiguration', 'app/lib/appConfiguration');

//---------------------------------------------------
// ## PUBLIC API

exports.loadDefaultConfigs = loadDefaultConfigs;
exports.loadConfigurations = loadConfigurations;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * loadDefaultConfigs - loads the configurations from the app/assets/config directory and applies user configs over top
 *
 * @api public
 */
function loadDefaultConfigs() {
    // Include global configs
    var configFiles = ['config/admin', 'config/main', 'config/product', 'config/productSearch', 'config/devices', 'config/modelTests', 'config/ocapi', 'config/storefront', 'config/category', 'config/analytics', 'config/countries'];
    _.each(configFiles, function(configFile) {
        var configObj = require(configFile);
        _.extend(Alloy.CFG, configObj);
    });

    if (Ti.App.deployType === 'production') {
        Alloy.CFG.ocapi.validate_secure_cert = true;
        Alloy.CFG.storefront.validate_secure_cert = true;
    }

    // Add overridden properties from user.js
    applyUserProperties(require('config/user'), Alloy.CFG);
}

/**
 * loadConfigurations - will load the Alloy.CFG files from server and local db
 *
 * @param {Boolean} startupOnly for loading local settings only for startup (no server requests made)
 * @return {Deferred} promise
 * @api public
 */
function loadConfigurations(startupOnly) {
    var deferred = new _.Deferred();
    logger.info('loadConfigurations called');

    // reset configs to the defaults
    loadDefaultConfigs();

    var appSettings = require('appSettings');
    // need to recall all local db settings because the ocapi url and storefront url could have changed
    appSettings.applyConfig();

    // For test/dev builds, check local web server for dynamic configuration
    // Need to do this twice b/c some settings are needed before loadServerConfiguration is called (to get storefront locale)
    // and after load so that test configurations will not be overridden
    checkForTestConfiguration().always(function() {

        loadServerConfiguration(startupOnly).done(function() {
            // For test/dev builds, check local web server for dynamic configuration
            // These need to override BM settings as automated tests can't change BM settings
            checkForTestConfiguration().always(function() {
                // appSettings db should be the last settings to be applied as they override all other settings
                appSettings.applyConfig();
                verifyAppSettingsDependencies();
                try {
                    if (Alloy.CFG.country_configuration) {
                        Alloy.CFG.country_configuration = JSON.parse(Alloy.CFG.country_configuration);
                    }
                } catch(e) {
                    logger.error('Unable to parse configurationJSON');
                    logger.secureLog('failed to parse proxied object: ' + Alloy.CFG.country_configuration);
                }
                deferred.resolve();
            });
        }).fail(function() {
            deferred.reject();
        });
    });
    return deferred.promise();
}

/**
 * loadServerConfiguration - loads the configuration settings from the storefront
 *
 * @param {Boolean} startupOnly for loading local settings only for startup (no server requests made)
 * @return {Deferred} promise
 * @api private
 */
function loadServerConfiguration(startupOnly) {
    var deferred = new _.Deferred();
    // we haven't validated the storefront yet so we don't want to make a request to the server
    if (startupOnly || !Alloy.CFG.store_id) {
        deferred.resolve();
    } else {
        // Load the configurations from the server
        logger.info('loading server configurations');
        var cfgSettings = Alloy.createModel('cfgSettings');
        cfgSettings.loadServerConfigs(Alloy.CFG.store_id).done(function() {
            var serverSettings = cfgSettings.getSettings();
            if (serverSettings) {
                applyUserProperties(serverSettings, Alloy.CFG);
                if (serverSettings.configuration_json) {
                    logger.info('configuration_json being applied');
                    try {
                        var json = JSON.parse(serverSettings.configuration_json);
                        applyUserProperties(json, Alloy.CFG);
                        deferred.resolve();
                    } catch(ex) {
                        logger.error('Unable to parse configurationJSON');
                        deferred.reject();
                    }
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.resolve();
            }
        }).fail(function() {
            deferred.reject();
        });
    }
    return deferred.promise();
}

/**
 * checkForTestConfiguration - For test/dev builds check configured web server (test_configuration_url) for dynamic configuration.
 * This function allows automated testing systems to load configuration dynamically in order to avoid
 * having to rebuild the application to test different configurations. In production builds, this
 * functionality is disabled.
 *
 * @return {Deferred} promise
 * @api private
 */
function checkForTestConfiguration() {
    var deferred = new _.Deferred();
    if (Alloy.CFG.test_configuration_url && (Ti.App.deployType == 'development' || Ti.App.deployType == 'test')) {
        var http = Ti.Network.createHTTPClient({
            timeout : Alloy.CFG.storefront.timeout
        });
        logger.log('request', 'checkForTestConfiguration GET ' + Alloy.CFG.test_configuration_url);
        http.open('GET', Alloy.CFG.test_configuration_url, true);
        http.onerror = function(eResp) {
            logger.error('checkForTestConfiguration error!\n url: ' + Alloy.CFG.test_configuration_url + '\n status: [' + http.status + ']\n response: [' + http.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
            deferred.reject();
            notify(String.format(_L('Unable to load \'%s\'.'), Alloy.CFG.test_configuration_url), {
                preventAutoClose : true
            });
        };
        http.onload = function() {
            if (http.responseText) {
                try {
                    logger.info('test_configuration_url being applied');
                    applyUserProperties(JSON.parse(http.responseText), Alloy.CFG);
                    logger.secureLog('checkForTestConfiguration response ' + JSON.stringify(http.responseText, null, 2), 'request-response');
                } catch(ex) {
                    logger.error('checkForTestConfiguration error ' + http.responseText);
                }
            }
            deferred.resolve();
        };
        http.send();
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * applyUserProperties - will set the config property into configObj (Alloy.CFG or any sub properties)
 *
 * @param {Object} userConfigObj
 * @param {Object} configObj
 * @api private
 */
function applyUserProperties(userConfigObj, configObj) {
    var userConfigKeys = _.keys(userConfigObj);
    _.each(userConfigKeys, function(key) {
        // ignore these two properties because they are added in by titanium
        if (key == 'id' || key == 'uri') {
            return;
        }
        if (configObj[key] == undefined) {
            configObj[key] = {};
        }
        var userValue = userConfigObj[key];
        if (_.isObject(userValue) && !_.isArray(userValue)) {
            // don't want array objects from the server to be set as objects
            if (!_.isObject(configObj[key])) {
                // ensure the object type is correct in case we moved from 'image_service' string to object
                configObj[key] = {};
            }
            applyUserProperties(userValue, configObj[key]);
        } else {
            configObj[key] = userValue;
        }
    });
}

/**
 * verifyAppSettingsDependencies - This function is called to adjust settings dependencies. All app settings that depend on other app setting(s) should have their logic or function call in this function
 *
 * @api private
 */
function verifyAppSettingsDependencies() {
    if (Alloy.CFG.kiosk_mode.enabled) {
        Alloy.CFG.enable_wish_list = false;
    }
    if (Alloy.CFG.devices.payment_terminal_module === 'webDevice') {
        Alloy.CFG.payment_entry = 'web';
        Alloy.CFG.collect_billing_address = true;
    }
    if (Alloy.CFG.devices.payment_terminal_module === 'adyenDevice') {
        Alloy.CFG.payment_entry = 'default';
        Alloy.CFG.enable_multi_tender_payments = false;
        Alloy.CFG.gift_cards_available = false;
    }
    if (Alloy.CFG.devices.payment_terminal_module === 'verifoneDevice') {
        Alloy.CFG.payment_entry = 'default';
    }
    if (Alloy.CFG.payment_entry === 'web') {
        Alloy.CFG.devices.payment_terminal_module = 'webDevice';
        Alloy.CFG.collect_billing_address = true;
    }
}
