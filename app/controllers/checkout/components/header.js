// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/header.js - Controller for the header tabs in the checkout workflow
 */

//---------------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;
var returnToShopping = require('EAUtils').returnToShopping;

var inactiveBackgroundColor = Alloy.Styles.tabs.backgroundColorDisabled;
var activeBackgroundColor = Alloy.Styles.tabs.backgroundColorEnabled;
var inactiveBorderColor = Alloy.Styles.color.border.darker;
var EAUtils = require('EAUtils');

var differentStoreSelectedForPickup = false;

// Localization constant
var tabTextLength = 13;

//---------------------------------------------------
// ## APP LISTENERS

// once we're on the payments page, back button cannot be used
// when the order has been cancelled, reenable the back button
$.listenTo(Alloy.eventDispatcher, 'payments_active', function(event) {
    $.back_button.setEnabled(!event.payments_active);
});

// when the order has been fulfilled, reenable the back button
$.listenTo(Alloy.eventDispatcher, 'order_just_created', function() {
    $.back_button.setEnabled(true);
});

// after configurations have changed, header tabs may have to be adjusted
$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', function() {
    var buttonWidth;
    if (Alloy.CFG.payment_entry === 'web') {
        buttonWidth = 130;
        $.checkout_billing_address_button.setWidth(buttonWidth);
        $.checkout_billing_address_button.setVisible(true);
        $.checkout_address_button.setTitle(_L('Shipping'));
        $.checkout_shipping_methods_button.setTitle(_L('Ship Methods'));
        $.checkout_payments_button.setVisible(false);
        $.checkout_payments_button.setWidth(0);
    } else if (Alloy.CFG.payment_entry === 'default') {
        buttonWidth = Alloy.CFG.collect_billing_address ? 108 : 130;
        if (Alloy.CFG.collect_billing_address) {
            $.checkout_billing_address_button.setWidth(buttonWidth);
            $.checkout_billing_address_button.setVisible(true);
            $.checkout_address_button.setTitle(_L('Shipping'));
            $.checkout_shipping_methods_button.setTitle(_L('Ship Methods'));
            $.checkout_shipping_methods_button.setWidth(110);
        } else {
            $.checkout_billing_address_button.setWidth(0);
            $.checkout_billing_address_button.setVisible(false);
            $.checkout_address_button.setTitle(_L('Address'));
            $.checkout_shipping_methods_button.setTitle(_L('Shipping'));
            $.checkout_shipping_methods_button.setWidth(buttonWidth);
        }
        $.checkout_payments_button.setWidth(buttonWidth);
    }

    $.checkout_cart_button.setWidth(buttonWidth);
    $.checkout_address_button.setWidth(buttonWidth);
    $.checkout_confirmation_button.setWidth(buttonWidth);

    if ($.checkout_cart_button.getTitle().length > tabTextLength || $.checkout_address_button.getTitle().length > tabTextLength || $.checkout_billing_address_button.getTitle().length > tabTextLength || $.checkout_shipping_methods_button.getTitle().length > tabTextLength || $.checkout_payments_button.getTitle().length > tabTextLength || $.checkout_confirmation_button.getTitle().length > tabTextLength) {
        var tabFont = Alloy.Styles.detailLabelFontSmall;
        if (EAUtils.isLatinBasedLanguage()) {
            tabFont = Alloy.Styles.lineItemLabelFontSmallest;
        }
        $.checkout_cart_button.setFont(tabFont);
        $.checkout_address_button.setFont(tabFont);
        $.checkout_billing_address_button.setFont(tabFont);
        $.checkout_shipping_methods_button.setFont(tabFont);
        $.checkout_payments_button.setFont(tabFont);
        $.checkout_confirmation_button.setFont(tabFont);
    }

});

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'shippingOption:differentStorePickupAddress', differentStorePickupSelected);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToCurrentStore', addressOrCurrentStorePickupSelected);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToAddress', addressOrCurrentStorePickupSelected);
$.listenTo(Alloy.eventDispatcher, 'differentStorePickupAddress:reconfirmAddress', onBasketChangeWhileDifferentStoreShippingAddressSet);
$.listenTo(Alloy.eventDispatcher, 'cart_cleared', updateTabStates);

