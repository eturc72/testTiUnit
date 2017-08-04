// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/allOverrideTypes.js - overrides type controller
 */

//---------------------------------------------------
// ## VARIABLES

var selectedType = 'none';
var isValid = true;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// handle selection of no override
$.none_container.addEventListener('click', onNoneClick);

// handle amount off
$.amount_off_container.addEventListener('click', onAmountOffClick);

// handle percent off
$.percent_off_container.addEventListener('click', onPercentOffClick);

// handle fixed price
$.fixed_price_container.addEventListener('click', onFixedPriceClick);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.hideOverrideFixedPrice = hideOverrideFixedPrice;
exports.hideOverrideByPercent = hideOverrideByPercent;
exports.hideOverrideByAmount = hideOverrideByAmount;
exports.setSelection = setSelection;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.none_container.removeEventListener('click', onNoneClick);
    $.amount_off_container.removeEventListener('click', onAmountOffClick);
    $.percent_off_container.removeEventListener('click', onPercentOffClick);
    $.fixed_price_container.removeEventListener('click', onFixedPriceClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * hideOverrideFixedPrice - hides the override fixed price
 *
 * @param hide
 * @api private
 */
function hideOverrideFixedPrice(hide) {
    if (hide) {
        $.fixed_price_container.setHeight(0);
        $.fixed_price_container.hide();
    } else {
        $.fixed_price_container.setHeight(60);
        $.fixed_price_container.show();
    }
}

/**
 * hideOverrideByPercent - hides the override percent
 *
 * @param hide
 * @api private
 */
function hideOverrideByPercent(hide) {
    if (hide) {
        $.percent_off_container.setHeight(0);
        $.percent_off_container.hide();
    } else {
        $.percent_off_container.setHeight(60);
        $.percent_off_container.show();
    }
}

/**
 * hideOverrideByAmount - hides the override amount
 *
 * @param hide
 * @api private
 */
function hideOverrideByAmount(hide) {
    if (hide) {
        $.amount_off_container.setHeight(0);
        $.amount_off_container.hide();
    } else {
        $.amount_off_container.setHeight(60);
        $.amount_off_container.show();
    }
}

/**
 * setSelection - set the selection to either of three options
 *
 * @param type
 * @param amount
 * @api private
 */
function setSelection(type, amount) {
    switch (type) {
    case 'percent':
        select($.percent_off_container, [$.amount_off_container, $.fixed_price_container]);
        break;
    case 'amount':
        select($.amount_off_container, [$.percent_off_container, $.fixed_price_container]);
        break;
    case 'fixedPrice':
        select($.fixed_price_container, [$.percent_off_container, $.amount_off_container]);
        break;
    }
    selectNone(type === 'none');
}

/**
 * select - select the override radio button
 *
 * @param selected
 * @param unselected
 * @api private
 */
function select(selected, unselected) {
    if (selected) {
        selected.getChildren()[0].image = Alloy.Styles.radioButtonOnImage;
    }
    _.each(unselected, function(one) {
        one.getChildren()[0].image = Alloy.Styles.radioButtonOffImage;
    });
}

/**
 * selectNone - select the option Nond
 *
 * @param selected
 * @api private
 */
function selectNone(selected) {
    $.none_container.getChildren()[0].setImage(selected ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage);
    if (selected) {
        select(null, [$.fixed_price_container, $.percent_off_container, $.amount_off_container]);
        selectedType = 'none';
        isValid = true;
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onNoneClick - when the none option is selected
 *
 * @api private
 */
function onNoneClick() {
    selectNone(true);
    select(null, [$.percent_off_container, $.amount_off_container, $.fixed_price_container]);
    // send none select event
    $.trigger('overridetype', {
        valid : true,
        overrideType : 'none'
    });
}

/**
 * onAmountOffClick - when the Amount Off option is selected
 *
 * @api private
 */
function onAmountOffClick() {
    select($.amount_off_container, [$.percent_off_container, $.fixed_price_container]);
    selectNone(false);
    // send amount select event
    $.trigger('overridetype', {
        overrideType : 'amount'
    });
}

/**
 * onPercentOffClick - when the Percent Off option is selected
 *
 * @api private
 */
function onPercentOffClick() {
    select($.percent_off_container, [$.amount_off_container, $.fixed_price_container]);
    selectNone(false);
    // send percent select event
    $.trigger('overridetype', {
        overrideType : 'percent'
    });
}

/**
 * onFixedPriceClick - when the Fixed Price option is selected
 *
 * @api private
 */
function onFixedPriceClick() {
    select($.fixed_price_container, [$.percent_off_container, $.amount_off_container]);
    selectNone(false);
    // send fixed price select event
    $.trigger('overridetype', {
        overrideType : 'fixedPrice'
    });
}

