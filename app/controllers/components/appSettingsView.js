// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/appSettingsView.js - Builds a view to display application configuration
 *
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:appSettingsView', getFullControllerPath($.__controllerPath));

var startupOnly = false;
var includeConfigNames = [];

var dropdownList = [];
var eventListeners = [];

var getConfigValue = require('EAUtils').getConfigValue;
var buildStorefrontURL = require('EAUtils').buildStorefrontURL;

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.setScrollingEnabled = setScrollingEnabled;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Boolean} startup (optional)- display only startup config values or not
 * @param {Array} include (optional)- array of config names to include in this view
 *
 * @api public
 */
function init(startup, include) {
    logger.info('init called');
    startupOnly = startup || false;
    includeConfigNames = include || [];
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('render called');
    removeAllChildren($.app_settings);
    return loadConfigs($.app_settings, Alloy.CFG.appSettings);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    _.each(eventListeners, function(event) {
        event.widget.removeEventListener(event.name, event.functionName);
    });
    eventListeners = [];
    dropdownList = [];
    removeAllChildren($.app_settings);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * setScrollingEnabled - will enable or disable scrolling on the container that the
 * app settings are contained in
 *
 * @param {Boolean} enabled scrolling or not
 *
 * @api public
 */
function setScrollingEnabled(enabled) {
    $.app_settings.setScrollingEnabled(enabled);
}

/**
 * loadConfigs - will build the settings view and any subview settings view
 *
 * @param {Ti.UI.View} configView - the view to add these settings to
 * @param {Object} appSettings - where to get the configurations from for the view
 * @param {Boolean} subview - if this is a subview item or a grouping, which will contain subviews
 * @return {Deferred}
 *
 * @api private
 */
function loadConfigs(configView, appSettings, subview) {
    var appSettingsClone = _.extend([], appSettings);

    var deferred = loadConfig(configView, appSettingsClone.shift(), subview);
    var loopdeferred = appSettingsClone.reduce(function(sequence, appSetting) {
        return sequence.then(function() {
            return loadConfig(configView, appSetting, subview);
        });
    }, deferred);
    return loopdeferred;
}

/**
 * loadConfig - will build the view for the current setting and call loadConfigs for any subviews
 *
 * @param {Ti.UI.View} configView - the view to add these settings to
 * @param {Object} appSetting - where to get the configurations from for the view
 * @param {Boolean} subview - if this is a subview item or a grouping, which will contain subviews
 * @return {Deferred} promise
 *
 * @api private
 */
function loadConfig(configView, appSetting, subview) {
    var deferred = new _.Deferred();
    // don't show development items when on production build
    if (appSetting.developmentOnly && Ti.App.deployType === 'production') {
        deferred.resolve();
        return deferred.promise();
    }

    // this is for the startup welcome dialog so that only the startupRequest settings will get shown
    if (startupOnly && !appSetting.startupRequest) {
        deferred.resolve();
        return deferred.promise();
    }

    // if includeConfigNames was passed in then we only want to create view items for those config names specified, ignore the rest
    if (includeConfigNames.length > 0 && includeConfigNames.indexOf(appSetting.configName) < 0) {
        deferred.resolve();
        return deferred.promise();
    }

    // don't show the setting when the config value is false or not set
    if (appSetting.showWhen) {
        var value = getConfigValue(appSetting.showWhen);
        if (!value) {
            deferred.resolve();
            return deferred.promise();
        }
    }

    // this is the case when a setting is a grouping
    if (appSetting.items) {
        logger.info('**section creation');
        if (appSetting.labelID) {
            var label = Ti.UI.createLabel($.createStyle({
                textid : appSetting.labelID,
                accessibilityValue : appSetting.configName + '_heading_label',
                classes : ['heading_label'],
                apiName : 'Label'
            }));
            configView.add(label);
        }
        var groupView = Ti.UI.createView($.createStyle({
            classes : ['group_view', 'bubble_view'],
            apiName : 'View'
        }));
        configView.add(groupView);

        loadConfigs(groupView, appSetting.items, true).always(function() {
            // finally add the description label below the bubble view/setting
            appendDescription(appSetting.descriptionID, appSetting.configName, configView);
            deferred.resolve();
        });
    } else {// we have a setting view to create a component for
        logger.info('*creating component for ' + appSetting.configName);
        var configValue = getConfigValue(appSetting.configName);
        logger.info('  config value ' + configValue);

        var verticalView = Ti.UI.createView($.createStyle({
            classes : ['config_view'],
            apiName : 'View'
        }));
        startupOnly && verticalView.setWidth(Ti.UI.SIZE);

        var enabled = true;
        if (appSetting.depends) {
            var value = getConfigValue(appSetting.depends);
            if (!value) {
                enabled = false;
            }
        }

        var label = Ti.UI.createLabel($.createStyle({
            classes : ['config_label'],
            textid : appSetting.labelID,
            accessibilityValue : appSetting.configName + '_label',
            depends : appSetting.depends,
            apiName : 'Label'
        }));
        if (startupOnly) {
            label.setWidth(Ti.UI.SIZE);
            label.setFont(Alloy.Styles.dialogFont);
        }
        if (!enabled) {
            // give the label a disabled color
            label.setColor(Alloy.Styles.color.text.light);
        }
        verticalView.add(label);

        switch( appSetting.type ) {
        case 'dropdown':
            createDropdown(configValue, appSetting, enabled).always(function(view) {
                verticalView.add(view);
                completeInputSetting(appSetting, verticalView, configView, subview);
                deferred.resolve();
            });
            break;
        case 'number':
        case 'password':
        case 'string':
            // have to set value after adding to view otherwise the text field doesn't show up'
            var inputField = createTextField(['config_value'], appSetting, enabled);
            verticalView.add(inputField);
            inputField.setValue(configValue);
            completeInputSetting(appSetting, verticalView, configView, subview);
            deferred.resolve();
            break;
        case 'boolean':
            var inputField = createSwitch(['switch_value'], appSetting, enabled);
            verticalView.add(inputField);
            inputField.setValue(configValue);
            completeInputSetting(appSetting, verticalView, configView, subview);
            deferred.resolve();
            break;
        default:
            logger.info('No type specified for ' + label);
            deferred.resolve();
        }
    }
    return deferred.promise();
}

/**
 * completeInputSetting - will add the input setting to the view and required symbol if needed
 *
 * @param {Object} appSetting - the app setting config for this input
 * @param {Ti.UI.View} verticalView -  the view to add the required symbol to and to add to config view or bubble view
 * @param {Ti.UI.View} configView - the view to add the input to
 * @param {Boolean} subview - if this is a subview that needs a bubble
 *
 * @api private
 */
function completeInputSetting(appSetting, verticalView, configView, subview) {
    if (appSetting.restartRequired && !startupOnly) {
        label = Ti.UI.createLabel($.createStyle({
            classes : ['star_label'],
            textid : '_RequiredSymbol',
            apiName : 'Label'
        }));
        verticalView.add(label);
    }

    if (subview || startupOnly) {
        configView.add(verticalView);
    } else {
        // For the App Settings tab only and gives a rounded white foreground seperator for the settings, similar to iPad Settings
        var bubbleView = Ti.UI.createView($.createStyle({
            classes : ['bubble_view', 'item_view'],
            apiName : 'View'
        }));
        configView.add(bubbleView);
        bubbleView.add(verticalView);
    }

    appendDescription(appSetting.descriptionID, appSetting.configName, configView);
}

/**
 * appendDescription - will add the description if there is one to the config view
 *
 * @param {String} description - the text id for the description
 * @param {String} configName - the config name to make the accessibilityValue unique
 * @param {Ti.UI.View} configView - the view to add the description to
 *
 * @api private
 */
function appendDescription(description, configName, configView) {
    if (description && !startupOnly) {
        var label = Ti.UI.createLabel($.createStyle({
            classes : ['description_label'],
            accessibilityValue : configName + '_description',
            textid : description,
            apiName : 'Label'
        }));
        configView.add(label);
    }
}

/**
 * createTextField - will create a textfield type input for a setting
 *
 * @param {Array} classes - the class for styling of the view
 * @param {Object} appSetting - settings related to this input
 * @param {Boolean} enabled - if the input is editable or not
 * @return {Object} the input field
 *
 * @api private
 */
function createTextField(classes, appSetting, enabled) {
    var inputField = Ti.UI.createTextField($.createStyle({
        classes : classes,
        apiName : 'TextField',
        configName : appSetting.configName,
        dependency : appSetting.dependency,
        depends : appSetting.depends,
        accessibilityLabel : appSetting.configName + '_TextField',
        editable : enabled,
        restartRequired : appSetting.restartRequired
    }));
    if (appSetting.type === 'password') {
        inputField.setPasswordMask(true);
    }
    if (appSetting.type === 'number') {
        inputField.setKeyboardType(Ti.UI.KEYBOARD_TYPE_NUMBERS_PUNCTUATION);
    }
    if (!enabled) {
        // backgroundDisabledColor only works on android
        inputField.setBackgroundColor(Alloy.Styles.color.background.light);
        inputField.setColor(Alloy.Styles.color.text.light);
    }
    inputField.addEventListener('change', handleChange);
    eventListeners.push({
        widget : inputField,
        name : 'change',
        functionName : handleChange
    });
    return inputField;
}

/**
 * createSwitch - will create a switch type input for a setting
 *
 * @param {Array} classes - the class for styling of the view
 * @param {Object} appSetting - settings related to this input
 * @param {Boolean} enabled - if the input is editable or not
 * @return {Object} the input field
 *
 * @api private
 */
function createSwitch(classes, appSetting, enabled) {
    var inputField = Ti.UI.createSwitch($.createStyle({
        classes : classes,
        apiName : 'Switch',
        configName : appSetting.configName,
        dependency : appSetting.dependency,
        depends : appSetting.depends,
        accessibilityLabel : appSetting.configName + '_Switch',
        editable : enabled,
        restartRequired : appSetting.restartRequired
    }));
    if (!enabled) {
        // backgroundDisabledColor only works on android
        inputField.setBackgroundColor(Alloy.Styles.color.background.light);
        inputField.setColor(Alloy.Styles.color.text.light);
    }
    inputField.addEventListener('change', handleChange);
    eventListeners.push({
        widget : inputField,
        name : 'change',
        functionName : handleChange
    });
    return inputField;
}

/**
 * createDropdown - will create a dropdown for selecting the setting
 *
 * @param {Object} configValue - the value of the setting that will be selected
 * @param {Object} appSetting - settings related to this dropdown
 * @param {Boolean} enabled - if the dropdown is editable or not
 * @return {Deferred}
 *
 * @api private
 */
function createDropdown(configValue, appSetting, enabled) {
    var deferred = new _.Deferred();
    var dropdownOptions;
    if (_.has(appSetting.options, 'storefrontURL')) {

        var http = Ti.Network.createHTTPClient({
            timeout : Alloy.CFG.storefront.timeout,
            validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
        });
        var url = buildStorefrontURL('https', appSetting.options.storefrontURL);
        logger.log('request', 'dropdown request for ' + configValue + ' ' + url);
        http.open('GET', url, true);
        http.onload = function() {
            logger.log('request-success', 'type: GET url: '+url);
            if (http.responseText) {
                logger.secureLog('dropdown request response for ' + appSetting.configName + ' ' + JSON.stringify(http.responseText, null, 2), 'request-response');
                var response = {};
                try {
                    response = JSON.parse(http.responseText);
                    if (_.has(appSetting.options, 'responseRoot') && _.has(response, appSetting.options.responseRoot)) {
                        dropdownOptions = response[appSetting.options.responseRoot];
                    } else {
                        // failure, so show an error message
                        failureMessage(response, appSetting.configName);
                        enabled = false;
                    }
                } catch (ex) {
                    logger.error('cannot parse dropdown request response ' + ex.message);
                    failureMessage(response, appSetting.configName);
                    enabled = false;
                }
            }
            deferred.resolve(continueCreateDropdown(dropdownOptions, configValue, appSetting, enabled));
        };
        http.onerror = function(eResp) {
            logger.error('dropdown error!\n url: ' + url + '\n status: [' + http.status + ']\n response: [' + http.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
            failureMessage(eResp, appSetting.configName);
            deferred.resolve(continueCreateDropdown(dropdownOptions, configValue, appSetting, enabled));
        };
        http.send();
    } else {
        // translate 'labelID' to 'label' in the options as well as convert milliseconds to readable time
        dropdownOptions = _.map(appSetting.options, function(option) {
            var label;
            if (!option.labelID) {
                if (_.isNumber(option.value) && appSetting.optionType == 'milliseconds') {
                    var date = new Date(option.value);
                    var min = date.getUTCMinutes();
                    if (min) {
                        if (min == 1) {
                            label = String.format(_L('%d minute'), min);
                        } else if (min) {
                            label = String.format(_L('%d minutes'), min);
                        }
                    } else {
                        var sec = date.getUTCSeconds();
                        if (sec && sec == 1) {
                            label = String.format(_L('%d second'), sec);
                        } else if (sec) {
                            label = String.format(_L('%d seconds'), sec);
                        } else {
                            label = _L('Invalid');
                        }
                    }
                }
            } else {
                label = L(option.labelID);
            }
            return {
                value : option.value,
                label : label
            };
        });
        deferred.resolve(continueCreateDropdown(dropdownOptions, configValue, appSetting, enabled));
    }
    return deferred.promise();
}

/**
 * continueCreateDropdown - will create a dropdown for selecting the setting
 *
 * @param {Object} dropdownOptions - the values for the dropdown
 * @param {Object} configValue - the value of the setting that will be selected
 * @param {Object} appSetting - settings related to this dropdown
 * @param {Boolean} enabled - if the dropdown is editable or not
 * @return {Ti.UI.View} the view for the dropdown
 *
 * @api private
 */
function continueCreateDropdown(dropdownOptions, configValue, appSetting, enabled) {
    logger.info('dropdownOptions ' + JSON.stringify(dropdownOptions));
    var selectOption = Alloy.createController('components/selectWidget', {
        valueField : 'value',
        textField : 'label',
        values : dropdownOptions,
        messageWhenNoSelection : appSetting.messageWhenNoSelection ? _L(appSetting.messageWhenNoSelection) : _L('Select Option'),
        selectListTitleStyle : {
            accessibilityValue : appSetting.configName + '_dropdown',
            width : 440,
            left : 15,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont
        },
        selectListStyle : {
            width : Ti.UI.SIZE,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont,
            selectedFont : Alloy.Styles.detailValueFont,
            unselectedFont : Alloy.Styles.detailValueFont,
            top : 0
        },
        selectedItem : configValue,
        configName : appSetting.configName,
        applyArgs : true,
        dependency : appSetting.dependency,
        depends : appSetting.depends,
        restartRequired : appSetting.restartRequired
    });
    $.listenTo(selectOption, 'itemSelected', handleDropdownChange);
    selectOption.setEnabled(enabled);
    // trigger the listener
    if (startupOnly) {
        selectOption.updateSelectedItem(configValue);
    }
    dropdownList.push(selectOption);
    return selectOption.getView();
}

/**
 * failureMessage - displays a notify with a failure message depending on response
 *
 * @param {Object} response - the response from the request
 * @param {String} configName - the name of the setting trying to load
 *
 * @api private
 */
function failureMessage(response, configName) {
    var errorMessage = String.format(_L('Unable to load \'%s\'.'), configName);
    if (response && response.fault && response.fault.description) {
        errorMessage = response.fault.description;
    }
    notify(errorMessage, {
        preventAutoClose : true
    });
}

/**
 * handleDependencies - needs to check for depends items in the view
 *
 * @param {String} configName - the name of the config that changed
 * @param {Object} newvalue - the new value of that config
 *
 * @api private
 */
function handleDependencies(configName, newvalue) {
    logger.info('dependency change for ' + configName + ' to ' + newvalue);
    var children = $.app_settings.getChildren();
    checkForDepends(children, configName, newvalue);
}

/**
 * checkForDepends - when a setting changes that is marked as dependency it needs to find the elements
 * that it depends on it and update enablement accordingly.
 *
 * @param {Object} children - the children of the settings
 * @param {String} configName - the name of the config that changed
 * @param {Object} newvalue - the new value of that config
 *
 * @api private
 */
function checkForDepends(children, configName, newvalue) {
    _.each(children, function(child) {
        child.getChildren() && checkForDepends(child.getChildren(), configName, newvalue);
        if (child.depends == configName) {
            logger.info('FOUND ONE');
            if (_.isBoolean(newvalue)) {
                if (child.id == 'hitBox') {
                    // need the controller for the dropdown
                    var dropdown = _.find(dropdownList, function(dropdown) {
                        return dropdown.args.configName === child.configName;
                    });
                    dropdown.setEnabled(newvalue);
                } else {
                    child.setEnabled(newvalue);
                    if (newvalue) {
                        if (child.apiName != 'Ti.UI.Label') {
                            child.setBackgroundColor(Alloy.Styles.color.background.transparent);
                        }
                        child.setColor(Alloy.Styles.color.text.black);
                    } else {
                        if (child.apiName != 'Ti.UI.Label') {
                            child.setBackgroundColor(Alloy.Styles.color.background.light);
                        }
                        child.setColor(Alloy.Styles.color.text.light);
                    }
                }
            }
        }
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleChange occurs when the input value changes
 *
 * @param {Object} event - event data associated with the change
 *
 * @api private
 */
function handleChange(event) {
    logger.info(' value: ' + event.value + ' configName: ' + event.source.configName);
    event.source.dependency && handleDependencies(event.source.configName, event.value);
    $.trigger('setting:change', {
        value : event.value,
        configName : event.source.configName,
        restart : event.source.restartRequired
    });
}

/**
 * handleDropdownChange occurs when the dropdown value changes
 *
 * @param {Object} event - event data associate with the dropdown
 *
 * @api private
 */
function handleDropdownChange(event) {
    if (event && event.item && _.has(event.item, 'value') && event.args && _.has(event.args, 'configName')) {
        logger.info(' value: ' + event.item.value + ' configName: ' + event.args.configName);
        event.args.dependency && handleDependencies(event.args.configName, event.item.value);
        $.trigger('setting:change', {
            value : event.item.value,
            configName : event.args.configName,
            restart : event.args.restartRequired
        });
    }
}

