// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/Validations.js - a collection of utilities used during application startup which validate various server, network, etc connectivity
 */

//---------------------------------------------------
// ## VARIABLES

var buildStorefrontURL = require('EAUtils').buildStorefrontURL;
var logger = require('logging')('application:Validations', 'app/lib/Validations');
var notifyReadDelay = 250;
var notifyDelayStartup = 10000;
var versionErrorDisplayed = false;

//---------------------------------------------------
// ## PUBLIC API

exports.validateAppSettings = validateAppSettings;
exports.validateNetwork = validateNetwork;
exports.validateStorefront = validateStorefront;
exports.validateDevicesStartup = validateDevicesStartup;
exports.validateDevices = validateDevices;

/**
 * validateAppSettings - validates that all the storefront settings the app needs are created and available
 *
 * @return {Deferred} promise
 * @api public
 */
function validateAppSettings() {
    var deferred = new _.Deferred();
    notify(_L('Validating Settings...'), {
        timeout : notifyDelayStartup
    });
    logger.trace('Validating App Settings.');
    var success = false;

    var storefront_host = Alloy.CFG.storefront_host;
    var site_url = Alloy.CFG.ocapi.site_url;
    var base_url = Alloy.CFG.ocapi.base_url;
    var client_id = Alloy.CFG.ocapi.client_id;
    var default_locale = (Alloy.CFG.ocapi.default_locale).replace('-', '_');

    var storefront_url = Alloy.CFG.storefront.site_url;
    var locale_url = Alloy.CFG.storefront.locale_url;

    var storefront_home = Alloy.CFG.storefront_home;

    var store_id = Alloy.CFG.store_id;

    var allow_simulate_payment = Alloy.CFG.allow_simulate_payment;

    if (storefront_host && site_url && base_url && client_id && default_locale && storefront_url && locale_url && storefront_home) {
        logger.info('All application settings are present.');

        success = true;
    } else {
        logger.error('[alloy] All application settings are not present.');
        storefront_host || logger.error('[alloy] Missing storefront host');
        site_url || logger.error('[alloy] Missing site url');
        base_url || logger.error('[alloy] Missing base url');
        client_id || logger.error('[alloy] Missing client id');
        default_locale || logger.error('[alloy] Missing default locale');

        site_url || logger.error('[alloy] Missing site url');
        locale_url || logger.error('[alloy] Missing locale url');

        storefront_home || logger.error('[alloy] Missing storefront home');

        store_id || logger.error('[alloy] Missing store id');

        success = false;
    }
    setTimeout(function() {
        if (success) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }, notifyReadDelay);
    logger.trace('Validating App Settings complete ' + success);
    return deferred.promise();
}

/**
 * validateNetwork - validates that a network connection can be made
 *
 * @return {Deferred}
 * @api public
 */
function validateNetwork() {
    var deferred = new _.Deferred();
    notify(_L('Validating Network...'), {
        timeout : notifyDelayStartup
    });
    logger.trace('Validating Network');

    // Check if you are online or not
    var networkInfo,
        success = false;
    if (Ti.Network.online) {
        networkInfo = _L('Network detected');
        var netType = Ti.Network.networkType;
        switch(netType) {
        case Ti.Network.NETWORK_LAN:
            networkInfo += _L(' Type: LAN');
            break;
        case Ti.Network.NETWORK_WIFI:
            networkInfo += _L(' Type: WIFI');
            break;
        case Ti.Network.NETWORK_MOBILE:
            networkInfo += _L(' Type: MOBILE');
            break;
        case Ti.Network.NETWORK_UNKNOWN:
            networkInfo += _L(' Type: UNKNOWN');
            break;
        }
        success = true;
    } else {
        networkInfo = _L('Network offline');
    }
    notify(networkInfo, {
        timeout : notifyDelayStartup
    });
    setTimeout(function() {
        if (success) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }, notifyReadDelay);
    logger.trace('Validating Network complete ' + success);
    return deferred.promise();
}

/**
 * validateStorefront - validates that all the storefront is alive and available
 *
 * @return {Deferred} promise
 * @api public
 */
