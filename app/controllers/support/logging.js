// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/logging.js - admin dashboard screen for showing log file
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var logger = require('logging')('support:logging', getFullControllerPath($.__controllerPath));
var getConsoleFile = require('EAUtils').getConsoleFile;
var emailLogs = require('EAUtils').emailLogs;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.apply_runtime_cats_btn.addEventListener('click', onApplyRuntimeClick);
$.reload_console_btn.addEventListener('click', onReloadClick);
$.email_log_btn.addEventListener('click', onEmailClick);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.apply_runtime_cats_btn.removeEventListener('click', onApplyRuntimeClick);
    $.reload_console_btn.removeEventListener('click', onReloadClick);
    $.email_log_btn.removeEventListener('click', onEmailClick);
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateEffectiveLoggableCategories- updates the loggable categories
 *
 * @api private
 */
function updateEffectiveLoggableCategories() {
    var eff_cats = getLoggableCategories();
    $.effective_cats.setText(eff_cats.loggableCategories.join(', '));
}

/**
 * readConsoleLog - reloads the console
 *
 *  @api private
 */
function readConsoleLog() {
    var tailLength = 100;
    var file = getConsoleFile();

    if (file && file.exists()) {
        blob = file.read();
        if (blob) {
            var readText = blob.text;
            var consoleText = '';
            var arrayOfLines = readText.match(/[^\r\n]+/g);
            if (arrayOfLines) {
                var start = arrayOfLines.length < tailLength ? 0 : arrayOfLines.length - tailLength;
                for (var i = start; i < arrayOfLines.length; i++) {
                    consoleText += i + ': ' + arrayOfLines[i] + '\n';
                }
            }
            $.console_tail.setText(consoleText);
        }
    }
}


//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onReloadClick - handles the click event on the reload button
 *
 * @api private
 */
function onReloadClick() {
    readConsoleLog();
}

/**
 * onEmailClick - handles the click event on the email button
 *
 * @api private
 */
function onEmailClick() {
    notify(_L('Sending console logs to server'));
    var file = getConsoleFile();
    if (file && file.exists()) {
        var blob = file.read();
        if (blob) {
           var promise = emailLogs(blob.text);
           Alloy.Router.showActivityIndicator(promise);
        }
    } else {
        logger.error('emailLogs: Log file not found');
    }
}

/**
 * onApplyRuntimeClick - handles the click event on the apply button
 *
 * @api private
 */
function onApplyRuntimeClick() {
    var new_value = $.runtime_cats.value;
    // Split by comma
    var new_cats = new_value.split(',');
    // Set runtime value
    setRuntimeLoggableCategories(new_cats);
    // Update UI
    updateEffectiveLoggableCategories();

    readConsoleLog();
}

//----------------------------------------------------
// ## CONSTRUCTOR

updateEffectiveLoggableCategories();

$.email_address.setValue(Alloy.CFG.admin_email ? Alloy.CFG.admin_email : '');
$.email_address.setHeight(Ti.UI.SIZE);

//setting this value to "all" in the UI makes the app log everything
$.runtime_cats.setValue(Alloy.CFG.loggableCategories.join(',') || Alloy.Globals.runtimeLoggableCategories.join(','));
