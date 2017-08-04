// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/EAUtil.js - a collection of useful util-style routines which can be shared across
 * the Endless Aisle application
 */

//---------------------------------------------------
// ## VARIABLES

var analytics = require('analyticsBase');
var logger = require('logging')('utils:EAUtils', 'app/lib/EAUtils');
var numeral = require('alloy/numeral.min');
var countryConfig = require('config/countries').countryConfig;
var currencyConfig = require('config/countries').currencyConfig;
var loadConfigurations = require('appConfiguration').loadConfigurations;
var _s = require('underscore.string');

var _errorFieldHeight = 20;
var _textFieldHeight = 50;

//---------------------------------------------------
// ## PUBLIC API

exports.toCurrency = toCurrency;
exports.buildURLParams = buildURLParams;
exports.returnToShopping = returnToShopping;
exports.returnToShoppingOrCart = returnToShoppingOrCart;
exports.buildStorefrontURL = buildStorefrontURL;
exports.returnToLastSearchOrProduct = returnToLastSearchOrProduct;
exports.history = history;
exports.getConfigValue = getConfigValue;
exports.setConfigValue = setConfigValue;
exports.showError = showError;
exports.showErrorLabelOnly = showErrorLabelOnly;
exports.clearError = clearError;
exports.clearErrorLabelOnly = clearErrorLabelOnly;
exports.removeAllViews = removeAllViews;
exports.countryCodeToCountryName = countryCodeToCountryName;
exports.countryNameToCountryCode = countryNameToCountryCode;
exports.strikeThrough = strikeThrough;
exports.zero = zero;
exports.emailLogs = emailLogs;
exports.sendErrorToServer = sendErrorToServer;
exports.sendSignatureToServer = sendSignatureToServer;
exports.doProductSearch = doProductSearch;
exports.getUIObjectType = getUIObjectType;
exports.showCustomerAddressAlert = showCustomerAddressAlert;
exports.addressVerification = addressVerification;
exports.formatDate = formatDate;
exports.updateLocaleGlobalVariables = updateLocaleGlobalVariables;
exports.verifyAddressEditBeforeNavigation = verifyAddressEditBeforeNavigation;
exports.isSymbolBasedLanguage = isSymbolBasedLanguage;
exports.isLatinBasedLanguage = isLatinBasedLanguage;
exports.appendURL = appendURL;
exports.fetchImagesForProducts = fetchImagesForProducts;
exports.getAddressNickname = getAddressNickname;
exports.getVisibleViewFromContainerView = getVisibleViewFromContainerView;
exports.getConsoleFile = getConsoleFile;
exports.uploadFileToServer = uploadFileToServer;
exports.uploadLogsToServer = uploadLogsToServer;
exports.getAddressStringFromAddressDataOrderAndType = getAddressStringFromAddressDataOrderAndType;
exports.buildRequestUrl = buildRequestUrl;
exports.getCurrencyConfiguration = getCurrencyConfiguration;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * toCurrency - converts number to currency based on country
 *
 * @param {Object} num - the number to convert
 * @return {String} formatted currency value based on the country
 * @api public
 */
function toCurrency(num, currencyCode) {
    var countryConfig = require('config/countries').countryConfig[Alloy.CFG.countrySelected];
    if (!currencyCode) {
        currencyCode = countryConfig.appCurrency;
    }
    numeral.language(currencyConfig[currencyCode].currencyLocale, {
        delimiters : {
            thousands : currencyConfig[currencyCode].delimiters.thousands,
            decimal : currencyConfig[currencyCode].delimiters.decimal
        },
        currency : {
            symbol : currencyConfig[currencyCode].currencySymbol
        }
    });
    numeral.language(currencyConfig[currencyCode].currencyLocale);
    return numeral(num).format(currencyConfig[currencyCode].currencyFormat);
}

/**
 * buildURLParams - builds url params based on json input
 *
 * @param {String} params - string of json to parse for URL params
 * @return {String} that contains the url parameters
 * @api public
 */
function buildURLParams(params) {
    if (!params) {
        return '';
    }
    try {
        var attrs = JSON.parse(params),
            values = [],
            urlParams = '?';
        for (var property in attrs ) {
            values.push(property + '=' + attrs[property]);
        }
        urlParams += values.join('&');
        return urlParams;
    } catch (ex) {
        logger.error('buildURLParams: Unable to parse: "' + params + '"');
        return '';
    }
}

/**
 * returnToShopping - uses the Alloy history mechanism to look for the most recent non-customer event
 * and re-issues the route instructions.
 *
 * @api public
 */