//---------------------------------------------------
// ## UI EVENT LISTENERS

// listeners for each of the tab headers. Each will trigger an event to index.js that says which page to go to
$.checkout_cart_button.addEventListener('click', onCheckoutCartClick);

$.checkout_address_button.addEventListener('click', onAddressClick);

$.checkout_billing_address_button.addEventListener('click', onBillingClick);

$.checkout_shipping_methods_button.addEventListener('click', onShippingClick);

$.checkout_payments_button.addEventListener('click', onPaymentsClick);

$.checkout_confirmation_button.addEventListener('click', onConfirmationClick);

$.back_button.addEventListener('click', returnToShopping);

//---------------------------------------------------
// ## MODEL LISTENERS

// when there's a change in the product items in the cart, some display elements will have to be updated
$.listenTo(currentBasket, 'change:product_items reset:product_items change:shipments reset:shipments change:enable_checkout saved_products:downloaded', function() {
    updateTabStates();
});

// when there's a change in the current customer's logged in status, update the tabs
$.listenTo(currentCustomer, 'change', function() {
    updateTabStates();
});

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.updateTabStates = updateTabStates;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    // removes all $.listenTo events
    $.stopListening();
    $.checkout_cart_button.removeEventListener('click', onCheckoutCartClick);
    $.checkout_address_button.removeEventListener('click', onAddressClick);
    $.checkout_billing_address_button.removeEventListener('click', onBillingClick);
    $.checkout_shipping_methods_button.removeEventListener('click', onShippingClick);
    $.checkout_payments_button.removeEventListener('click', onPaymentsClick);
    $.checkout_confirmation_button.removeEventListener('click', onConfirmationClick);
    $.back_button.removeEventListener('click', returnToShopping);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * canCheckout - determine if the cart can checkout
 *
 * @api private
 */
function canCheckout() {
    return currentBasket.getProductItems().length > 0 && currentBasket.canEnableCheckout();
}

/**
 * setTabsEnabledSelected - sets the given tabs to be enabled and selected
 *
 * @params {Object} tabs
 * @api private
 */
function setTabsEnabledSelected(tabs) {
    // use multiple _.each calls to make the visual transition more uniform
    _.each(tabs, function(tab) {
        if (!tab.getEnabled()) {
            tab.setEnabled(true);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBackgroundColor() != activeBackgroundColor) {
            tab.setBackgroundColor(activeBackgroundColor);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBorderColor() != activeBackgroundColor) {
            tab.setBorderColor(activeBackgroundColor);
        }
    });
}

/**
 * setTabsEnabledUnselected - sets the given tabs to be enabled and unselected
 *
 * @params {Object} tabs
 * @api private
 */
function setTabsEnabledUnselected(tabs) {
    // use multiple _.each calls to make the visual transition more uniform
    _.each(tabs, function(tab) {
        if (!tab.getEnabled()) {
            tab.setEnabled(true);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBackgroundColor() != inactiveBackgroundColor) {
            tab.setBackgroundColor(inactiveBackgroundColor);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBorderColor() != inactiveBorderColor) {
            tab.setBorderColor(inactiveBorderColor);
        }
    });
}

/**
 * setTabsDisabledUnselected - sets the given tabs to be disabled and unselected
 *
 * @params {Object} tabs
 * @api private
 */
function setTabsDisabledUnselected(tabs) {
    // use multiple _.each calls to make the visual transition more uniform
    _.each(tabs, function(tab) {
        if (tab.getEnabled()) {
            tab.setEnabled(false);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBackgroundColor() != inactiveBackgroundColor) {
            tab.setBackgroundColor(inactiveBackgroundColor);
        }
    });
    _.each(tabs, function(tab) {
        if (tab.getBorderColor() != inactiveBorderColor) {
            tab.setBorderColor(inactiveBorderColor);
        }
    });
}

