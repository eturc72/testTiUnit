// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/shippingMethod/index.js - Controller for selecting a shipping method
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var currentAssociate = Alloy.Models.associate;
var currentCustomer = Alloy.Models.customer;

var selectedShippingOverride = null;
var removeAllViews = require('EAUtils').removeAllViews;
var toCurrency = require('EAUtils').toCurrency;
var zero = require('EAUtils').zero;
var logger = require('logging')('checkout:shippingMethod:index', getFullControllerPath($.__controllerPath));

var shippingMethods = [];
var methodsToRows = {};
var methodsToCount = {};
var shippingMethodsById = {};
var selectedShippingMethod = null;
var lastSelectedIndex = -1;
var shippingOverrideAllowed = Alloy.CFG.overrides.shipping_price_overrides;

//---------------------------------------------------
// ## APP LISTENERS

// listen to global event 'order_just_created' and clear out the shipping override when an order has been fulfilled
// reset the gift switch to off
$.listenTo(Alloy.eventDispatcher, 'order_just_created', function() {
    selectedShippingOverride = null;
    turnOffGiftSwitch();
});

$.listenTo(Alloy.eventDispatcher, 'associate_logout', turnOffGiftSwitch);

$.listenTo(Alloy.eventDispatcher, 'cart_cleared', turnOffGiftSwitch);

$.listenTo(Alloy.eventDispatcher, 'configurations:unload', function() {
    if (isKioskMode() && shippingOverrideAllowed) {
        $.stopListening(Alloy.eventDispatcher, 'kiosk:manager_login_change', handleKioskManagerLogin);
    }
});

$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', function() {
    // This can be changed on the Business Manager
    shippingOverrideAllowed = Alloy.CFG.overrides.shipping_price_overrides;

    if (shippingOverrideAllowed && !isKioskMode()) {
        displayOverrideButton(true);
    } else {
        displayOverrideButton(false);
    }

    // double tap allowed if overrides disabled and not kiosk mode
    $.shipping_methods.removeEventListener('doubletap', onDoubleTap);
    if (!shippingOverrideAllowed && !isKioskMode()) {
        $.shipping_methods.addEventListener('doubletap', onDoubleTap);
    }

    if (!Alloy.CFG.allow_gift_message) {
        $.gift_container.hide();
    } else {
        $.gift_container.show();
    }

    if (isKioskMode() && shippingOverrideAllowed) {
        $.listenTo(Alloy.eventDispatcher, 'kiosk:manager_login_change', handleKioskManagerLogin);
    }
});

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.create_order_button.addEventListener('click', onCreateOrderButton);

$.override_button.addEventListener('click', onOverrideButton);

$.shipping_method_table.addEventListener('click', onShippingMethodsTable);

$.gift_switch.addEventListener('change', giftSwitchChange);

$.gift_text.addEventListener('change', setCharacterLeftText);

//---------------------------------------------------
// ## MODEL LISTENERS

// if the shipments change (a shipping address has been updated), update the
// available shipping methods
$.listenTo(currentBasket, 'change:shipments reset:shipments', function(type, model, something, options) {
    logger.info('basket event fired ' + type);
    if (currentBasket.getShippingAddress()) {
        updateOverride();
    }
    if (currentBasket.getShippingMethod()) {
        $.create_order_button.setEnabled(true);
    } else {
        $.create_order_button.setEnabled(false);
    }
});

// listen to the change:login event on the customer. if the customer isn't logged in, turn off the gift switch
$.listenTo(currentCustomer, 'change:login', function() {
    if (!currentCustomer.isLoggedIn()) {
        turnOffGiftSwitch();
    }
});

//----------------------------------------------
// ## PUBLIC API

exports.render = render;
exports.deinit = deinit;
exports.chooseShippingMethod = chooseShippingMethod;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 *
 * @return {Deferred} promise
 * @api public
 */
