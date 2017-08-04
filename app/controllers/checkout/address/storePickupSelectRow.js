// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/storePickupSelectRow.js - Controller for store pickup table view row
 */

//---------------------------------------------------
// ## VARIABLES
var args = $.args;


/**
 * DEINIT
 *
 * @api public
 */
$.store_row.deinit = function () {
    $.store_row.getUnavailableButton = null;
    $.store_row.uncheckCheckbox = null;
    $.store_row.checkSelectedCheckbox = null;
    $.store_row.deinit = null;
    $.stopListening();
    $.destroy();
};
//----------------------------------------------
// ## FUNCTIONS

/**
 * checkSelectedCheckbox - Update checkbox ui to selected
 *
 * @api public
 */
$.store_row.checkSelectedCheckbox = function() {
    if ($.store_checkbox) {
        $.resetClass($.store_checkbox, ['checkbox', 'checked_option']);
    }
};

/**
 * uncheckCheckbox - Update checkbox ui to unselected
 *
 * @api public
 */
$.store_row.uncheckCheckbox = function() {
    if ($.store_checkbox) {
        $.resetClass($.store_checkbox, ['checkbox', 'unchecked_option']);
    }
};

/**
 * getUnavailableButton - return $.unavailable_basket_button if it exist
 * @return {Object} Ti.UI.Button
 *
 * @api public
 */
$.store_row.getUnavailableButton = function() {
    if ($.unavailable_basket_button) {
        return $.unavailable_basket_button;
    }
};

/**
 * isBasketAvailable - return true if the basket available
 * @return {Boolean}
 *
 * @api private
 */
function isBasketAvailable() {
    return $model.isBasketAvailable();
}

/**
 * isSelected - return true if the store was selected
 * @return {Boolean}
 *
 * @api private
 */
function isSelected() {
    return $model.isSelected();
}



//---------------------------------------------------
// ## CONSTRUCTOR

if (isBasketAvailable() && isSelected() && $.store_checkbox) {
    //Update checkbox ui to selected
    $.resetClass($.store_checkbox, ['checkbox', 'checked_option']);
}