/**
 * updateTabStates - updates the states of the tabs to reflect the valid choices
 *
 * @api public
 */

function updateTabStates() {
    if (!currentBasket.has('checkout_status')) {
        return;
    }

    var needsBillingAddress = Alloy.CFG.collect_billing_address ? !currentBasket.getBillingAddress() : false;

    switch(currentBasket.getCheckoutStatus()) {
    case 'cart':
        var enabledUnselected = [];
        var disabledUnselected = [$.checkout_payments_button, $.checkout_confirmation_button];
        setTabsEnabledSelected([$.checkout_cart_button]);
        // shipping address buton
        currentBasket.getProductItems().length > 0 ? enabledUnselected.push($.checkout_address_button) : disabledUnselected.push($.checkout_address_button);
        //billing address button
        currentBasket.getShippingAddress() && canCheckout() ? enabledUnselected.push($.checkout_billing_address_button) : disabledUnselected.push($.checkout_billing_address_button);
        // shipping method button
        currentBasket.getShippingAddress() && canCheckout() ? setTabsEnabledUnselected([$.checkout_billing_address_button]) : setTabsDisabledUnselected([$.checkout_billing_address_button]);
        if (currentBasket.getShippingAddress() && canCheckout()) {
            !needsBillingAddress ? enabledUnselected.push($.checkout_shipping_methods_button) : disabledUnselected.push($.checkout_shipping_methods_button);
        } else {
            disabledUnselected.push($.checkout_shipping_methods_button);
        }
        setTabsEnabledUnselected(enabledUnselected);
        setTabsDisabledUnselected(disabledUnselected);
        if (currentBasket.getShippingAddress() && currentBasket.getDifferentStorePickup()) {
            onBasketChangeWhileDifferentStoreShippingAddressSet();
        }
        break;
    case 'shippingAddress':
        if (currentBasket.canEnableCheckout()) {// need to do extra check here in case inventory drops below available quantity when on cart page
            setTabsEnabledUnselected([$.checkout_cart_button]);
            setTabsEnabledSelected([$.checkout_address_button]);
            var enabledUnselected = [];
            var disabledUnselected = [$.checkout_payments_button, $.checkout_confirmation_button];
            // billing address button
            currentBasket.getShippingAddress() && canCheckout ? enabledUnselected.push($.checkout_billing_address_button) : disabledUnselected.push($.checkout_billing_address_button);
            // shipping methods button
            canCheckout() && currentBasket.getShippingAddress() && !needsBillingAddress ? enabledUnselected.push($.checkout_shipping_methods_button) : disabledUnselected.push($.checkout_shipping_methods_button);
            setTabsEnabledUnselected(enabledUnselected);
            setTabsDisabledUnselected(disabledUnselected);

            if (currentBasket.getShippingAddress() && currentBasket.getDifferentStorePickup()) {
                onBasketChangeWhileDifferentStoreShippingAddressSet();
            }
        }
        break;
    case 'askBillingAddress':
        if (currentBasket.canEnableCheckout()) {// need to do extra check here in case inventory drops below available quantity when on cart page
            setTabsEnabledUnselected([$.checkout_cart_button]);
            setTabsEnabledSelected([$.checkout_address_button]);
            setTabsDisabledUnselected([$.checkout_billing_address_button, $.checkout_shipping_methods_button, $.checkout_payments_button, $.checkout_confirmation_button]);
        }
        break;
    case 'billingAddress':
        if (currentBasket.canEnableCheckout()) {// need to do extra check here in case inventory drops below available quantity when on cart page
            setTabsEnabledUnselected([$.checkout_cart_button, $.checkout_address_button]);
            setTabsEnabledSelected([$.checkout_billing_address_button]);
            canCheckout() && currentBasket.getShippingAddress() && currentBasket.getBillingAddress() && !differentStoreSelectedForPickup ? setTabsEnabledUnselected([$.checkout_shipping_methods_button]) : setTabsDisabledUnselected([$.checkout_shipping_methods_button]);
            setTabsDisabledUnselected([$.checkout_payments_button, $.checkout_confirmation_button]);
        }
        break;
    case 'shippingMethod':
        if (currentBasket.canEnableCheckout()) {// need to do extra check here in case inventory drops below available quantity when on cart page
            setTabsEnabledUnselected([$.checkout_cart_button]);
            canCheckout() ? setTabsEnabledUnselected([$.checkout_address_button, $.checkout_billing_address_button]) : setTabsDisabledUnselected([$.checkout_address_button, $.checkout_billing_address_button]);
            setTabsEnabledSelected([$.checkout_shipping_methods_button]);
            setTabsDisabledUnselected([$.checkout_payments_button, $.checkout_confirmation_button]);
        }
        break;
    case 'ask':
        if (currentBasket.canEnableCheckout()) {// need to do extra check here in case inventory drops below available quantity when on cart page
            // when paying through the web, can't go anywhere else
            setTabsDisabledUnselected([$.checkout_cart_button, $.checkout_address_button, $.checkout_shipping_methods_button, $.checkout_confirmation_button]);
        }
        break;
    case 'payments':
        setTabsDisabledUnselected([$.checkout_cart_button, $.checkout_address_button, $.checkout_billing_address_button, $.checkout_shipping_methods_button, $.checkout_confirmation_button]);
        setTabsEnabledSelected([$.checkout_payments_button]);
        break;
    case 'confirmation':
        setTabsDisabledUnselected([$.checkout_address_button, $.checkout_billing_address_button, $.checkout_shipping_methods_button, $.checkout_payments_button]);
        setTabsEnabledUnselected([$.checkout_cart_button]);
        setTabsEnabledSelected([$.checkout_confirmation_button]);
        break;
    }
}