function render() {
    // need to do this here to reset the double tap so it doesn't always stay up
    if (!shippingOverrideAllowed && !isKioskMode()) {
        displayOverrideButton(false);
    }
    if (currentBasket.getIsGift()) {
        $.gift_switch.setValue(true);
        $.message_container.show();
        $.gift_text.setValue(currentBasket.getGiftMessage());
    } else {
        turnOffGiftSwitch();
        $.message_container.hide();
        $.gift_text.setValue('');
    }
    var deferred = _.Deferred();
    // if not shipping to the store but an override had been applied for free shipping, remove it
    if (!currentBasket.getShipToStore()) {
        var currentShippingMethod = currentBasket.getShippingMethod();
        if (currentShippingMethod && currentShippingMethod.hasPriceOverride() && currentShippingMethod.getPriceOverrideReasonCode() === _L('Free Shipping to the Store')) {
            removeOverride().always(function() {
                drawShippingMethods().always(function() {
                    enableOverrideButton();
                    deferred.resolve();
                });
            });
        } else {
            drawShippingMethods().always(function() {
                enableOverrideButton();
                deferred.resolve();
            });
        }
    } else {
        drawShippingMethods().always(function() {
            enableOverrideButton();
            deferred.resolve();
        });
    }
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */

function deinit() {
    $.create_order_button.removeEventListener('click', onCreateOrderButton);
    $.override_button.removeEventListener('click', onOverrideButton);
    $.shipping_method_table.removeEventListener('click', onShippingMethodsTable);
    $.gift_switch.removeEventListener('change', giftSwitchChange);
    $.gift_text.removeEventListener('change', setCharacterLeftText);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * chooseShippingMethod - select a shipping method
 *
 * @param {int} index
 * @api public
 */
function chooseShippingMethod(index) {
    var children = $.shipping_method_table.getSections()[0].getRows();
    _.each(children, function(child, i) {
        child.select.call(this, i === index);
    });
    selectedShippingMethod = shippingMethods[index];
    lastSelectedIndex = index;
    // actually set the shipping method
    setShippingMethod();
}

/**
 * updateOverride - update the selected shipping override
 *
 * @api private
 */
function updateOverride() {
    var currentShippingMethod = currentBasket.getShippingMethod();
    if (currentShippingMethod && currentShippingMethod.hasPriceOverride()) {
        selectedShippingOverride = {
            price_override_type : currentShippingMethod.getPriceOverrideType(),
            price_override_value : currentShippingMethod.getPriceOverrideValue(),
            price_override_reason_code : currentShippingMethod.getPriceOverrideReasonCode(),
            manager_employee_id : currentShippingMethod.getPriceOverrideManagerId()
        };
    } else {
        selectedShippingOverride = null;
    }
    enableOverrideButton();
}

/**
 * drawShippingMethods - set up the shipping methods
 *
 * @return {Deferred} promise
 * @api private
 */
function drawShippingMethods() {
    var promise = currentBasket.getShippingMethods({
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    });
    promise.done(function() {
        var methods = currentBasket.getAvailableShippingMethods();
        var filteredShippingMethods = [];
        filteredShippingMethods = _.filter(methods, function(shippingMethod) {
            if (_.contains(Alloy.CFG.ship_to_store.store_pickup_ids, shippingMethod.getID())) {
                return false;
            } else {
                return true;
            }
        });
        if (filteredShippingMethods && filteredShippingMethods.length > 0) {
            // once the shipping methods have been set, select one
            $.shippingMethods.once('reset', function() {
                selectMethod(filteredShippingMethods);
            });
            $.shippingMethods.reset(filteredShippingMethods);
        } else {
            $.shippingMethods.reset([]);
        }
    });
    return promise;
}

/**
 * selectMethod - select a shipping method
 *
 * @param {Collection} methods
 * @api private
 */
function selectMethod(methods) {
    shippingMethods = methods;
    methodsToRows = {};
    methodsToCount = {};
    var chosenMethod = null;

    // we need to record each item in the row so we can select/deselect them later.
    if ($.shipping_method_table.getSections().length > 0) {
        var children = $.shipping_method_table.getSections()[0].getRows();
        if (children) {
            _.each(children, function(child, index) {
                methodsToRows[child.method_id] = child;
                methodsToCount[child.method_id] = index;
            });
        }
    }

    // record each shipping method by id
    _.each(methods, function(method) {
        shippingMethodsById[method.getID()] = method;
    });

    // if there's a shipping method other than store pick up set on the basket, select it again
    if (currentBasket.getShippingMethod() && (!(_.contains(Alloy.CFG.ship_to_store.store_pickup_ids, currentBasket.getShippingMethod().getID())))) {
        chosenMethod = currentBasket.getShippingMethod();
        updateFromSelectedShippingMethod();
    } else {
        // otherwise, auto select the first shipping method in the list
        preselectShippingMethod();
    }
}

/**
 * transformShippingMethod - transform a shipping method to a displayable format
 *
 * @param {Object} shipment
 * @api private
 */
function transformShippingMethod(shipment) {
    var price = toCurrency(shipment.getBasePrice() - 0);
    if (shipment.getSurcharge()) {
        price = String.format(_L('%s + %s Surcharge'), price, toCurrency(shipment.getSurcharge()));
    }

    var desc = shipment.getDescription();
    //setting description to empty string instead of undefined, if no description is set on shipping method
    desc = _.isUndefined(desc) ? '' : '(' + desc + ')';

    return {
        name : String.format(_L('%s: '), shipment.getName()),
        description : desc,
        price : price,
        method_id : shipment.getID()
    };
}

/**
 * onCreateOrderButton - handles the even when clicked on Create Order Button
 *
 * @api private
 */
function onCreateOrderButton() {
    logger.info('create order button clicked');
    // if there's a gift message to set, do it now
    var promise = setGiftMessage();
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        if (currentBasket.canEnableCheckout()) {
            currentBasket.setCheckoutStatus(currentBasket.getNextCheckoutState());
        } else {
            currentBasket.setCheckoutStatus('cart');
        }
    });
}