function returnToShopping() {
    // look into the application history and find the most recent non-customer page and go there
    var currentHistory = Alloy.Collections.history;
    var historyLength = currentHistory.length;

    var info = null,
        h,
        route;

    for (var i = (historyLength - 1); i > -1; i--) {
        h = currentHistory.at(i);

        route = h.get('route');

        if (route == 'product_search_result') {
            info = {
                route : route,
                switch_only : true
            };
            break;
        }
        if (route == 'product_detail') {
            info = {
                route : route,
                switch_only : true
            };
            break;
        }

    }
    // Home screen is a special case of product_search that is always valid
    info = info || {
        route : 'product_search_result',
        switch_only : true
    };
    Alloy.Router.navigate(info);
}

/**
 * returnToShoppingOrCart - uses the Alloy history mechanism to look for the most recent non-customer event
 * and re-issues the route instructions.
 *
 * @api public
 */
function returnToShoppingOrCart() {
    // look into the application history and find the most recent non-customer page and go there
    var currentHistory = Alloy.Collections.history;
    var historyLength = currentHistory.length;

    var info = null,
        h,
        route;

    for (var i = (historyLength - 1); i > -1; i--) {
        h = currentHistory.at(i);

        route = h.get('route');

        if (route == 'product_search_result') {
            info = {
                route : route,
                switch_only : true
            };
            break;
        }
        if (route == 'product_detail') {
            info = {
                route : route,
                switch_only : true
            };
            break;
        }
        if (route == 'cart') {
            info = {
                route : route
            };
            break;
        }

    }
    // Home screen is a special case of product_search that is always valid
    info = info || {
        route : 'home'
    };
    Alloy.Router.navigate(info);
}

/**
 * buildStorefrontURL builds the storefront url based on the pipeline and scheme given using the Alloy.CFG related to storefront.
 *
 * @param {String} scheme - http scheme
 * @param {String} pipeline - pipeline portion of URL
 * @return {String} URL
 * @api public
 */
function buildStorefrontURL(scheme, pipeline) {
    return scheme + '://' + Alloy.CFG.storefront_host + Alloy.CFG.storefront.site_url + Alloy.CFG.storefront.locale_url + '/' + pipeline;
}

/**
 * returnToLastSearchOrProduct - uses the Alloy history mechanism to look for the most recent non-customer event
 * and re-issues the route instructions.
 *
 * @parm {String} historyCursor - history cursor
 * @param {String} currentProductId - product id
 * @api public
 */
function returnToLastSearchOrProduct(historyCursor, currentProductId) {
    // look into the application history and find the most recent non-customer page and go there
    var currentHistory = Alloy.Collections.history;
    var historyLength = currentHistory.length;
    historyCursor = historyCursor || historyLength - 1;

    var info = null,
        h,
        route,
        switch_only,
        product_id;

    for (var i = (historyCursor - 1); i > -1; i--) {
        h = currentHistory.at(i);

        var detailsJSON = h.get('details') || '{}';
        var details = JSON.parse(detailsJSON);

        if (details.route == 'product_search_result') {
            if (!details.single_hit) {
                info = _.extend({}, details, {
                    historyCursor : i
                });
                break;
            }
        }
        if (details.route == 'product_detail') {
            if (details.product_id) {
                if (currentProductId && currentProductId == details.product_id) {
                    continue;
                }
                info = {
                    route : details.route,
                    product_id : details.product_id,
                    historyCursor : i
                };
                break;
            }
        }

    }

    if (info && info.route == 'product_search_result') {
        Alloy.Router.navigateToProductSearch({
            switch_only : true
        });
        return;
    }

    // Home screen is a special case of product_search that is always valid
    info = info || {
        route : 'home'
    };
    Alloy.Router.navigate(info);
}

/**
 * history - goes back in history for the number of steps passed in
 *
 * @param {Number} steps
 * @api public
 */
function history(steps) {
    // look into the application history and find the most recent non-customer page and go there
    setps = steps || 0;
    steps = Math.abs(steps);

    var currentHistory = Alloy.Collections.history;
    var historyLength = currentHistory.length;

    if (steps > historyLength) {
        steps = historyLength;
    }

    if (!steps) {
        return;
    }

    var entry = currentHistory.at(historyLength - steps - 1).toJSON();
    Alloy.Router.navigate(entry);
}

/**
 * getConfigValue - Retrieves the configuration value from Alloy.CFG for multiple levels.
 *
 * @param {String} path the path of the config after the Alloy.CFG
 * @param {Object} defaultValue
 * @return {String} string with the value of the config
 * @api public
 */