/**
 * differentStorePickupSelected - event handler for shippingOption:differentStorePickupSelected
 *
 * @api private
 */
function differentStorePickupSelected() {
    differentStoreSelectedForPickup = true;
    updateTabStates();
}

/**
 * addressOrCurrentStorePickupSelected - event handler for shippingOption:shipToCurrentStore
 *
 * @api private
 */
function addressOrCurrentStorePickupSelected() {
    differentStoreSelectedForPickup = false;
    updateTabStates();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCheckoutCartClick - Checkout tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onCheckoutCartClick(event) {
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('cart');
}

/**
 * onAddressClick - Address tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onAddressClick(event) {
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('shippingAddress');
}

/**
 * onBillingClick - Billing tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onBillingClick(event) {
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('billingAddress');
}

/**
 * onShippingClick - Shipping tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onShippingClick(event) {
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('shippingMethod');
}

/**
 * onPaymentsClick - Payments tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onPaymentsClick(event) {
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('payments');
}

/**
 * onConfirmationClick - Confirmation tab clicked
 *
 * @param {Object} event
 * @api private
 */
function onConfirmationClick(event) {
    event.cancelBubble = true;
    currentBasket.setCheckoutStatus('confirmation');
}

/**
 * onBasketChangeWhileDifferentStoreShippingAddressSet - Disable some tabs when the basket is changed while there is a shipping address for a different store pickup already set
 *
 * @api private
 */
function onBasketChangeWhileDifferentStoreShippingAddressSet() {
    var needsBillingAddress = Alloy.CFG.collect_billing_address ? !currentBasket.getBillingAddress() : false;
    if (Alloy.CFG.collect_billing_address) {
        if (needsBillingAddress) {
            setTabsDisabledUnselected([$.checkout_billing_address_button, $.checkout_shipping_methods_button, $.checkout_payments_button, $.checkout_confirmation_button]);
        }
        else {
            setTabsEnabledUnselected([$.checkout_billing_address_button]);
            setTabsDisabledUnselected([$.checkout_shipping_methods_button, $.checkout_payments_button, $.checkout_confirmation_button]);
        }
    } else {
        setTabsDisabledUnselected([$.checkout_shipping_methods_button, $.checkout_payments_button, $.checkout_confirmation_button]);
    }

}