/**
 * onOverrideButton - handles the even when clicked on Override Button
 * @api private
 */
function onOverrideButton() {
    logger.info('shipping override button clicked, firing \'shippingOverride\' event');
    $.trigger('shippingOverride', {
        selectedShippingMethod : selectedShippingMethod,
        selectedShippingOverride : selectedShippingOverride
    });
}

/**
 * onShippingMethodsTable - handles the even when clicked on Shipping Methods Table
 *
 * @param {object} event
 * @api private
 */
function onShippingMethodsTable(event) {
    if (event.index != lastSelectedIndex) {
        // if there's an override on the shipping method, warn that changing shipping methods will result in removing the override
        if (currentBasket.hasShippingPriceOverride()) {
            removeShippingOverride(event.index);
        } else {
            // select the shipping method
            chooseShippingMethod(event.index);
        }
    }
}

/**
 * updateFromSelectedShippingMethod - update the display based on a chosen shipping method
 *
 * @api private
 */
function updateFromSelectedShippingMethod() {
    var currentShippingMethod = currentBasket.getShippingMethod();
    // if the basket has a shipping method, select it
    if (currentShippingMethod) {
        var id = currentShippingMethod.getID();
        if (id && methodsToRows[id]) {
            methodsToRows[id].select.call(this, true);
            lastSelectedIndex = methodsToCount[id];
            selectedShippingMethod = shippingMethodsById[id];
            $.create_order_button.setEnabled(true);
            $.override_button.setEnabled(true);
            updateOverride();
            if (freeShippingToStore()) {
                var deferred = new _.Deferred();
                Alloy.Router.showActivityIndicator(deferred);
                setFreeShippingOverride(deferred);
            }
            Alloy.eventDispatcher.trigger('shipping_method:selected');
        } else {
            // the selected shipping method wasn't found, so select the first available one
            preselectShippingMethod();
        }
    }
}

/**
 * preselectShippingMethod - preselect the first available shipping method
 *
 * @api private
 */

function preselectShippingMethod() {
    var foundMethod = false;
    // no shipping method set, we'll preselect the default one
    if ($.shipping_method_table.getSections().length > 0) {
        var children = $.shipping_method_table.getSections()[0].getRows();
        if (children) {
            var matchingChild = _.find(children, function(child, index) {
                var methodId = child.method_id;
                var shippingMethod = shippingMethodsById[methodId];
                if (shippingMethod.getDefaultMethod() == true && shippingMethod.getID() == methodId) {
                    lastSelectedIndex = index;
                    return true;
                }
                return false;
            });

            if (matchingChild) {
                matchingChild.select.call(this, true);
                selectedShippingMethod = shippingMethodsById[matchingChild.method_id];
                foundMethod = true;
                setShippingMethod();
            } else {
                var firstShippingMethod = children[0];
                firstShippingMethod.select.call(this, true);
                selectedShippingMethod = shippingMethodsById[firstShippingMethod.method_id];
                setShippingMethod();
            }

        }
    }
    selectedShippingOverride = null;
    // no methods found, so the buttons can't be enabled
    if (!foundMethod) {
        $.create_order_button.setEnabled(false);
        $.override_button.setEnabled(false);
    }
    updateShippingOverrideLabel();
}