function getConfigValue(path, defaultValue) {
    if (!path) {
        return;
    };
    var cfgValue = Alloy.CFG,
        segments = path.split('.'),
        defaultValue = defaultValue || null;
    logger.info('getConfigValue for ' + path + ' defaultValue ' + defaultValue);
    _.each(segments, function(key) {
        if (!( key in cfgValue)) {
            cfgValue = defaultValue;
            return cfgValue;
        }
        cfgValue = cfgValue[key];
    });
    logger.info('getConfigValue is ' + cfgValue);
    return cfgValue;
}

/**
 * setConfigValue - Sets the configuration value from Alloy.CFG for multiple levels.
 *
 * @param {String} path - the path of the config after the Alloy.CFG
 * @param {Object} value - the value to set for the configuration
 * @api public
 */
function setConfigValue(path, value) {
    if (!path) {
        return;
    };
    logger.info('setConfigValue for ' + path + ' to ' + value);
    var segments = path.split('.');
    if (segments.length > 1) {
        var configValue = Alloy.CFG;
        for (var i = 0; i < segments.length - 1; i++) {
            configValue = configValue[segments[i]];
        }
        configValue[segments[i++]] = value;
    } else {
        Alloy.CFG[path] = value;
    }
}

/**
 * showError assumes that there are 2 links components: a textField and a (error) label underneath it
 * This routine changes the textField to be pink with a red border and exposes/displays the error message
 *
 * @param {Object} textFieldComponent - text field component
 * @param {Object} labelComponent - label component for error
 * @param {String} errorMessage - error message to show on label
 * @param {Boolean} adjustGrandParentHeight - height for adjustment of view
 * @api public
 */
function showError(textFieldComponent, labelComponent, errorMessage, adjustGrandParentHeight) {
    if (labelComponent && labelComponent.getText() !== errorMessage) {
        textFieldComponent.setBorderColor(Alloy.Styles.color.border.red);
        textFieldComponent.setBackgroundColor(Alloy.Styles.color.background.pink);

        labelComponent.setText(errorMessage);
        labelComponent.setVisible(true);
        labelComponent.setHeight(_errorFieldHeight);

        if (adjustGrandParentHeight) {
            var grandParent = textFieldComponent.getParent().getParent();
            if (grandParent.height && grandParent.height != _textFieldHeight + _errorFieldHeight) {
                grandParent.setHeight(_textFieldHeight + _errorFieldHeight);
            }
        }
    }
}

/**
 * showErrorLabelOnly - assumes that there are 2 links components: a textField or a selectField and a (error) label underneath it .
 * it also assumes that the 2 components are contained in a view which has a height set to Ti.UI.SIZE
 * This routine exposes/displays only the error message
 *
 * @param {Object} labelComponent - label component
 * @param {String} errorMessage - error message to show on label
 * @api public
 */
function showErrorLabelOnly(labelComponent, errorMessage) {
    if (labelComponent.text !== errorMessage) {
        labelComponent.setText(errorMessage);
        labelComponent.setVisible(true);
        labelComponent.setHeight(_errorFieldHeight);
    }
}

/**
 * clearError - assumes that there are 2 links components: a textField and a (error) label underneath it
 * This routine changes the textField to be white with a normal border and hides the error message
 *
 * @param {Object} textFieldComponent - text field component
 * @param {Object} labelComponent - label component with error
 * @param {String} borderColor of the textField
 * @param {String} backgroundColor of the textField
 * @param {Boolean} adjustGrandParentHeight -height for adjustment of view
 * @api public
 */
function clearError(textFieldComponent, labelComponent, borderColor, backgroundColor, adjustGrandParentHeight) {
    if (labelComponent && !_.isEmpty(labelComponent.text)) {
        textFieldComponent.setBorderColor( borderColor ? borderColor : Alloy.Styles.color.border.dark);
        textFieldComponent.setBackgroundColor( backgroundColor ? backgroundColor : Alloy.Styles.color.text.white);

        labelComponent.setText('');
        labelComponent.setVisible(false);
        labelComponent.setHeight(0);

        if (adjustGrandParentHeight) {
            var grandParent = textFieldComponent.getParent().getParent();
            var errorFlags = 0;

            _.each(grandParent.getChildren(), function(child) {
                if (child.getChildren()[1] && child.getChildren()[1].text && child.getChildren()[1].text != '') {++errorFlags;
                }
            });

            if (errorFlags == 0) {
                grandParent.setHeight(_textFieldHeight);
            }
        }
    }
}

/**
 * clearErrorLabelOnly - assumes that there are 2 links components: a textField or a selectField and a (error) label underneath it .
 * it also assumes that the 2 components are contained in a view which has a height set to Ti.UI.SIZE
 * This routine hides only the error message
 *
 * @param {Object} labelComponent
 * @api public
 */
