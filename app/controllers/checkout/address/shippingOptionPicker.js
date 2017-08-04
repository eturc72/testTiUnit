// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/shippingOptionPicker.js - choose an address from the address book
 */

//----------------------------------------------
// ## VARIABLES
var args = $.args;

// logger used for output, see loggableCategories
var logger = require('logging')('checkout:address:shippingOptionPicker', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'order_just_created', handleShipToAddressSelected);
$.listenTo(Alloy.eventDispatcher, 'cart_cleared', handleShipToAddressSelected);

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.ship_to_address_wrapper.addEventListener('click', handleShipToAddressSelected);

if (isShipToCurrentStoreEnabled()) {
    $.ship_to_current_store_wrapper.addEventListener('click', handleShipToCurrentStoreSelected);
}

if (isDifferentStorePickupEnabled()) {
    $.dif_store_pickup_wrapper.addEventListener('click', handleDifferentStorePickupSelected);
}

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.isShipToAddressChecked = isShipToAddressChecked;
exports.isShipToCurrentStoreChecked = isShipToCurrentStoreChecked;
exports.isDifferentStorePickupChecked = isDifferentStorePickupChecked;
exports.checkDifferentStorePickup = checkDifferentStorePickup;
exports.checkShipToAddress = checkShipToAddress;
exports.checkShipToStore = checkShipToStore;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('Calling INIT');
    checkShipToAddress();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('Calling DEINIT');
    $.ship_to_address_wrapper.removeEventListener('click', handleShipToAddressSelected);

    if (isShipToCurrentStoreEnabled()) {
        $.ship_to_current_store_wrapper.removeEventListener('click', handleShipToCurrentStoreSelected);
    }
    if (isDifferentStorePickupEnabled()) {
        $.dif_store_pickup_wrapper.removeEventListener('click', handleDifferentStorePickupSelected);
    }

    if (_.isFunction($.hasAnythingChanged)) {
        $.hasAnythingChanged = null;
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateSelectedCheckboxView - Update UI to reflect wich checkbox is selected
 * @param  {Object} imageView - round imageview to update
 * @api private
 */
function updateSelectedCheckboxView(imageView) {
    var checkboxes = [$.ship_to_address_checkbox];
    if (isShipToCurrentStoreEnabled()) {
        checkboxes.push($.ship_to_current_store_checkbox);
    }
    if (isDifferentStorePickupEnabled()) {
        checkboxes.push($.dif_store_pickup_checkbox);
    }
    _.each(checkboxes, function(checkbox) {
        if (checkbox === imageView) {
            $.resetClass(imageView, ['shipping_option_checkbox', 'checked_option']);
        } else {
            $.resetClass(checkbox, ['shipping_option_checkbox', 'unchecked_option']);
        }
    });

}

/**
 * isShipToCurrentStoreEnabled - return true if ship to store configuration is enabled
 * @return {Boolean}
 * @api public
 */
function isShipToCurrentStoreEnabled() {
    return Alloy.CFG.alternate_shipping_options.order_pickup_current_store;
}

/**
 * isDifferentStorePickupEnabled - return true if different store pickup configuration is enabled
 * @return {Boolean}
 * @api public
 */
function isDifferentStorePickupEnabled() {
    return Alloy.CFG.alternate_shipping_options.order_pickup_different_store;
}

/**
 * checkShipToAddress - update ship to address checkbox UI to checked state
 *
 * @api public
 */
function checkShipToAddress() {
    updateSelectedCheckboxView($.ship_to_address_checkbox);
}

/**
 * checkShipToStore - update ship to store checkbox UI to checked state
 *
 * @api public
 */
function checkShipToStore() {
    updateSelectedCheckboxView($.ship_to_current_store_checkbox);
}

/**
 * checkDifferentStorePickup - update store pickup checkbox UI to checked state
 *
 * @api public
 */
function checkDifferentStorePickup() {
    updateSelectedCheckboxView($.dif_store_pickup_checkbox);
}

/**
 * isShipToAddressChecked - return true if ship to address is checked
 * @return {Boolean}
 *
 * @api public
 */
function isShipToAddressChecked() {
    return $.ship_to_address_checkbox.checked;
}

/**
 * isShipToCurrentStoreChecked - return true if ship here is checked
 * @return {Boolean}
 *
 * @api public
 */
function isShipToCurrentStoreChecked() {
    return isShipToCurrentStoreEnabled() && $.ship_to_current_store_checkbox && $.ship_to_current_store_checkbox.checked;
}

/**
 * isDifferentStorePickupChecked - return true if pickup elsewhere option is checked
 * @return {Boolean}
 *
 * @api public
 */
function isDifferentStorePickupChecked() {
    return isDifferentStorePickupEnabled() && $.dif_store_pickup_checkbox && $.dif_store_pickup_checkbox.checked;
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleShipToAddressSelected - trigger "shippingOption:shipToAddress" event when this option is selected
 * @param  {Object} event
 *
 * @api private
 */
function handleShipToAddressSelected(event) {
    if (!$.ship_to_address_checkbox.checked) {
        if (_.isFunction($.hasAnythingChanged)) {
            confirmCurrentAddressFormCleanup($.hasAnythingChanged()).done(function() {
                checkShipToAddress();
                Alloy.eventDispatcher.trigger('shippingOption:shipToAddress');
            });
        } else {
            checkShipToAddress();
            Alloy.eventDispatcher.trigger('shippingOption:shipToAddress');
        }
    }
}

/**
 * handleShipToCurrentStoreSelected - trigger "shippingOption:shipToThisStore" event when this option is selected
 * @param  {Object} event
 *
 * @api private
 */
function handleShipToCurrentStoreSelected(event) {
    if (!$.ship_to_current_store_checkbox.checked) {
        if (_.isFunction($.hasAnythingChanged)) {
            confirmCurrentAddressFormCleanup($.hasAnythingChanged()).done(function() {
                checkShipToStore();
                Alloy.eventDispatcher.trigger('shippingOption:shipToCurrentStore');
            });
        } else {
            checkShipToStore();
            Alloy.eventDispatcher.trigger('shippingOption:shipToCurrentStore');
        }
    }

}

/**
 * handleDifferentStorePickupSelected - trigger "shippingOption:differentStorePickup" event when this option is selected
 * @param  {Object} event
 *
 * @api private
 */
function handleDifferentStorePickupSelected(event) {
    if (!$.dif_store_pickup_checkbox.checked) {
        if (_.isFunction($.hasAnythingChanged)) {
            confirmCurrentAddressFormCleanup($.hasAnythingChanged()).done(function() {
                checkDifferentStorePickup();
                Alloy.eventDispatcher.trigger('shippingOption:differentStorePickupAddress');
            });
        } else {
            checkDifferentStorePickup();
            Alloy.eventDispatcher.trigger('shippingOption:differentStorePickupAddress');
        }

    }
}

/**
 * confirmCurrentAddressFormCleanup - displays the custom dialog to confirm the current form clean up
 *
 * @param hasFormChanged
 * @return {Deferred} promise
 * @api private
 */
function confirmCurrentAddressFormCleanup(hasFormChanged) {
    var deferred = new _.Deferred();
    if (hasFormChanged) {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('Are you sure you want to leave, you might lose the data filled in the form if you continue!'),
            titleString : _L('Address Form'),
            okButtonString : _L('Continue'),
            okFunction : function() {
                deferred.resolve();
            },
            cancelFunction : function() {
                deferred.reject();
            }
        });
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

//----------------------------------------------
// ## CONSTRUCTOR
