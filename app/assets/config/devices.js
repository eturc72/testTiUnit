// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/devices.js  - configuration for devices
 */

module.exports = {
    devices : {
        // The payment terminal, either 'verifoneDevice', 'adyenDevice', or 'webDevice'.
        // If using ‘webDevice’ be sure to set payment_entry from main.js to 'web' in your user.js file.
        payment_terminal_module : 'verifoneDevice',
        // The barcode scanner module to load at startup
        barcode_scanner_module : 'barcodeScanner',
        // The printer module to load at startup
        printer_module : 'epsonPrinter',

        // The url to use for validation
        validate_url : 'EAStore-ValidateDevice',

        // Enables/disables the bluetooth device picker functionality on the 'no connection to payment device' dialog.
        // Requires including com.demandware.ios.bluetoothdevicepicker module in tiapp.xml and using 4.1.0SDK.
        // Default is false
        bluetoothDevicePicker : false,

        // verifone specific settings
        verifone : {
            // The amount of time to wait for a card to actually be swiped once a transaction begins (specify seconds)
            card_swipe_timeout : 120,
            registart_url : 'Verifone-ActivateDevice'
        }
    }
};