function clearErrorLabelOnly(labelComponent) {
    if (!_.isEmpty(labelComponent.text)) {
        labelComponent.setText('');
        labelComponent.setVisible(false);
        labelComponent.setHeight(0);
    }
}

/**
 * removeAllViews - removes all the child views of the view passed in
 *
 * @param {Object} parentView
 * @api public
 */
function removeAllViews(parentView) {
    _.each(parentView.getChildren(), function(child) {
        parentView.remove(child);
    });
}

/**
 * countryCodeToCountryName - get the country name from the country code
 *
 * @param {Object} country_code
 * @param {String} address type - either shipping, billing or customer
 * @return {String} country name
 * @api public
 */
function countryCodeToCountryName(country_code, addressType) {
    var countries = getGlobalCountries(addressType);
    var result = _.find(countries, function(c) {
        return c.countryCode == country_code;
    });
    // if no country name found, just return the country code
    return result ? result.countryName : country_code;
}

/**
 * countryNameToCountryCode - get the country code from the country name
 *
 * @param {Object} country_name
 * @return {String} country code
 * @api public
 */
function countryNameToCountryCode(country_name, addressType) {
    var countries = getGlobalCountries(addressType);
    var result = _.find(countries, function(c) {
        return c.countryName == country_name;
    });
    // if no country code found, just return the country name
    return result ? result.countryCode : country_name;
}

/**
 * getGlobalCountries - get the global countries based on the address type
 *
 * @param {String} addressType - either shipping, billing or customer
 * @return {Object} countries for given address type
 * @api private
 */
function getGlobalCountries(addressType) {
    var countries;
    if (addressType == 'billing') {
        countries = Alloy.Globals.billingGlobalCountries;
    } else if (addressType == 'shipping') {
        countries = Alloy.Globals.shippingGlobalCountries;
    } else {
        countries = Alloy.Globals.customerGlobalCountries;
    }
    return countries;
}

/**
 * strikeThrough strike through the text for a label
 *
 * @param {Object} the label with the text
 * @param {String} the text to put on the label
 * @api public
 */
function strikeThrough(label, text) {
    var attr = Ti.UI.createAttributedString({
        text : text,
        attributes : [{
            // strikes through text
            type : Ti.UI.ATTRIBUTE_STRIKETHROUGH_STYLE,
            value : Ti.UI.ATTRIBUTE_UNDERLINE_STYLE_SINGLE,
            range : [0, text.length]
        }]
    });
    label.setAttributedString(attr);
}

/**
 * zero - if no value, return 0
 *
 * @param {Object} x
 * @return {Number}
 * @api public
 */
function zero(x) {
    return (x) ? x : 0;
}

/**
 * emailLogs - email app logs
 *
 * @param {String} body - log body to send to admin
 * @param {String} subject - email subject
 * @return {Object} promise
 * @api public
 */
