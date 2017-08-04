// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/confirmation/printerChooserDialog.js - Modal dialog to choose a printer
 */

//----------------------------------------------
// ## VARIABLES

var receiptToPrint;
var printerAvailability = Alloy.CFG.printer_availability;

//----------------------------------------------
// ## UI EVENT LISTENERS

$.print_button.addEventListener('click', onPrintClick);

// dismiss the modal when tapping outside it
$.backdrop.addEventListener('click', dismiss);

// enable the print button if there's a chosen printer
$.listenTo($.printer_chooser, 'printer_chosen', onPrinterChosen);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} receipt
 * @api public
 */
function init(receipt) {
    if (printerAvailability) {
        receiptToPrint = receipt;
        $.printer_chooser.init();
        $.print_button.setEnabled(false);
    } else {
        $.print_button.setVisible(false);
        $.print_button.setWidth(0);
        $.print_button.setHeight(0);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.print_button.removeEventListener('click', onPrintClick);
    $.backdrop.removeEventListener('click', dismiss);
    $.stopListening($.printer_chooser, 'printer_chosen', onPrinterChosen);
    $.printer_chooser.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    Alloy.eventDispatcher.trigger('printerlist:stopdiscovery', {});
    $.trigger('printer_chooser:dismiss');
}

/**
 * onPrintClick - when the print button is tapped
 *
 * @api private
 */
function onPrintClick() {
    Alloy.eventDispatcher.trigger('print:receipt', receiptToPrint);
    dismiss();
}

/**
 * onPrinterChosen - when a printer in the list is selected
 *
 * @param {Object} enabled
 * @api private
 */
function onPrinterChosen(enabled) {
    $.print_button.setEnabled(enabled.enabled);
}
