// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/paymentSummaryRow.js - A single entered payment
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var logger = require('logging')('checkout:components:paymentSummaryRow', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## UI EVENT LISTENERS

// remove the payment
$.delete_button.addEventListener('click', onDeleteClick);

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
$.payment_table.deinit = function() {
    logger.info('DEINIT called');
    $.delete_button.removeEventListener('click', onDeleteClick);
    $.destroy();
};

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onDeleteClick - event when delete button is clicked on the row
 * @api private
 */
function onDeleteClick() {
    if ($model.isCreditCard()) {
        Alloy.Router.showActivityIndicator(currentBasket.removeCreditCard({
            order_no : currentBasket.getOrderNumber(),
            credit_card_last_four : $model.getLastFourDigits()
        }));
    } else if ($model.isGiftCard()) {
        Alloy.Router.showActivityIndicator(currentBasket.removeGiftCard({
            order_no : currentBasket.getOrderNumber(),
            gift_card_last_four : $model.getLastFourDigits()
        }));
    }
}

//----------------------------------------------
// ## CONSTRUCTOR

// only show the delete button if the payment can be removed
if ($model.getCanDelete()) {
    $.delete_button.show();
    $.delete_button.setWidth(24);
    $.gift_card_amount_label.setWidth('35%');
} else {
    $.delete_button.hide();
    $.delete_button.setWidth(0);
    $.gift_card_amount_label.setWidth('35%');
}