function emailLogs(body, subject) {
    var deferred = new _.Deferred();
    var url = buildStorefrontURL('https', 'EAUtils-EmailConsoleLog');
    var xhr = Ti.Network.createHTTPClient({
        timeout : Alloy.CFG.storefront.timeout,
        validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
    });

    xhr.onload = function(eResp) {

        try {
            var response = JSON.parse(this.responseText);
            if (response.httpStatus == 200) {
                logger.log('request-success', 'emailed logs through server');
                deferred.resolve();
            } else {
                xhr.onerror(eResp);
            }
        } catch(ex) {
            xhr.onerror(eResp);
        }
    };

    // if the call failed, save the signature locally
    xhr.onerror = function(eResp) {
        logger.error('emailLogs error!\n url: ' + url + '\n status: [' + xhr.status + ']\n response: [' + xhr.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
        deferred.reject();
    };

    logger.log('request', 'emailLogs POST ' + url);
    xhr.open('POST', url);
    var data = {
        log : body
    };

    if (subject) {
        data.subject = subject;
    }

    logger.secureLog('emailLogs sending ' + JSON.stringify(data, null, 2), 'request-response');
    xhr.send(data);

    return deferred.promise();
}

/**
 * sendErrorToServer - send an error email to the EA Admin user and log it to server logs
 *
 * @param {String} errorText - error to send to server
 * @api public
 */
function sendErrorToServer(errorText) {
    var url = buildStorefrontURL('https', 'EAUtils-LogAndEmailError');
    var xhr = Ti.Network.createHTTPClient({
        timeout : Alloy.CFG.storefront.timeout,
        validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
    });

    xhr.onload = function() {
        logger.info('emailed error to admin');
    };

    // if the call failed, save the signature locally
    xhr.onerror = function(eResp) {
        logger.error('sendErrorToServer error!\n url: ' + url + '\n status: [' + xhr.status + ']\n response: [' + xhr.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
    };
    logger.log('request', 'sendErrorToServer POST ' + url);
    xhr.open('POST', url);
    var data = {
        errorText : errorText
    };
    logger.secureLog('sendErrorToServer sending ' + JSON.stringify(data, null, 2), 'request-response');
    logger.error('Reporting Error:\n ' + errorText);
    xhr.send(data);

    analytics.fireExceptionEvent({
        description : errorText && errorText.length <= 100 ? errorText : errorText.substring(0, 100),
        fatal : false
    });
}

/**
 * sendSignatureToServer - upload the signature to the server
 *
 * @param {Blob} sigImg
 * @param {String} filename
 * @api public
 */
function sendSignatureToServer(sigImg, filename) {
    // if the call failed, save the signature locally
    uploadFileToServer(sigImg, filename, 'signature').fail(function() {
        var img = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, filename);
        img.write(sigImg);
        logger.error('image ' + filename + ' saved to: ' + img.nativePath);
    });
}

/**
 * doProductSearch - Execute a product search but surround with an activity indicator
 *
 * @param {Object} options
 * @api public
 */
function doProductSearch(options) {
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    Alloy.Models.productSearch.fetch(options).always(function() {
        deferred.resolve();
    });
}

/**
 *
 * getUIObjectType returns the type of UI object
 *
 * @param {Object} Titanium UI object
 * @return {String} object type
 * @api public
 */
function getUIObjectType(UIObject) {
    if (UIObject.getApiName) {
        var UI_ObjectType = UIObject.getApiName().split('.');
        return UI_ObjectType[UI_ObjectType.length - 1];
    } else {
        return typeof UIObject;
    }
}

/**
 * showCustomerAddressAlert - show an alert when potentially navigating away from a editing or adding
 * a customer address
 *
 * @param {Boolean} changePage
 * @return {Deferred} promise
 * @api public
 */
function showCustomerAddressAlert(changePage) {
    var deferred = new _.Deferred();
    var warningMessage = null;
    if (Alloy.Models.customerAddress.isModifyingCustomerAddress()) {
        warningMessage = _L('You are editing an address. Are you sure you want to discard the changes?');
    } else {
        warningMessage = _L('You are adding an address. Are you sure you want to discard the changes?');
    }
    Alloy.Dialog.showConfirmationDialog({
        messageString : warningMessage,
        titleString : _L('Discard Changes'),
        okFunction : function() {
            if (changePage) {
                Alloy.Models.customerAddress.setCurrentPage(null);
                Alloy.Models.customerAddress.setModifyingCurrentAddress(false);
            }
            deferred.resolve();
        },
        cancelFunction : function() {
            deferred.reject();
        }
    });
    return deferred.promise();
}

/**
 * addressVerification - shows the AVS pop over window based on the address verification results.
 *
 * @param {Object} fault - the fault returned from the address server request
 * @param {Object} originalAddress - the original address that was verified and will be used as a basis for update
 * @param {Function} updateFunction - the function to be called after address verification is complete (not cancelled)
 * @param {Object} optionalData - optional data to pass along to the functions
 * @return {Boolean} if fault was handled with dialog
 * @api public
 */
function addressVerification(fault, originalAddress, updateFunction, optionalData) {
    logger.info('AVS verifying address save results');
    var faultHandled = false;
    if (fault && fault.arguments && fault.arguments.statusCode == 'AddressVerificationError') {
        var response = JSON.parse(fault.arguments.statusMessage);
        switch(response.verificationLevel) {
        case 'Recommended':
        case 'InvalidAddress':
            createAVSPopOver(originalAddress, response, updateFunction, optionalData);
            faultHandled = true;
            break;
        default:
            logger.info('AVS invalid response.');
            break;
        }
    }
    return faultHandled;
}

/**
 * createAVSPopOver - used by addressVerification to display AVS popover for selecting address to use that has been found to be invalid
 *
 * @param {String} originalAddress - entered address by user
 * @param {Object} addressVerificationResults - AVS results from the server
 * @param {Function} updateFunction - function to call for updating address
 * @param {Object} optionalData - optional data to be passed to the update function
 * @api private
 */
function createAVSPopOver(originalAddress, addressVerificationResults, updateFunction, optionalData) {
    logger.info('creating AVS popover');

    Alloy.Dialog.showCustomDialog({
        controllerPath : 'components/avsPopover',
        cancelEvent : 'avsPopover:dismiss',
        continueEvent : 'avsPopover:continue',
        initOptions : {
            givenAddress : addressVerificationResults.givenAddress,
            pickListDisplay : addressVerificationResults.pickListDisplay
        },
        continueFunction : function(args) {
            // if session timeout occurs we won't have event data
            if (args && args.selectedAddress) {
                if (args.selectedAddress.address1) {
                    var newAddress = _.extend(originalAddress, {
                        address1 : args.selectedAddress.address1,
                        address2 : args.selectedAddress.address2 ? args.selectedAddress.address2 : '',
                        city : args.selectedAddress.city,
                        state_code : args.selectedAddress.state,
                        postal_code : args.selectedAddress.postalCode
                    });
                    logger.info('AVS selected new address, calling update function');
                    updateFunction ? updateFunction(newAddress, optionalData) : null;
                } else {
                    logger.info('AVS continue with existing address, calling continue function');
                    updateFunction ? updateFunction(originalAddress, optionalData) : null;
                }
            }
        }
    });
}

/**
 *
 * formatDate - returns date as string 'year-month-day:Thh:mm:ss'
 *
 * @param {Object} date - Date object
 * @param {String} time - string formated like 'Thh:mm:ss'
 * @return {String} formatted string
 * @api public
 */
function formatDate(date, time) {
    if (!time) {
        time = 'T23:59:59';
    }
    var d = date,
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) {
        month = '0' + month;
    }
    if (day.length < 2) {
        day = '0' + day;
    }
    return [year, month, day].join('-') + time;
}

