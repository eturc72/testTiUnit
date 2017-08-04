// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/noPaymentTerminal.js - Controller for displaying a popover indicating the payment terminal cannot be reached
 */

//----------------------------------------------
// ## VARIABLES

var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var logger = require('logging')('checkout:payments:noPaymentTerminal', getFullControllerPath($.__controllerPath));
var bluetoothDevicePickerModule = undefined;

// Localization constant
var latinButtonTextLength = 16;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.ok_button.addEventListener('click', dismiss);

$.test_connection_button.addEventListener('click', verifyDeviceConnection);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;
exports.updateDeviceStatus = updateDeviceStatus;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    $.message.setText(paymentTerminal.getNoDeviceConnectionMessage());
    $.image.setImage(paymentTerminal.getNoDeviceConnectionImage());
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.ok_button.removeEventListener('click', dismiss);
    $.test_connection_button.removeEventListener('click', verifyDeviceConnection);
    if (Alloy.CFG.devices.bluetoothDevicePicker) {
        $.bluetoothDevicePicker.removeEventListener('click', showBluetoothDevicePicker);
        bluetoothDevicePickerModule.removeEventListener('deviceConnected', dismiss);
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateDeviceStatus is called when the device status has changed and this dialog may need to go way on it's own
 * @param {Object} connected
 *
 * @api public
 */
function updateDeviceStatus(connected) {
    if (connected) {
        dismiss();
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dimiss - trigger the dismiss on this dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('noPaymentTerminal:dismiss', {});
}

/**
 * verifyDeviceConnection is triggered when the test connection button is tapped
 *
 * @api private
 */
function verifyDeviceConnection() {
    var message = '';
    var title = _L('Payment Terminal');

    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    // this call will trigger updateDeviceStatus which will close the dialog if needed
    logger.info('checking payment device');
    if (paymentTerminal.verifyDeviceConnection()) {
        message = _L('Connection to payment device was successful.');
    } else {
        message = _L('Unable to connect to payment device.');
        title = _L('Error');
    }

    deferred.resolve();

    Alloy.Dialog.showConfirmationDialog({
        messageString : message,
        titleString : title,
        hideCancel : true
    });
}

/**
 * showBluetoothDevicePicker is triggered when the bluetooth button is tapped (optionally displayed)
 *
 * @api private
 */
function showBluetoothDevicePicker() {
    bluetoothDevicePickerModule.showBluetoothDevicePicker();
}

//---------------------------------------------------
// ## CONSTRUCTOR

if (Alloy.CFG.devices.bluetoothDevicePicker) {
    bluetoothDevicePickerModule = require('com.demandware.ios.bluetoothDevicePicker');
    bluetoothDevicePickerModule.addEventListener('deviceConnected', dismiss);
    $.bluetoothDevicePicker.addEventListener('click', showBluetoothDevicePicker);
}

if($.test_connection_button.getTitle().length > latinButtonTextLength){
    $.test_connection_button.setWidth(180);
    $.ok_button.setWidth(180);
}
