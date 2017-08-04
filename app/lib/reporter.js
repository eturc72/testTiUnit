// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/reporter.js - For reporting javascript errors that occur in the application.  A dialog will be presented to the user for all types of
 * distributions.  Depending on configuration email can be sent to the admin user.
 */

//---------------------------------------------------
// ## VARIABLES

var reporter = exports.reporter = Alloy.CFG.use_crash_reporter ? require('yy.logcatcher') : null;
var eaUtils = require('EAUtils');
var reporting = false;

//---------------------------------------------------
// ## APP LISTENERS

if (reporter) {
    reporter.addEventListener('error', function(error) {
        // prevent this from recursing if there is an issue in this file
        if (!reporting) {
            reporting = true;
            sendReport(error);
        }
    });
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * sendReport - send a report of the error to the server
 *
 * @param {Object} error
 * @param {Object} screenshot
 * @api private
 */
function sendReport(error, screenshot) {
    // In case the error happened while the indicator or popover is up
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    if (Alloy.Dialog) {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'components/errorPopover',
            initOptions : formatMessage(error),
            continueEvent : 'errorPopover:dismiss',
            continueFunction : function(event) {
                // if session timeout occurs we won't have event data
                sendMessage( event ? event.text : null, error);
            }
        });
    } else {
        sendMessage('startup error', error);
    }
}

/**
 * appendMessage - appends appcelerator message and returns message
 *
 * @param {Object} key
 * @param {Object} sourceObject
 * @return {String} message
 * @api private
 */
function appendMessage(key, sourceObject) {
    var newMessage = '';
    if (sourceObject[key]) {
        newMessage = '\n    ' + key + ': ' + sourceObject[key];
    }
    return newMessage;
}

/**
 * formatMessage - formats the error for the user to see in email
 *
 * @param {Object} error
 * @return {String} messageBody
 * @api private
 */
function formatMessage(error) {
    var messageBody = 'Script Errors: ';
    ['type', 'name', 'message', 'backtrace', 'stack', 'line', 'sourceURL'].forEach(function(key) {
        messageBody += appendMessage(key, error);
    });

    messageBody += '\n\nApplication Information: ';
    ['deployType', 'guid', 'id', 'installId', 'keyboardVisible', 'sessionId', 'version'].forEach(function(key) {
        messageBody += appendMessage(key, Ti.App);
    });
    var associate = Alloy.Models.associate;
    if (associate && associate.getEmployeeId()) {
        messageBody += '\n    Associate ID: ' + associate.getEmployeeId();
        messageBody += '\n    Associate Name: ' + associate.getFirstName() + ' ' + associate.getLastName();
    }
    messageBody += '\n    Store ID: ' + Alloy.CFG.store_id;

    messageBody += '\n\nPlatform Information: ';
    ['architecture', 'availableMemory', 'id', 'locale', 'macaddress', 'ip', 'manufacturer', 'model', 'name', 'netmask', 'osname', 'ostype', 'processorCount', 'runtime', 'username', 'version'].forEach(function(key) {
        messageBody += appendMessage(key, Ti.Platform);
    });

    messageBody += '\n\nDisplay Information: ';
    ['density', 'dpi', 'logicalDensityFactor', 'platformHeight', 'platformWidth', 'xdpi', 'ydpi'].forEach(function(key) {
        messageBody += appendMessage(key, Ti.Platform.displayCaps);
    });

    messageBody += '\n';
    return messageBody;
}

/**
 * sendMessage - send the message to the server
 *
 * @param {Object} text
 * @param {Object} error
 * @api private
 */
function sendMessage(text, error) {
    var messageBody = 'An error in the EA app has occurred.';

    if (text) {
        messageBody += '\n\nUser Data: \n' + text;
    }

    messageBody += '\n\n' + formatMessage(error);

    if (Alloy.CFG.error_reporting.js_crash_reporting) {
        eaUtils.sendErrorToServer(messageBody);
        //TODO add support on server side to send screenshot, screenshot.media);
    }
    reporting = false;
}