function validateStorefront() {
    var deferred = new _.Deferred();
    notify(_L('Validating Storefront...'), {
        timeout : notifyDelayStartup
    });
    logger.trace('Validating Storefront');
    var http = Ti.Network.createHTTPClient({
        timeout : Alloy.CFG.storefront.timeout,
        validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
    });
    // using the Alloy.CFG.devices.validate_url as a test for storefront as the top level of storefront may have a redirect configured
    var validation_url = buildStorefrontURL('https', Alloy.CFG.devices.validate_url);
    logger.log('request', 'validating storefront POST ' + validation_url);
    http.open('POST', validation_url);

    http.onload = function() {
        logger.trace('Validating Storefront complete http.status ' + http.status);
        if (http.responseText) {
            logger.secureLog('validating storefront response ' + JSON.stringify(http.responseText, null, 2), 'request-response');
        }
        if (http.status == 200) {
            deferred.resolve();
        } else {
            deferred.reject(http.responseText);
        }
    };
    http.onerror = function(eResp) {
        logger.error('validateStorefront error!\n url: ' + validation_url + '\n status: [' + http.status + ']\n response: [' + http.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
        deferred.reject(http.responseText);
    };

    setTimeout(function() {
        http.send();
    }, notifyReadDelay);

    return deferred.promise();
}

/**
 * validateDevicesStartup - Validates Tablet and PaymentTerminal at startup
 *
 * @return {Deferred} promise
 * @api public
 */
function validateDevicesStartup() {
    var deferred = new _.Deferred();
    notify(_L('Validating Devices...'), {
        timeout : notifyDelayStartup
    });
    var promise = validateDevices();
    setTimeout(function() {
        promise.done(function() {
            deferred.resolve();
        }).fail(function(responseObject) {
            deferred.reject(responseObject);
        });
    }, notifyReadDelay);
    return deferred.promise();
}

/**
 * validateDevices - Validates Tablet and PaymentTerminal
 *
 * @param Boolean displayError
 * @return {Deferred} promise
 * @api public
 */
function validateDevices(displayError) {
    displayError = displayError || false;
    var deferred = new _.Deferred();
    logger.trace('Validating Devices');
    var toReturn = {};
    toReturn.success = false;
    var macaddress = Ti.Platform.macaddress;
    var ipaddress = Ti.Platform.address;

    //var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
    // use paymentTerminal to obtain the real serial number for customization
    var readerserial = 'placeholder_for_a_real_serial_number';

    var http = Ti.Network.createHTTPClient({
        timeout : Alloy.CFG.storefront.timeout,
        validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
    });

    // build the validation URL based on site preferences
    var validation_url = buildStorefrontURL('https', Alloy.CFG.devices.validate_url);
    logger.log('request', 'validating devices POST ' + validation_url);
    http.open('POST', validation_url);

    var data = {
        store_id : Alloy.CFG.store_id,
        card_reader_serial_number : readerserial,
        tablet_serial_number : macaddress + '||' + ipaddress
    };

    http.onload = function(eResp) {
        if (http.responseText) {
            logger.secureLog('validating devices response ' + JSON.stringify(http.responseText, null, 2), 'request-response');
        }
        if (http.status == 200 && http.responseText) {
            try {
                var response = JSON.parse(http.responseText);
                if (response.httpStatus == 200 && response.valid_device == 'true') {
                    logger.info('comparing server version: ' + response.supported_client_versions + ' with client version: ' + Ti.App.getVersion());
                    Alloy.CFG.server_version = response.server_version ? response.server_version : null;
                    Alloy.CFG.siteCurrency = response.currency_code;
                    Alloy.CFG.supported_client_versions = response.supported_client_versions ? response.supported_client_versions : null;
                    if (response.supported_client_versions && !_.contains(Alloy.CFG.supported_client_versions, Ti.App.getVersion())) {
                        var supported_versions_str = response.supported_client_versions.join(', ');
                        var messageString = String.format(_L('Version Mismatch Error'), Ti.App.getVersion().toString(), response.server_version.toString(), supported_versions_str);
                        toReturn.faultDescription = messageString;
                        if (displayError && !versionErrorDisplayed) {
                            versionErrorDisplayed = true;
                            // In case this happens in the middle of something going on get rid of notify and activity indicators
                            removeNotify();
                            Alloy.eventDispatcher.trigger('hideAuxillaryViews');
                            Alloy.Dialog.showConfirmationDialog({
                                messageString : messageString,
                                titleString : _L('Version Mismatch'),
                                hideCancel : true,
                                okFunction : function() {
                                    versionErrorDisplayed = false;
                                    Alloy.Router.associateLogout();
                                    deferred.reject(toReturn);
                                }
                            });
                        } else {
                            deferred.reject(toReturn);
                        }
                    } else {
                        deferred.resolve();
                    }
                } else {
                    toReturn.faultDescription = response.fault.description;
                    toReturn.type = response.fault.type;
                    if (response.stores) {
                        toReturn.stores = response.stores;
                    }
                    deferred.reject(toReturn);
                }
            } catch (ex) {
                logger.error('cannot parse device validation response: ' + ex.message);
                http.onerror(eResp);
            }
        } else {
            logger.error('invalid validation response: ' + eResp);
            http.onerror(eResp);
        }
    };

    http.onerror = function(eResp) {
        logger.error('validateDevices error!\n url: ' + validation_url + '\n status: [' + http.status + ']\n response: [' + http.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
        toReturn.faultDescription = _L('An error occurred validating the device.');
        toReturn.responseText = http.responseText;
        toReturn.error = eResp.error;
        logger.secureLog('validating devices returning ' + JSON.stringify(toReturn, null, 2));
        deferred.reject(toReturn);
    };

    setTimeout(function() {
        logger.secureLog('validating devices sending ' + JSON.stringify(data, null, 2), 'request-response');
        http.send(data);
    }, notifyReadDelay);

    return deferred.promise();
}
