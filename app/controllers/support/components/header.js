// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/components/header.js - Admin Dashboard header with tabs
 */

//---------------------------------------------------
// ## VARIABLES

// Localization constant
var tabTextLength = 16;

var inactiveBackgroundColor = Alloy.Styles.tabs.backgroundColorDisabled;
var activeBackgroundColor = Alloy.Styles.tabs.backgroundColorEnabled;
var inactiveBorderColor = Alloy.Styles.color.border.darker;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.dashboard_configuration_button.addEventListener('click', onDashboardConfigClick);
$.dashboard_settings_button.addEventListener('click', onDashboardSettingsClick);
$.dashboard_payment_terminal_button.addEventListener('click', onPaymentTerminalClick);
$.dashboard_receipt_printer_button.addEventListener('click', onReceiptPrinterClick);
$.dashboard_test_button.addEventListener('click', onTestClick);
$.dashboard_logs_button.addEventListener('click', onLogsClick);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.selectTab = selectTab;
exports.showHeader = showHeader;
exports.hideHeader = hideHeader;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.dashboard_configuration_button.removeEventListener('click', onDashboardConfigClick);
    $.dashboard_settings_button.removeEventListener('click', onDashboardSettingsClick);
    $.dashboard_payment_terminal_button.removeEventListener('click', onPaymentTerminalClick);
    $.dashboard_receipt_printer_button.removeEventListener('click', onReceiptPrinterClick);
    $.dashboard_test_button.removeEventListener('click', onTestClick);
    $.dashboard_logs_button.removeEventListener('click', onLogsClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * selectTab - select the given tab
 *
 * @param {String} tab
 * @api public
 */
function selectTab(tab) {
    inactivateAllTabs();
    switch (tab) {
    case 'configurations':
        selectTabColor($.dashboard_configuration_button);
        break;
    case 'app_config':
        selectTabColor($.dashboard_settings_button);
        break;
    case 'payment_terminal':
        selectTabColor($.dashboard_payment_terminal_button);
        break;
    case 'receipt_printer':
        selectTabColor($.dashboard_receipt_printer_button);
        break;
    case 'test':
        selectTabColor($.dashboard_test_button);
        break;
    case 'logs':
        selectTabColor($.dashboard_logs_button);
        break;
    }
}

/**
 * inactivateAllTabs  - set all tabs to be inactive
 *
 * @api private
 */
function inactivateAllTabs() {
    $.dashboard_configuration_button.setBackgroundColor(inactiveBackgroundColor);
    $.dashboard_settings_button.setBackgroundColor(inactiveBackgroundColor);
    $.dashboard_payment_terminal_button.setBackgroundColor(inactiveBackgroundColor);
    $.dashboard_receipt_printer_button.setBackgroundColor(inactiveBackgroundColor);
    $.dashboard_test_button.setBackgroundColor(inactiveBackgroundColor);
    $.dashboard_logs_button.setBackgroundColor(inactiveBackgroundColor);

    $.dashboard_configuration_button.setBorderColor(inactiveBorderColor);
    $.dashboard_settings_button.setBorderColor(inactiveBorderColor);
    $.dashboard_payment_terminal_button.setBorderColor(inactiveBorderColor);
    $.dashboard_receipt_printer_button.setBorderColor(inactiveBorderColor);
    $.dashboard_test_button.setBorderColor(inactiveBorderColor);
    $.dashboard_logs_button.setBorderColor(inactiveBorderColor);
}

/**
 * selectTabColor  - set the colors for the active tab
 *
 * @param {String} tab
 * @api public
 */
function selectTabColor(tab) {
    tab.setBackgroundColor(activeBackgroundColor);
    tab.setBorderColor(activeBackgroundColor);
}

/**
 * showHeader  - shows the header if authorized
 *
 * @api public
 */
function showHeader() {
    $.button_container.setVisible(true);
    $.button_container.setLayout('horizontal');
    $.button_container.setWidth('100%');
    $.button_container.setHeight('100%');
    $.button_container.setLeft(0);
}

/**
 * hideHeader - hide the header if not authorized
 *
 * @api public
 */
function hideHeader() {
    $.button_container.setVisible(false);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onDashboardConfigClick - shows the configurations tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onDashboardConfigClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'configurations'
    });
}

/**
 * onDashboardSettingsClick - shows the App Settings tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onDashboardSettingsClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'app_config'
    });
}

/**
 * onPaymentTerminalClick - shows the Payment Terminal tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onPaymentTerminalClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'payment_terminal'
    });
}

/**
 * onReceiptPrinterClick - shows the Receipt Printer tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onReceiptPrinterClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'receipt_printer'
    });
}

/**
 * onTestClick - shows the Test tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onTestClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'test'
    });
}

/**
 * onLogsClick - shows the Logs tab
 * of the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function onLogsClick(event) {
    event.cancelBubble = true;
    $.trigger('changeDashboardPage', {
        page : 'logs'
    });
}

//----------------------------------------------
// ## CONSTRUCTOR

// Get rid of unregistered tabs or when running in the simulator
if (!Alloy.CFG.devices.payment_terminal_module) {
    $.dashboard_payment_terminal_button.hide();
    $.dashboard_payment_terminal_button.setWidth(0);
} else {
    var deviceModule = require(Alloy.CFG.devices.payment_terminal_module);
    if (!_.isFunction(deviceModule.getInfoView) && !_.isFunction(deviceModule.getConfigView)) {
        $.dashboard_payment_terminal_button.hide();
        $.dashboard_payment_terminal_button.setWidth(0);
    }
}

if (!Alloy.CFG.devices.printer_module || !Alloy.CFG.printer_availability) {
    $.dashboard_receipt_printer_button.hide();
    $.dashboard_receipt_printer_button.setWidth(0);
}

if ($.dashboard_configuration_button.getTitle().length > tabTextLength || $.dashboard_settings_button.getTitle().length > tabTextLength || $.dashboard_payment_terminal_button.getTitle().length > tabTextLength || $.dashboard_receipt_printer_button.getTitle().length > tabTextLength || $.dashboard_test_button.getTitle().length > tabTextLength || $.dashboard_logs_button.getTitle().length > tabTextLength) {
    $.dashboard_configuration_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.dashboard_settings_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.dashboard_payment_terminal_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.dashboard_receipt_printer_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.dashboard_test_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.dashboard_logs_button.setFont(Alloy.Styles.lineItemLabelFont);
}