/**
 * getVisibleViewFromContainerView - return the currently visible child view inside the container view
 *
 * @param {Object} containerView - container view
 * @return {Object} view - visible view object or null if all children are hidden
 * @api public
 */
function getVisibleViewFromContainerView(containerView) {
    var visibleView = _.find(containerView.getChildren(), function(view) {
        return view.getVisible() == true;
    });
    return visibleView;
}

/**
 * updateLocaleGlobalVariables - set all the global variables when the country is changed
 *
 * @param {String} countrySelected - new country to set config for
 * @return {Boolean} if locale global variables updated
 * @api public
 */
function updateLocaleGlobalVariables(countrySelected) {
    var deferred = new _.Deferred();
    var appSettings = require('appSettings');
    var loadConfigurationPromise = new _.Deferred();
    // Save off old settings in case we need to revert because of a problem
    var oldOcapiSite = Alloy.CFG.ocapi.site_url;
    var oldStorefrontSite = Alloy.CFG.storefront.site_url;
    var countryConfigurations = countryConfig[countrySelected];
    var failure = false;
    // Need to do this to make the request against the new site
    appSettings.setSetting('ocapi.site_url', countryConfigurations.ocapi.site_url);
    appSettings.setSetting('storefront.site_url', countryConfigurations.storefront.site_url);

    var addressform = require('config/address/addressConfig').local_address[countrySelected];

    if (Alloy.CFG.country_configuration && !Alloy.CFG.country_configuration[countrySelected]) {
        loadConfigurations().done(function() {
            // Checking if the price book for the country exist in the configuration on the business manager
            if (!Alloy.CFG.country_configuration[countrySelected] || !Alloy.CFG.country_configuration[countrySelected].list_price_book) {
                loadConfigurationPromise.reject();
                Alloy.Dialog.showAlertDialog({
                    messageString : String.format(_L('Price book mapping missing from Endless Aisle Preferences for the value \'%s\'.'), countrySelected),
                    titleString : _L('Configuration Error')
                });
            } else {
                loadConfigurationPromise.resolve();
            }
        }).fail(function() {
            notify(_L('Unable to load the configurations from the server'), {
                preventAutoClose : true
            });
            loadConfigurationPromise.reject();
        });
    } else {
        loadConfigurationPromise.resolve();
    }

    // wait till the load configuration request is done (if requested) before checking configuration
    loadConfigurationPromise.done(function() {
        // Checking if the country exist in the addressConfig.js
        if (addressform == null) {
            failure = true;
            Alloy.Dialog.showAlertDialog({
                messageString : String.format(_L('Please add the address configuration for the %s in addressConfig.js'), countryConfigurations.value),
                titleString : _L('Configuration Error')
            });
        }

        // Checking if the appCurrency definition is there in currencyConfig
        if (currencyConfig[countryConfigurations.appCurrency] === undefined) {
            failure = true;
            Alloy.Dialog.showAlertDialog({
                messageString : String.format(_L('Please add the currency configuration for the \'%s\' in currencyConfig'), countryConfigurations.appCurrency),
                titleString : _L('Configuration Error')
            });
        }

        if (failure) {
            // reset back to previous setting
            appSettings.setSetting('ocapi.site_url', oldOcapiSite);
            appSettings.setSetting('storefront.site_url', oldStorefrontSite);
            deferred.reject();
        } else {
            // set everything after the validations pass
            appSettings.setSetting('addressform', addressform);
            appSettings.setSetting('appCurrency', countryConfigurations.appCurrency);

            // Don't set these until everything has passed
            appSettings.setSetting('country', countryConfigurations.value);

            // resolving the promise as all the validations above has passed
            deferred.resolve();
        }
    }).fail(function() {
        // reset back to previous setting
        appSettings.setSetting('ocapi.site_url', oldOcapiSite);
        appSettings.setSetting('storefront.site_url', oldStorefrontSite);
        deferred.reject();
    });

    return deferred.promise();

}

