// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/testing.js - admin dashboard screen for running model tests
 */

//---------------------------------------------------
// ## VARIABLES

var behaveLogger = require('behaveLoggerExt');

var args = arguments[0] || {};
var testRunning = false;
var emailLogs = require('EAUtils').emailLogs;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'tests:complete', function() {
    testRunning = false;
    $.clear_results.setEnabled(true);
});

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
    // removes all listenTo events
    $.stopListening();
    $.test_names.removeEventListener('click', onTestNameClick);
    // defined in view xml file
    $.clear_results.removeEventListener('click', clearOutput);
    $.email_tests.removeEventListener('click', emailTests);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * logToTestOutput - logs the result of the test
 *
 * @param {String} str
 * @api private
 */
function logToTestOutput(str) {
    $.test_output.setValue($.test_output.value + str);
}

/**
 * initializeTestList - initializes the test list
 *
 * @api private
 */
function initializeTestList() {
    var data = [];
    var tests = Alloy.CFG.support_dashboard_tests;
    for (var i in tests) {
        data.push({
            id : tests[i],
            title : tests[i]
        });
    }

    $.test_names.addEventListener('click', onTestNameClick);
    $.test_names.setData(data);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onTestNameClick - handles the click on the test name
 *
 * @param {Object} event
 * @api private
 */
function onTestNameClick(event) {
    if (testRunning) {
        notify(_L('Test currently in progress'));
        return;
    }

    notify(_L('Starting test execution: ') + event.row.title);
    testRunning = true;
    $.clear_results.setEnabled(false);
    Alloy.eventDispatcher.trigger('tests:run', {
        tests : [event.row.id]
    });
}

/**
 * emailTests - email the tests to the admin
 *
 * @api private
 */
function emailTests() {
    var log = $.test_output.value;
    if (log && log.length > 0) {
        var promise = emailLogs(log);
        Alloy.Router.showActivityIndicator(promise);
        notify(_L('Email of testing log has been sent.'));
    } else {
        notify(_L('Email of testing log was not sent.'));
    }
}

/**
 * clearOutput - clears the output
 *
 * @api private
 */
function clearOutput() {
    $.test_output.setValue('');
    // clear output textarea
}

//----------------------------------------------
// ## CONSTRUCTOR

if (Alloy.CFG.admin_email != null) {
    $.email_address.setValue(Alloy.CFG.admin_email);
    $.email_address.setHeight(Ti.UI.SIZE);
} else {
    $.email_section.setHeight(0);
    $.email_section.setVisible(false);
}

behaveLogger.setLoggerFunction(logToTestOutput);
initializeTestList();
