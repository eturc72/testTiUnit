// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/paymentSignature.js - Collect the customer's signature
 */

//----------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('checkout:payments:paymentSignature', getFullControllerPath($.__controllerPath));

var currentBasket = Alloy.Models.basket;
var storeInfo = Alloy.Models.storeInfo;
var currentAssociate = Alloy.Models.associate;

var order = arguments[0] ? arguments[0] : null;

var collection = new Backbone.Collection();
var printerAvailability = Alloy.CFG.printer_availability;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// customer wants the receipt via email
$.email_button.addEventListener('click', onEmailClick);

// customer wants the receipt printed
$.print_button.addEventListener('click', onPrintClick);

// a printer was chosen, so change the enablement of the print button
$.listenTo($.printer_chooser, 'printer_chosen', onPrinterChosen);

// customer accepts the signature
$.listenTo($.prompt_signature, 'promptSignature:accept_signature', onAcceptSignature);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args - order json
 * @api public
 */
function init(args) {
    logger.info('INIT called');
    $.prompt_signature.init();

    order = Alloy.createModel('baskets', args.toJSON());
    // if the order requires a signature, gather it. otherwise just ask how the receipt should be delivered.
    if (order.doesPaymentRequireSignature()) {
        switchToSignatureDisplay(true);
    } else {
        initializePrinterChooser();
    }
    $.print_button.setEnabled(false);
    if (eaUtils.isSymbolBasedLanguage()) {
        $.payment_confirmation_line1.setFont(Alloy.Styles.detailTextFont);
    } else {
        $.payment_confirmation_line1.setFont(Alloy.Styles.appFont);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.prompt_signature.deinit();
    $.email_button.removeEventListener('click', onEmailClick);
    $.print_button.removeEventListener('click', onPrintClick);
    Alloy.eventDispatcher.trigger('printerlist:stopdiscovery', {});
    $.printer_chooser.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * switchToSignatureDisplay - switch the display between signature and confirmation
 *
 * @param displaySignature - to display signature or not
 */
function switchToSignatureDisplay(displaySignature) {
    if (displaySignature) {
        $.contents.setHeight(371);
        $.contents.show();
        $.receipt_question_container.hide();
        $.receipt_question_container.setHeight(0);
    } else {
        $.receipt_question_container.setHeight(371);
        $.receipt_question_container.show();
        $.contents.hide();
        $.contents.setHeight(0);
    }
}

/**
 * dismiss - dismisses the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('signature:dismiss');
}

/**
 * initializePrinterChooser - display the printer chooser
 *
 * @api private
 */
function initializePrinterChooser() {
    // initialize the printer chooser
    if (!printerAvailability) {
        logger.info('Printer is not available');
        $.print_container.hide();
        $.print_container.setWidth(0);
        $.email_button_container.setWidth('100%');
        $.email_button.setTitle(_L('OK'));
        $.receipt_question_label.setText(_L('Emailing receipt'));
        //email receipt to customer
        currentBasket.emailOrder(order.getOrderNumber()).always(function() {
            $.receipt_question_label.setText(_L('Your receipt has been emailed'));
        }).fail(function() {
            notify(_L('Error sending email'), {
                preventAutoClose : true
            });
        });
    } else {
        logger.info('Printer is available');
        $.receipt_question_label.setText(_L('How would you like to receive your receipt?'));
        $.email_button.setTitle(_L('Email'));
        $.email_button_container.setWidth('49%');
        $.email_button.setRight(10);
        $.printer_chooser.init();
    }
    $.trigger('signature:accepted');
    // switch over to ask about how the receipt should be delivered
    switchToSignatureDisplay(false);
    $.order_no.setText(_L('Order No:') + ' ' + order.getOrderNumber());
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAcceptSignature - customer accepts the signature
 *
 * @param {Object} event - the signature image
 * @api private
 */
function onAcceptSignature(event) {
    logger.info('onAcceptSignature called');
    // store this in a global variable so the printer can access it
    Alloy.sigBlob = event.image;

    var orderNo = order.getOrderNumber();
    // upload the signature to the server
    eaUtils.sendSignatureToServer(event.image, orderNo + '');

    initializePrinterChooser();
}

/**
 * onEmailClick - customer wants the receipt via email
 *
 * @api private
 */
function onEmailClick() {
    if (!printerAvailability) {
        dismiss();
    } else {
        Alloy.eventDispatcher.trigger('printerlist:stopdiscovery', {});
        var promise = currentBasket.emailOrder(order.getOrderNumber());
        Alloy.Router.showActivityIndicator(promise);
        promise.done(function() {
            dismiss();
        }).fail(function() {
            notify(_L('Error sending email'), {
                preventAutoClose : true
            });
        });
    }
}

/**
 * onPrintClick - customer wants the receipt printed
 *
 * @api private
 */
function onPrintClick() {
    var receipt = _.extend({}, order);
    receipt.set('employee_id', currentAssociate.getEmployeeId());
    receipt.set('employee_name', currentAssociate.getFirstName() + ' ' + currentAssociate.getLastName());
    receipt.set('store_name', storeInfo.getId());
    receipt.set('store_address', storeInfo.constructStoreAddress());

    var json = receipt.toJSON();
    // after printing, stop listening for new printers
    Alloy.eventDispatcher.trigger('printerlist:stopdiscovery', {});
    Alloy.eventDispatcher.trigger('print:receipt', json);
    // close this window
    dismiss();
}

/**
 * onPrinterChosen - a printer was chosen, so change the enablement of the print button
 *
 * @param {Boolean} enabled
 * @api private
 */
function onPrinterChosen(enabled) {
    $.print_button.setEnabled(enabled.enabled);
}

