// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/index.js - controller that either shows the choose address (for registered customers) or the form to enter an address
 */

//----------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var currentBasket = Alloy.Models.basket;
var args = $.args;
var addressType = args.addressType || 'shipping';
var addressVerification = require('EAUtils').addressVerification;
var logger = require('logging')('checkout:address:index', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

if (shouldDisplayShippingOptionPicker()) {
    $.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToCurrentStore', handleShipToStore);
    $.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToAddress', handleShipToAddress);
    $.listenTo(Alloy.eventDispatcher, 'shippingOption:differentStorePickupAddress', handleDifferentStorePickupAddress);
}

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.listenTo($.enter_address, 'addressEntered', addressEntered);

$.listenTo($.choose_address, 'addressEntered', addressEntered);

if (shouldDisplayDifferentStorePickupAddress()) {
    $.listenTo($.different_store_pickup_address, 'addressEntered', addressEntered);
}

// in the enter shipping address controller, if the user wants to go back to choosing an address from an already existing list
$.listenTo($.enter_address, 'chooseAddress', function() {
    hideEnterAddress();
    showChooseAddress();
});

// for registered customers that want to edit or enter a new address not in the address book
$.listenTo($.choose_address, 'customer:address', function(address) {
    var model = Alloy.createModel('customerAddress');
    model.set(address);
    if (address.newAddress) {
        model.set('first_name', currentCustomer.getFirstName());
        model.set('last_name', currentCustomer.getLastName());
    }
    var email;

    //use  email on passed address object if there is one
    if (address.email) {
        email = address.email;
    } else if (currentBasket.getCustomerEmail()) {// if no email on address object use the current basket email if it is set
        email = currentBasket.getCustomerEmail();
    } else if (currentCustomer.getEmail()) {// if none of the two conditions above are not met use the current customer email
        email = currentCustomer.getEmail();
    }

    $.enter_address.render(model, email, addressType);
    hideChooseAddress();
    showEnterAddress();
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.setAddress = setAddress;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info(addressType + ' init called');
    $.choose_address.init(addressType);
    $.enter_address.init(addressType);
}

/**
 * RENDER
 *
 * @param {Boolean} initShippingOptionPicker flag which indicates if shipping option picker should be initialized
 * @return {Deferred} promise
 * @api public
 */
function render(initShippingOptionPicker) {
    if (shouldDisplayShippingOptionPicker()) {
        // if there is no shipping address or if there is a shipping address and different store pickup was selected
        // then we want to go into this first block of code
        if (!currentBasket.getShippingAddress()
            || (currentBasket.getShippingAddress() && $.shipping_option_picker.isDifferentStorePickupChecked()))
        {
            // only call init below if different store pickup or ship to current store were not previously selected.
            // We only want init to be called in the shipping option picker the first time it is rendered.
            if (initShippingOptionPicker
                    && currentBasket.getLastCheckoutStatus() !== 'shippingAddress'
                    && !$.shipping_option_picker.isDifferentStorePickupChecked()
                    && !$.shipping_option_picker.isShipToCurrentStoreChecked())
            {
                $.shipping_option_picker.init(); // calling this will cause ship to address to be selected
            }

            if ($.shipping_option_picker.isShipToAddressChecked()) {
                return renderChooseAddressOrEnterAddress();
            } else if ($.shipping_option_picker.isShipToCurrentStoreChecked()) {
                return handleShipToStore();
            } else if ($.shipping_option_picker.isDifferentStorePickupChecked()) {
                return setDifferentStorePickupAddress();
            }
        } else {
            if (currentBasket.getShipToStore()) {
                return handleShipToStore();
            } else if (currentBasket.getDifferentStorePickup()) {
                return handleDifferentStorePickupAddress();
            } else {
                return renderChooseAddressOrEnterAddress();
            }
        }
    } else {
        return renderChooseAddressOrEnterAddress();
    }

}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info(addressType + ' deinit called');
    $.choose_address.deinit();
    $.enter_address.deinit();
    if (shouldDisplayShippingOptionPicker()) {
        $.shipping_option_picker.deinit();
    }
    if (shouldDisplayDifferentStorePickupAddress()) {
        $.different_store_pickup_address.deinit();
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * renderChooseAddressOrEnterAddress - render either the choose address view or an empty address form
 *
 * @return {Deferred} promise
 * @api private
 */
function renderChooseAddressOrEnterAddress() {
    logger.info(addressType + ' render called');
    var isLoggedIn = currentCustomer.isLoggedIn();
    var deferred;
    hideDifferentStorePickupAddress();
    // if there is a current customer, show the controller to choose an address from the address book. otherwise, show the form to enter
    // a new address
    if (isLoggedIn) {
        hideEnterAddress();
        deferred = $.choose_address.render();
        deferred.done(function() {
            if (shouldDisplayShippingOptionPicker()) {
                $.shipping_option_picker.checkShipToAddress();
            }
            showChooseAddress();
        });
        return deferred;
    } else {
        hideChooseAddress();
        $.enter_address.render();
        showEnterAddress();
        deferred = new _.Deferred();
        // this deferred seems to help with the pulldowns rendering better
        setTimeout(function() {
            if (shouldDisplayShippingOptionPicker()) {
                $.shipping_option_picker.checkShipToAddress();
            }
            deferred.resolve();
        }, 200);
        return deferred.promise();
    }
}

/**
 * setAddress - set the new address into the basket depending on type
 *
 * @param {Object} address
 * @param {Object} emailAddress
 * @param {Object} verify
 * @return {Deferred} promise
 * @api public
 */
function setAddress(address, emailAddress, verify) {
    var promise,
        errorMessage;
    logger.info(addressType + ' setAddress called');
    logger.secureLog(addressType + ' setAddress called with ' + JSON.stringify(address) + ' emailAddress ' + emailAddress + ' verify ' + verify);
    var deferred = new _.Deferred();
    verify = verify != null ? verify : true;
    Alloy.Router.showActivityIndicator(deferred);
    address = address.toJSON ? address.toJSON() : address;
    // We only want certain fields sent with the request
    var newAddress = {
        first_name : address.first_name,
        last_name : address.last_name,
        address1 : address.address1,
        address2 : address.address2 ? address.address2 : '',
        city : address.city,
        state_code : address.state_code,
        postal_code : address.postal_code,
        country_code : address.country_code,
        phone : address.phone
    };
    if (addressType == 'shipping') {
        promise = currentBasket.setShippingAddressAndEmail(newAddress, {
            email : emailAddress
        }, verify, {
            c_employee_id : Alloy.Models.associate.getEmployeeId()
        });
        errorMessage = _L('Cannot save shipping address or email.');
    } else {
        promise = currentBasket.setBillingAddress(newAddress, verify, {
            c_employee_id : Alloy.Models.associate.getEmployeeId()
        });
        errorMessage = _L('Cannot save billing address.');
    }
    promise.done(function() {
        deferred.resolve();
    }).fail(function(model, params) {
        var fault = model.get('fault');
        var faultHandled = false;
        if (verify) {
            faultHandled = addressVerification(fault, address, updateAddress, emailAddress);
        }
        if (faultHandled === false) {
            // failure, so show an error message
            var paramDataObject = JSON.parse(params.data);
            if (_.has(paramDataObject, 'email') && $.enter_address.getView().getVisible()) {
                $.enter_address.emailError();
            } else {
                if (model.has('fault')) {
                    errorMessage = model.get('fault').message;
                }
                notify(errorMessage, {
                    preventAutoClose : true
                });
            }

            // failure, so show an error message
            if (fault) {
                errorMessage = fault.message;
            }
            notify(errorMessage, {
                preventAutoClose : true
            });
        }
        deferred.reject();
    });
    return deferred.promise();
}

/**
 * updateAddress - a new address needs to be set after address validation
 *
 * @param {Object} newAddress
 * @param {Object} email
 * @api private
 */
function updateAddress(newAddress, email) {
    logger.info(addressType + ' updateAddress called address: ' + JSON.stringify(newAddress) + ' email: ' + email);
    if ($.enter_address.getView().getVisible()) {
        $.enter_address.updateAddress(newAddress);
    }
    setAddress(newAddress, email, false).done(continueCheckout);
}

/**
 * getStorePickupShippingMethod - returns the Store Pickup Shipping method
 *
 * @param methods an array of shipping methods to select from
 * @return {Object} the store pickup shipping method
 * @api private
 */
function getStorePickupShippingMethod(methods) {
    var storePickupMethodIds = Alloy.CFG.ship_to_store.store_pickup_ids;
    if (storePickupMethodIds) {
        for (var i = 0; i < methods.length; i++) {
            if (_.contains(storePickupMethodIds, methods[i].getID())) {
                return methods[i];
            }
        }
    }
    return undefined;
}

/**
 * setShippingMethodForShipToDifferentStore - set the shipping method into the basket for shipping to a different store
 *
 * @param data data that is to be passed to server for shipping to a different store
 * @return {Deferred} promise
 * @api private
 */
function setShippingMethodForShipToDifferentStore(data) {
    var deferred = new _.Deferred();
    var promise = currentBasket.getShippingMethods({
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    });
    Alloy.Router.showActivityIndicator(deferred);
    promise.done(function() {
        var methods = currentBasket.getAvailableShippingMethods();
        if (methods && methods.length > 0) {
            var storePickupShippingMethod = getStorePickupShippingMethod(methods);
            if (!storePickupShippingMethod) {
                Alloy.Dialog.showAlertDialog({
                    messageString : _L('Store pickup shipping methods have not been configured'),
                    titleString : _L('Shipping Method Error')
                });
                deferred.reject();
                return;
            }
            var method = {
                id : storePickupShippingMethod.getID()
            };
            var customData = {
                c_employee_id : Alloy.Models.associate.getEmployeeId(),
                c_isDifferentStorePickup : data.isDifferentStorePickup,
                c_pickupFromStoreId : data.pickupFromStoreId,
                c_message : data.message
            };
            currentBasket.setDifferentStorePickupMessage(data.message);
            currentBasket.setShippingMethod(method, undefined, customData).done(function() {
                // remove any shipping overrides since this is ship to store
                removeShippingOverride().done(function() {
                    var state = currentBasket.getNextCheckoutState();
                    if (state == 'shippingMethod') {
                        state = currentBasket.checkoutStates[currentBasket.checkoutStates.indexOf(currentBasket.getCheckoutStatus()) + 2];
                    }
                    logger.info(addressType + ' moving to ' + state);
                    currentBasket.setCheckoutStatus(state);
                    deferred.resolve();
                }).fail(function(model) {
                    var fault = model.get('fault');
                    if (fault && fault.message && fault.message != '') {
                        notify(fault.message, {
                            preventAutoClose : true
                        });
                    }
                    deferred.reject();
                });
            }).fail(function(model) {
                var fault = model.get('fault');
                if (fault && fault.message && fault.message != '') {
                    notify(fault.message, {
                        preventAutoClose : true
                    });
                }
                deferred.reject();
            });
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise();
}

/**
 * removeShippingOverride - remove a shipping price override
 *
 * @return {Deferred} promise
 * @api private
 */
function removeShippingOverride() {
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
    promise.fail(function() {
        Alloy.Dialog.showAlertDialog({
            messageString : _L('Unable to remove shipping override'),
            titleString : _L('Basket Error')
        });
    });
    return promise;
}

/**
 * continueCheckout - continue checkout after saving address
 *
 * @param data optional object containing data to determine next screen
 * @api private
 */
function continueCheckout(data) {
    logger.info(addressType + ' continueCheckout called ');

    if ($.enter_address.getView().getVisible()) {
        var newAddress = currentBasket.getAddress(addressType).toJSON();
        // remove the id that the basket returns
        delete newAddress.id;
        $.enter_address.saveNewAddress(newAddress);
    }
    // depending on the server results, trigger an event to index.js
    if (currentBasket.canEnableCheckout()) {
        var state = currentBasket.getNextCheckoutState();
        // if we are shipping to a different store, bypass the shippingMethod tab
        if (data && data.hasOwnProperty('isDifferentStorePickup') && data.isDifferentStorePickup && (state == 'shippingMethod' || state == 'askBillingAddress')) {
            if (addressType == 'shipping') {
                setShippingMethodForShipToDifferentStore(data);
            } else if (addressType == 'billing') {
                if (state == 'shippingMethod') {
                    state = currentBasket.checkoutStates[currentBasket.checkoutStates.indexOf(currentBasket.getCheckoutStatus()) + 2];
                }
                logger.info(addressType + ' moving to ' + state);
                currentBasket.setCheckoutStatus(state);
            }
        } else {
            logger.info(addressType + ' moving to ' + state);
            currentBasket.setCheckoutStatus(state);
        }
    } else {
        $.trigger('checkoutDisabled');
    }
}

/**
 * resolvedAPromise - resolve a new promise
 *
 * @return {Deferred} promise
 * @api private
 */
function resolvedAPromise() {
    var deferred = new _.Deferred();
    deferred.resolve();
    return deferred.promise();
}

/**
 * hideEnterAddress - Hide the enter address view
 *
 * @api private
 */
function hideEnterAddress() {
    $.enter_address.getView().hide();
    $.enter_address.getView().setHeight(0);
    $.enter_address.getView().setWidth(0);
    $.enter_address.closeKeyboard();
}

/**
 * showEnterAddress - Show the enter address view
 *
 * @api private
 */
function showEnterAddress() {
    $.enter_address.getView().show();
    $.enter_address.getView().setHeight(Ti.UI.SIZE);
    $.enter_address.getView().setWidth(Ti.UI.SIZE);
}

/**
 * hideChooseAddress - Hide the choose address view
 *
 * @api private
 */
function hideChooseAddress() {
    $.choose_address.getView().hide();
    $.choose_address.getView().setHeight(0);
    $.choose_address.getView().setWidth(0);
}

/**
 * showChooseAddress - Show the choose address view
 *
 * @api private
 */
function showChooseAddress() {
    $.choose_address.getView().show();
    $.choose_address.getView().setHeight(Ti.UI.SIZE);
    $.choose_address.getView().setWidth(Ti.UI.SIZE);
}

/**
 * showDifferentStorePickupAddress - show pickup elsewhere address view
 *
 * @api private
 */
function showDifferentStorePickupAddress() {
    if (shouldDisplayDifferentStorePickupAddress()) {
        $.different_store_pickup_address.getView().show();
        $.different_store_pickup_address.getView().setHeight(Ti.UI.SIZE);
        $.different_store_pickup_address.getView().setWidth(Ti.UI.SIZE);
    }

}

/**
 * hideDifferentStorePickupAddress - hide pickup elsewhere address view
 *
 * @api private
 */
function hideDifferentStorePickupAddress() {
    if (shouldDisplayDifferentStorePickupAddress()) {
        $.different_store_pickup_address.getView().hide();
        $.different_store_pickup_address.getView().setHeight(0);
        $.different_store_pickup_address.getView().setWidth(0);
        $.different_store_pickup_address.closeKeyboard();
    }
}

/**
 * getThisStoreAddressModel - return the current store's address
 *
 * @return {Object} store address
 * @api private
 */
function getThisStoreAddressModel() {
    var basketAddress = currentBasket.getAddress(addressType);
    var storeAddress = Alloy.Models.storeInfo.constructStoreAddress();
    var origAddress1 = storeAddress.address1;
    storeAddress.address1 = storeAddress.last_name;
    storeAddress.first_name = currentCustomer.getFirstName();
    storeAddress.last_name = currentCustomer.getLastName();
    storeAddress.address2 = origAddress1 + (storeAddress.address2 ? ', ' + storeAddress.address2 : '');
    if (currentCustomer.getPhone()) {
        storeAddress.phone = currentCustomer.getPhone();
    } else {
        storeAddress.phone = '';
        // empty out the store phone number so that the associate enters a customer phone number.
    }

    if (basketAddress) {
        storeAddress.first_name = basketAddress.getFirstName();
        storeAddress.last_name = basketAddress.getLastName();
        storeAddress.phone = basketAddress.getPhone();
    }

    storeAddress.shipToStore = true;

    return Alloy.createModel('customerAddress', storeAddress);
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * addressEntered - address has been selected by the user, either on choose address or enter address form
 *
 * @param {Object} data
 * @api private
 */
function addressEntered(data) {
    logger.info(addressType + ' addressEntered called');
    logger.secureLog(JSON.stringify(data));
    // need to set basket address before doing validation as the shipping
    // address is obtained from the basket by the storefront api call
    if (addressType === 'shipping') {
        currentBasket.setShipToStore(data.isShipToStore);
        if (data.hasOwnProperty('isDifferentStorePickup')) {
            currentBasket.setDifferentStorePickup(data.isDifferentStorePickup);
        } else {
            currentBasket.setDifferentStorePickup(false);

        }
    }
    setAddress(data.address, data.email).done(function() {
        if (!data.hasOwnProperty('isDifferentStorePickup')) {
            data.isDifferentStorePickup = false;
        }
        continueCheckout(data);
    });
    // if setAddress fails, then it will be handled in that function and continueCheckout will not be called which is what we want
}

/**
 * handleShipToStore - Show enter address form view prefilled with store address when the checkbox for ship to store is selected
 *
 * @return {Deferred} promise
 * @api private
 */
function handleShipToStore() {
    // rendering the different forms with the current customer data all at the beginning
    var model = getThisStoreAddressModel();
    var email = currentBasket.getCustomerEmail() || currentCustomer.getEmail();
    currentCustomer.isLoggedIn() && $.choose_address.render();
    $.enter_address.render(model, email, true);
    hideChooseAddress();
    hideDifferentStorePickupAddress();
    showEnterAddress();
    if (shouldDisplayShippingOptionPicker()) {
        $.shipping_option_picker.checkShipToStore();
    }
    return resolvedAPromise();
}

/**
 * setDifferentStorePickupAddress - set the pickup elsewhere currently logged in customer
 *
 * @return {Deferred} promise
 * @api private
 */
function setDifferentStorePickupAddress() {
    if (Alloy.CFG.alternate_shipping_options.order_pickup_different_store) {
        currentCustomer.isLoggedIn() && $.choose_address.render();
        // prerender all the views for each selection
        var address = {};
        if (currentBasket.getShippingAddress()) {
            address = {
                first_name : currentBasket.getShippingAddress().getFirstName(),
                last_name : currentBasket.getShippingAddress().getLastName(),
                phone : currentBasket.getShippingAddress().getPhone(),
                email_address : currentBasket.getCustomerEmail(),
                message : currentBasket.getDifferentStorePickupMessage() || ''
            };
        } else {
            address = {
                first_name : currentCustomer.getFirstName(),
                last_name : currentCustomer.getLastName(),
                phone : currentCustomer.getPhone(),
                email_address : currentCustomer.getEmail() || currentBasket.getCustomerEmail() || '',
                message : currentBasket.getDifferentStorePickupMessage() || ''
            };
        }
        $.different_store_pickup_address.setAddress(address);
    }
    return resolvedAPromise();
}

/**
 * handleDifferentStorePickupAddress - Show pickup elsewhere address
 *
 * @return {Deferred} promise
 * @api private
 */
function handleDifferentStorePickupAddress() {
    if (shouldDisplayDifferentStorePickupAddress()) {
        hideChooseAddress();
        hideEnterAddress();
        showDifferentStorePickupAddress();
        setDifferentStorePickupAddress();
        if (shouldDisplayShippingOptionPicker()) {
            $.shipping_option_picker.checkDifferentStorePickup();
        }
    }
    return resolvedAPromise();
}

/**
 * handleShipToAddress - Show either choose or enter address view  when the checkbox for ship to address is selected
 *
 * @api private
 */
function handleShipToAddress() {
    hideDifferentStorePickupAddress();
    if (currentCustomer.isLoggedIn()) {
        hideEnterAddress();
        showChooseAddress();
    } else {
        $.enter_address.render();
        hideChooseAddress();
        showEnterAddress();
    }
}

/**
 * shouldDisplayShippingOptionPicker -  return true if shipping option picker should be displayed
 *
 * @return {Boolean}
 * @api private
 */
function shouldDisplayShippingOptionPicker() {
    return (($.args.addressType === 'shipping') && (Alloy.CFG.alternate_shipping_options.order_pickup_current_store || Alloy.CFG.alternate_shipping_options.order_pickup_different_store));
}

/**
 * shouldDisplayDifferentStorePickupAddress -  return true if pickup elsewhere form shoud be displayed
 *
 * @return {Boolean}
 * @api private
 */
function shouldDisplayDifferentStorePickupAddress() {
    return (($.args.addressType === 'shipping') && Alloy.CFG.alternate_shipping_options.order_pickup_different_store);
}

/**
 * hasAnythingChanged - Check if the current form being displayed has changed
 *
 * @return {Boolean} true if anything in the form changed by the user
 * @api private
 */
function hasAnythingChanged() {
    if (currentBasket.getCheckoutStatus() === 'shippingAddress') {
        if (($.shipping_option_picker.isShipToAddressChecked() || $.shipping_option_picker.isShipToCurrentStoreChecked()) && $.enter_address.getView().getVisible()) {
            return $.enter_address.hasAnythingChanged();
        } else if ($.shipping_option_picker.isDifferentStorePickupChecked() && $.different_store_pickup_address.getView().getVisible()) {
            if ($.different_store_pickup_address.isAddressFormVisible()) {
                return $.different_store_pickup_address.hasAnythingChanged();
            } else {
                return false;
            }
        }
    }
    return false;
}

//---------------------------------------------------
// ## CONSTRUCTOR

if (shouldDisplayShippingOptionPicker()) {
    // Attach hasAnythingChanged to shipping_option_picker controller
    $.shipping_option_picker.hasAnythingChanged = hasAnythingChanged;
}