/**
 * verifyAddressEditBeforeNavigation - verify if associate is not editing customer address before navigating away
 *
 * @param {Function} navigate - Navigation function call
 * @api public
 */
function verifyAddressEditBeforeNavigation(navigate) {
    if (Alloy.Models.customer.isLoggedIn() && Alloy.Models.customerAddress.isCustomerAddressPage()) {
        logger.info('Customer is logged in and customer is adding/modifying address');
        showCustomerAddressAlert(true).done(function() {
            if (_.isFunction(navigate)) {
                navigate();
            }
        });

    } else {
        logger.info('Customer is not logged in');
        if (_.isFunction(navigate)) {
            navigate();
        }
    }
}

/**
 * buildRequestUrl - build the request url
 *
 * @param {String} endPointName
 * @param {Object} params
 *
 * @return {String} url
 *
 * @api public
 */
function buildRequestUrl(endPointName, params) {
    var url = endPointName;
    _.each(params, function(value, key) {
        if (url.indexOf('?') == -1) {
            url += '?' + key + '=' + value;
        } else {
            url += '&' + key + '=' + value;
        }
    });
    return url;
}

/**
 * isSymbolBasedLanguage - to check whether the language is symbol based
 *
 * @return {Boolean} if symbol language or not
 * @api public
 */
function isSymbolBasedLanguage() {
    var locale = Alloy.CFG.ocapi.default_locale;
    if (_s.startsWith(locale, 'ja') || _s.startsWith(locale, 'zh')) {
        return true;
    } else {
        return false;
    }
}

/**
 * isLatinBasedLanguage - to check whether the language is latin based
 *
 * @return {Boolean} if latin based language or not
 * @api public
 */
function isLatinBasedLanguage() {
    var locale = Alloy.CFG.ocapi.default_locale;
    if (_s.startsWith(locale, 'de') || _s.startsWith(locale, 'fr')) {
        return true;
    } else {
        return false;
    }
}

/**
 * appendURL - append the parameter in the url
 *
 * @param {Object} url to append delimeter to
 * @param {key} name of the parameter
 * @param {value} value of the parameter
 *
 * @return {String} url with new parameter if it does not exist
 * @api public
 */
function appendURL(url, key, value) {
    if (url.indexOf(key + '=') < 0) {
        if (url.indexOf('?') > -1) {
            url += '&';
        } else {
            url += '?';
        }
        url += key + '=' + encodeURIComponent(value);
    }
    return url;
}

/**
 * fetchImagesForProducts - fetch the images for a table of product line items and update that table
 *
 * @param {Object} plis - product line items
 * @param {Object} table - table for items
 * @param {Boolean} hideButtons - flag for hiding buttons
 * @param {Object} order
 * @return {Deferred} promise
 * @api public
 */
function fetchImagesForProducts(plis, table, hideButtons, order) {
    var orderCurrency;
    if (order) {
        orderCurrency = {
            currency : order.getCurrency()
        };
    }
    var products = Alloy.createCollection('product');
    var ids = [];
    var deferred = new _.Deferred();
    _.each(plis, function(pli) {
        ids.push(encodeURIComponent(pli.getProductId()));
    });
    products.setIds(ids);
    products.fetchModels(orderCurrency).done(function() {
        _.each(plis, function(pli, index) {
            var product = _.find(products.models, function(product) {
                return product.getId() == pli.getProductId();
            });
            // In case there are a large number of images for a product, then we may need to make a request for the type of image we need.
            product.ensureImagesLoaded('cart').done(function() {
                table.getSections()[0].getRows()[index].update.apply(this, [product, pli, index < plis.length - 1, hideButtons, order ? order : '']);
                if (index == plis.length - 1) {
                    deferred.resolve();
                }
            });
        });
    }).fail(function() {
        deferred.reject();
    });
    return deferred.promise();
}

