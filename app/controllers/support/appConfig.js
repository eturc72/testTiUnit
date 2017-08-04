// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/appConfig.js - Settings tab in the Admin Dashboard
 */

//---------------------------------------------------
// ## VARIABLES

var appSettings = require('appSettings');
var eaUtils = require('EAUtils');
var logger = require('logging')('support:appConfig', getFullControllerPath($.__controllerPath));
var changesMade = [];
var warningDisplayed = false;

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.hideActionColumn = hideActionColumn;
exports.showActionColumn = showActionColumn;
exports.showWarning = showWarning;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
    $.apply_changes.addEventListener('click', applyChanges);
    $.email_configs.addEventListener('click', emailConfigs);
    $.clear_changes.addEventListener('click', clearAppSettings);
    $.app_settings_view.init();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('render called');
    $.listenTo($.app_settings_view, 'setting:change', handleChange);
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    changesMade = [];
    // server request is made for stores
    $.app_settings_view.render().always(function() {
        deferred.resolve();
    });
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    changesMade = [];
    // defined in view xml file
    $.apply_changes.removeEventListener('click', applyChanges);
    $.email_configs.removeEventListener('click', emailConfigs);
    $.clear_changes.removeEventListener('click', clearAppSettings);
    $.stopListening($.app_settings_view, 'setting:change', handleChange);
    $.app_settings_view.deinit();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * hideActionColumn - to hide the right column
 *
 * @api public
 */
function hideActionColumn() {
    $.action_column.hide();
}

/**
 * showActionColumn - to show the right column
 *
 * @api public
 */
function showActionColumn() {
    $.action_column.setHeight('100%');
    $.action_column.setWidth('28%');
    $.action_column.setLayout('vertical');
    $.action_column.show();
}

/**
 * showWarning - will display a warning about leaving the tab and not saving changes if there is something to save
 *
 * @return {Deferred} promise
 * @api public
 */
function showWarning() {
    // this could get called again on session timeout when the dialog is already up
    if (warningDisplayed) {
        var deferred = new _.Deferred();
        deferred.resolve();
        return deferred.promise();
    }
    var closeDeferred = new _.Deferred();
    warningDisplayed = true;
    if (changesMade.length == 0) {
        closeDeferred.resolve();
        warningDisplayed = false;
    } else {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('You have modified settings. Are you sure you want to discard the changes?'),
            titleString : _L('Discard Changes'),
            okFunction : function() {
                changesMade = [];
                $.apply_changes.setEnabled(false);
                closeDeferred.resolve();
                warningDisplayed = false;
            },
            cancelFunction : function() {
                closeDeferred.reject();
                warningDisplayed = false;
            }
        });
    }
    return closeDeferred.promise();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleChange - is the event handler for any changes that occur on the appSettingsView
 * @param {Object} event event attributes from the appSettingsView change
 * @api private
 */
function handleChange(event) {
    var oldValue = eaUtils.getConfigValue(event.configName);
    logger.info('Change for configName: ' + event.configName + ' before value: ' + oldValue + ' new value: ' + event.value + ' restart: ' + event.restart);
    // we only want this config name in the changes list once, this is in case they modify something that was already changed before Apply was hit
    var found = _.find(changesMade, function(change) {
        return change.configName == event.configName;
    });
    if (found) {
        var index = changesMade.indexOf(found);
        changesMade.splice(index, 1);
    }
    if (oldValue != event.value) {
        changesMade.push({
            configName : event.configName,
            newValue : event.value,
            restart : event.restart
        });
    }
    $.apply_changes.setEnabled(changesMade.length != 0);
}

/**
 * emailConfigs - will send email to the emails configured on BM of all the app configurations
 *
 * @api private
 */
function emailConfigs() {
    var messageBody = 'Configuration Email:';

    messageBody += '\n\nApplication Configurations:\n\n' + JSON.stringify(Alloy.CFG, null, 4);
    messageBody += '\n\nApplication Information: ';
    ['deployType', 'guid', 'id', 'installId', 'keyboardVisible', 'sessionId', 'version'].forEach(function(key) {
        messageBody += '\n    ' + key + ': ' + Ti.App[key];
    });
    messageBody += '\n\nPlatform Information: ';
    ['architecture', 'availableMemory', 'id', 'locale', 'macaddress', 'ip', 'manufacturer', 'model', 'name', 'netmask', 'osname', 'ostype', 'processorCount', 'runtime', 'username', 'version'].forEach(function(key) {
        messageBody += '\n    ' + key + ': ' + Ti.Platform[key];
    });

    messageBody += '\n\nDisplay Information: ';
    ['density', 'dpi', 'logicalDensityFactor', 'platformHeight', 'platformWidth', 'xdpi', 'ydpi'].forEach(function(key) {
        messageBody += '\n    ' + key + ': ' + Ti.Platform.displayCaps[key];
    });

    eaUtils.emailLogs(messageBody);

    notify(_L('Email of configuration has been sent.'));
}

/**
 * applyChanges - will set the Alloy.CFG settings based on what was changed on the tab
 *
 * @api private
 */
function applyChanges() {
    var restartMessage = false;
    _.each(changesMade, function(change) {
        appSettings.setSetting(change.configName, change.newValue);
        if (change.restart) {
            restartMessage = true;
        }
    });
    notify(_L('Application settings applied.'));
    // if a timeout change occurred this will reset the timeout
    Alloy.eventDispatcher.trigger('session:renew');
    if (restartMessage) {
        Alloy.Dialog.showConfirmationDialog({
            titleString : _L('Logout Required'),
            messageString : _L('Logout Required Text'),
            okButtonString : _L('Logout Now'),
            hideCancel : true,
            okFunction : function() {
                Alloy.Router.associateLogout();
            }
        });
    }
    changesMade = [];
    $.apply_changes.setEnabled(false);
}

/**
 * clearAppSettings - will remove the app settings db so that the welcome dialog will appear at startup
 *
 * @api private
 */
function clearAppSettings() {
    appSettings.clearDB();
    notify(_L('Application settings cleared.'));
    Alloy.Dialog.showConfirmationDialog({
        messageString : _L('A restart is required.'),
        hideCancel : true
    });
}

//----------------------------------------------
// ## CONSTRUCTOR

if (Alloy.CFG.admin_email != null) {
    $.email_address.setValue(Alloy.CFG.admin_email);
    $.email_address.setHeight(Ti.UI.SIZE);
} else {
    $.email_text.setHeight(0);
    $.email_text.setVisible(false);
    $.email_address.setHeight(0);
    $.email_address.setVisible(false);
    $.email_configs.setHeight(0);
    $.email_configs.setVisible(false);
}

if (Ti.App.deployType !== 'production') {
    $.clear_changes_text.setVisible(true);
    $.clear_changes.setVisible(true);
}