/**
 * setGiftMessage - set a gift message into the shipment
 *
 * @return {Deferred} promise
 * @api private
 */
function setGiftMessage() {
    var promise = currentBasket.updateShipment({
        gift : $.gift_switch.getValue(),
        gift_message : $.gift_text.getValue()
    });
    Alloy.Router.showActivityIndicator(promise);
    promise.fail(function() {
        notify(_L('Unable to set the gift message.'), {
            preventAutoClose : true
        });
    });
    return promise;
}

/**
 * setShippingMethod - set the shipping method into the basket
 *
 * @param {Object} patch - custom data to send into the server request
 * @return {Deferred} promise
 * @api private
 */
function setShippingMethod(patch) {
    // transform the storefront shipping method into the ocapi shipping method
    var method = {
        id : selectedShippingMethod.getID()
    };

    var deferred = new _.Deferred();
    var promise = currentBasket.setShippingMethod(method, patch, {
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    });
    Alloy.Router.showActivityIndicator(deferred);
    promise.done(function() {
        // if ship to store and it should be free, set a $0 shipping price override
        if (currentBasket.getShipToStore() && Alloy.CFG.ship_to_store.free_shipping_ids.indexOf(selectedShippingMethod.getID()) >= 0) {
            var override = currentBasket.getShippingPriceOverride();
            // if free shipping override is already in the basket, don't need to set it again
            if (override && override.price_override_type.toLowerCase() == 'fixed price' && override.price_override_value == 0) {
                enableOverrideButton();
                deferred.resolve();
            } else {
                // actually set the free shipping override
                setFreeShippingOverride(deferred);
            }
        } else {
            enableOverrideButton();
            deferred.resolve();
        }

    }).fail(function(model) {
        var fault = model.get('fault');
        if (fault && fault.message && fault.message != '') {
            notify(fault.message, {
                preventAutoClose : true
            });
        }
        deferred.reject();
    });
    return deferred.promise();
}

/**
 * setFreeShippingOverride - set a free shipping override
 *
 * @param {Object} patch - custom data to send into the server request
 * @api private
 */
function setFreeShippingOverride(deferred) {
    var override = {
        shipping_method_id : selectedShippingMethod.shipping_method_id,
        price_override_type : 'FixedPrice',
        price_override_value : 0,
        price_override_reason_code : _L('Free Shipping to the Store'),
        ignore_permissions : true
    };
    currentBasket.setShippingPriceOverride(override, {
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    }).done(function() {
        enableOverrideButton();
        deferred.resolve();
    }).fail(function() {
        deferred.reject();
    });
}

/**
 * updateShippingOverrideLabel - update the override label to indicate if there is a shipping override
 *
 * @param {String} message
 * @api private
 */
function updateShippingOverrideLabel(message) {
    if (selectedShippingOverride == null || selectedShippingOverride.price_override_type === 'none') {
        $.price_override_summary.hide();
    } else {
        $.price_override_summary.show();
        $.price_override_summary.setText(_L(message));
    }
}

/**
 * displayOverrideButton - helper function to show or hide override button
 *
 * @param {Boolean} show
 * @api private
 */
function displayOverrideButton(show) {
    if (show) {
        $.override_button.setWidth(228);
        $.override_button.setHeight(42);
        $.override_button.setVisible(true);
        //Move create_order button to the right of center
        $.create_order_button.setLeft(0);
        $.create_order_label_container.setLeft(0);
    } else {
        $.override_button.setVisible(false);
        $.override_button.setWidth(0);
        $.override_button.setHeight(0);
        //Move create_order button to the center
        $.create_order_button.setLeft(130);
        $.create_order_label_container.setLeft(130);
    }
}

/**
 * enableOverrideButton - determine if the override button should be enabled
 *
 * @api private
 */
