// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/orders/orderHeader.js - Functions for handling the order header
 */

//---------------------------------------------------
// ## VARIABLES

var storeInfo = Alloy.Models.storeInfo;
var currentAssociate = Alloy.Models.associate;
var currentBasket = Alloy.Models.basket;

if (Alloy.CFG.payment_entry === 'pos') {
    $.pos_cancel_button.setVisible(true);
}

// Localization constant
var buttonTextLength = 18;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'order_just_created', orderJustCreatedEventListener);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.email_button.addEventListener('click', emailButtonClickEventListener);

$.print_button.addEventListener('click', printButtonClickEventListener);

//---------------------------------------------------
// ## MODEL LISTENERS

// customerOrder sync event listener
$.listenTo(Alloy.Models.customerOrder, 'sync', function(model) {
    $.customer_order.clear();
    $.customer_order.set(Alloy.Models.customerOrder.toJSON());
    $.order_button_container.hide();
});

//---------------------------------------------------
// ## PUBLIC API

exports.render = render;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 * @param {Object} order - order
 * @param {Boolean} alwaysShowButtons - always show email and print buttons
 *
 * @api public
 */

function render(order, alwaysShowButtons) {
    $.customer_order.clear({
        silent : true
    });
    $.customer_order.set(order.toJSON());
    if (Alloy.CFG.payment_entry === 'pos') {
        $.order_status_label.setText(_L('Order created, Payment pending'));
    }
    if (alwaysShowButtons) {
        $.order_button_container.show();
        if (Alloy.CFG.printer_availability) {
            showPrintButtonHelper();
        } else {
            hidePrintButtonHelper();
        }
        if ($.email_button.getTitle().length > buttonTextLength || $.print_button.getTitle().length > buttonTextLength) {
            adjustButtonWidths();
        }
    } else if (Alloy.CFG.order_history_print_button || Alloy.CFG.order_history_email_button) {
        /* Even if not always showing the buttons, the print and email
         * buttons can be shown, if the preference in the BM is set to show them */
        $.order_button_container.show();
        if (Alloy.CFG.order_history_print_button && Alloy.CFG.printer_availability) {
            showPrintButtonHelper();
        } else {
            hidePrintButtonHelper();
        }
        if (Alloy.CFG.order_history_email_button) {
            if ($.email_button.getTitle().length > buttonTextLength || $.print_button.getTitle().length > buttonTextLength) {
                adjustButtonWidths();
            }
        } else {
            $.email_button.setVisible(false);
            $.email_button.setHeight(0);
        }
    } else {
        $.order_button_container.hide();
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.print_button.removeEventListener('click', printButtonClickEventListener);
    $.email_button.removeEventListener('click', emailButtonClickEventListener);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * orderJustCreatedEventListener - order model just created listener
 * @param {Object} order
 *
 * @api private
 */
function orderJustCreatedEventListener(order) {
    render(order, true);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * emailButtonClickEventListener - email_button click event listener
 *
 * @api private
 */
function emailButtonClickEventListener() {
    var promise = Alloy.Models.basket.emailOrder($.customer_order.getOrderNo());
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        notify(_L('Emailing receipt'));
    }).fail(function() {
        notify(_L('Error sending email'), {
            preventAutoClose : true
        });
    });
}

/**
 * printButtonClickEventListener - print_button click event listener
 *
 * @api private
 */
function printButtonClickEventListener() {
    var receipt = _.extend({}, $.customer_order);
    receipt.set('employee_id', currentAssociate.getEmployeeId());
    receipt.set('employee_name', currentAssociate.getFirstName() + ' ' + currentAssociate.getLastName());
    receipt.set('store_name', storeInfo.getId());
    receipt.set('store_address', storeInfo.constructStoreAddress());

    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/confirmation/printerChooserDialog',
        initOptions : receipt.toJSON(),
        continueEvent : 'printer_chooser:dismiss',
    });
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showPrintButtonHelper - make print button visisble and adjust email button accordingly
 * 
 * @api private
 */
function showPrintButtonHelper() {
    $.print_button.setVisible(true);
    $.print_button.setHeight(35);
    $.email_button.setTop(0);
}

/**
 * hidePrintButtonHelper - make print button invisible and adjust email button accordingly
 * 
 * @api private
 */
function hidePrintButtonHelper() {
    $.print_button.setVisible(false);
    $.print_button.setHeight(0);
    $.email_button.setTop(15);
}

/**
 * adjustButtonWidths - adjust width of both buttons
 * 
 * @api private
 */
function adjustButtonWidths() {
    $.email_button.setWidth(170);
    $.print_button.setWidth(170);
}