/**
 * getAddressNickname - a consistent nickname to use combining city and state code
 *
 * @param {String} city
 * @param {String} stateCode
 * @return {String} format for address nickname
 * @api public
 */
function getAddressNickname(city, stateCode) {
    return city + ( stateCode ? ' ' + stateCode : '');
}

/**
 * getConsoleFile - get log file
 * @return {Object} file
 * @api public
 */
function getConsoleFile() {
    return Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'console.log');
}

/**
 * uploadFileToServer - upload a file to the server
 *
 * @param {Blob} blob
 * @param {String} filename
 * @param {String} filetype - could be log or signature
 * @return {Object} promise
 * @api public
 */
function uploadFileToServer(blob, filename, filetype) {

    var deferred = new _.Deferred();
    var url = buildStorefrontURL('https', 'EAUtils-SaveFile?filename=' + filename + '&filetype=' + filetype);
    var xhr = Ti.Network.createHTTPClient({
        timeout : Alloy.CFG.storefront.timeout
    });

    xhr.onload = function(eResp) {
        try {
            var response = JSON.parse(this.responseText);
            if (response.httpStatus == 200) {
                logger.log('request-success', 'uploading ' + filename + ' loaded to ' + url);
                deferred.resolve();
            } else {
                xhr.onerror(eResp);
            }
        } catch(ex) {
            xhr.onerror(eResp);
        }

    };

    xhr.onerror = function(eResp) {
        logger.error('uploadFileToServer error!\n url: ' + url + '\n status: [' + xhr.status + ']\n response: [' + xhr.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
        deferred.reject();
    };

    logger.log('request', 'uploadFileToServer POST ' + url);
    xhr.open('POST', url);
    var data = {
        file : blob
    };
    xhr.send(data);

    return deferred.promise();
}

/**
 * getCurrencyConfiguration - returns the currency configuration
 * @return {Object}
 * @api public
 */
function getCurrencyConfiguration() {
    return {
        currencyFormat : currencyConfig[Alloy.CFG.appCurrency].currencyFormat,
        currencyLocale : currencyConfig[Alloy.CFG.appCurrency].currencyLocale,
        thousands : currencyConfig[Alloy.CFG.appCurrency].delimiters.thousands,
        decimal : currencyConfig[Alloy.CFG.appCurrency].delimiters.decimal,
        country : countryConfig[Alloy.CFG.countrySelected].value
    };
}

/**
 * uploadLogsToServer - Upload log files to the server
 * @api public
 */
function uploadLogsToServer() {
    var dir = Ti.Filesystem.getFile(Ti.Filesystem.getApplicationDataDirectory(), 'logUploads');
    if (dir.isDirectory()) {
        var fileList = dir.getDirectoryListing();
        _.each(fileList, function(fName) {
            var cFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, 'logUploads/' + fName);

            if (cFile.isFile() && fName.split('.').pop() == 'log') {
                var blob = cFile.read();
                if (blob) {
                    uploadFileToServer(blob, fName, 'log').done(function() {
                        cFile.deleteFile();
                    });
                }
            }
        });
    }
}

/**
 * getAddressStringFromAddressDataOrderAndType - Turn a address data in address string
 * @param  {Object} addressData - JSON address data
 * @param  {Object} addressOrder - Address order
 * @param  {String} addressType - Address type
 * @return {String}
 * @api public
 */
function getAddressStringFromAddressDataOrderAndType(addressData, addressOrder, addressType) {
    var addressLabel = '';
    _.each(addressOrder, function(addressLine, index) {
        var label = '';
        _.each(addressLine, function(addressItem, addressItemIndex) {
            if ( typeof addressItem === 'object') {
                if (addressItem.format && addressItem.field && addressData[addressItem.field]) {
                    label = label + ' ' + String.format(addressItem.format, addressData[addressItem.field]);
                }
            } else {
                if (addressItem === 'country_code') {
                    var countryCode = addressData[addressItem];
                    if (countryCode && typeof countryCode === 'string') {
                        countryCode = countryCode.toUpperCase();
                        if (countryCode.length == 2) {
                            label = label + ' ' + countryCodeToCountryName(countryCode, addressType);
                        } else {
                            label = label + ' ' + addressData[addressItem];
                        }
                    }
                } else {
                    label = (addressData[addressItem] && addressData[addressItem] != 'null') ? label + ' ' + addressData[addressItem] : '';
                }
            }
        });
        if (label.trim() != '') {
            if (addressLabel != '') {
                addressLabel = addressLabel + '\n' + label.trim();
            } else {
                addressLabel = addressLabel + label.trim();
            }
        } else {
            label = '';
        }
    });
    return addressLabel;
}