function enableOverrideButton() {
    // if the basket has an override, the button should be enabled
    if (currentBasket.hasShippingPriceOverride()) {
        if (freeShippingToStore()) {
            $.override_button.setEnabled(false);
            updateShippingOverrideLabel('Free Shipping to this Store');
        } else {
            $.override_button.setEnabled(true);
            updateShippingOverrideLabel('A shipping override has been applied');
        }
    } else {
        // determine the shipping cost
        var shippingMethod = currentBasket.getShippingMethod();
        var shippingCost = zero(parseFloat(currentBasket.getShippingTotal()));
        var basePrice = 0;
        if (shippingMethod && currentBasket.shippingMethods && currentBasket.hasProductItems()) {
            shippingCost = currentBasket.getShippingMethodPrice(shippingMethod.getID());
            basePrice = currentBasket.getShippingMethodBasePrice(shippingMethod.getID());
        }
        // shipping methods have not been fetched at all (which really shouldn't happen at this point)
        if (!currentBasket.shippingMethods) {
            shippingCost = 0;
            shippingDiscount = 0;
        } else {
            // the shipping_total in the basket is the shipping cost - the shipping discount, so we can calculate the shipping discount.
            shippingDiscount = shippingMethod ? shippingCost - currentBasket.getShippingTotal() : 0;
        }

        // free shipping, disable the override button
        if (basePrice.toFixed(2) == shippingDiscount.toFixed(2)) {
            $.override_button.setEnabled(false);
            $.price_override_summary.hide();
        } else {
            $.override_button.setEnabled(true);
            updateShippingOverrideLabel();
        }
    }
}

/**
 * removeShippingOverride - remove a shipping price override and then selects a shipping method
 *
 * @param {Number} index
 * @api private
 */
function removeShippingOverride(index) {
    var okFunction = function() {
        removeOverride(true).done(function() {
            chooseShippingMethod(index);
        }).fail(function() {
            notify(_L('Could not remove override.'), {
                preventAutoClose : true
            });
        });
    };

    // if free shipping to store and the new shipping method id doesn't have free shipping to the
    // store, remove the override. otherwise, just select the new shipping method.
    if (freeShippingToStore()) {
        var id = shippingMethods[index].shipping_method_id;
        if (Alloy.CFG.ship_to_store.free_shipping_ids.indexOf(id) < 0) {
            okFunction.call(this);
        } else {
            chooseShippingMethod(index);
        }
    } else {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('A shipping override has been applied. Changing shipping methods will remove the override.'),
            okButtonString : _L('Confirm'),
            okFunction : okFunction
        });
    }
}

/**
 * removeOverride - remove a shipping price override
 *
 * @return {Deferred} promise
 * @api private
 */
function removeOverride() {
    var override = {
        shipping_method_id : currentBasket.getShippingMethod().getID(),
        price_override_type : 'none',
        employee_id : Alloy.Models.associate.getEmployeeId(),
        employee_passcode : Alloy.Models.associate.getPasscode(),
        store_id : Alloy.CFG.store_id,
        kiosk_mode : isKioskMode(),
        ignore_permissions : isKioskMode()
    };
    if (isKioskManagerLoggedIn()) {
        override.manager_employee_id = getKioskManager().getEmployeeId();
        override.manager_employee_passcode = getKioskManager().getPasscode();
        override.manager_allowLOBO = getKioskManager().getPermissions().allowLOBO;
    }
    var promise = currentBasket.setShippingPriceOverride(override, {
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    }, {
        silent : true
    });
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        selectedShippingOverride = override;
    });
    return promise;
}

/**
 * setCharacterLeftText - update the text for how many characters are left
 *
 * @api private
 */
function setCharacterLeftText() {
    $.character_left_label.setText(String.format(_L('You have %d characters left out of 250'), 250 - $.gift_text.getValue().length));
}

/**
 * giftSwitchChange - when the gift switch changes
 *
 * @api private
 */
function giftSwitchChange() {
    if ($.gift_switch.value) {
        $.message_container.show();
        setCharacterLeftText();
    } else {
        $.message_container.hide();
    }
}

/**
 * turnOffGiftSwitch - set the gift switch to off
 *
 * @api private
 */
function turnOffGiftSwitch() {
    $.gift_switch.setValue(false);
    giftSwitchChange();
}

/**
 * handleKioskManagerLogin - handle the kiosk manager login event, only happens when shipping overrides are allowed
 *
 * @api private
 */
function handleKioskManagerLogin() {
    displayOverrideButton(isKioskManagerLoggedIn());
}

/**
 * freeShippingToStore - determine if the items are being shipped free to the store
 *
 * @api private
 */
function freeShippingToStore() {
    return currentBasket.getShipToStore() && Alloy.CFG.ship_to_store.free_shipping_ids.indexOf(currentBasket.getShippingMethod().getID()) >= 0;
}

/**
 * onDoubleTap - double tap on screen to enable overrides
 *
 * @api private
 */
function onDoubleTap() {
    displayOverrideButton(true);
}