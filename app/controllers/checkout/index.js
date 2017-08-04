// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/index.js - Index page for checkout tab windows
 */

//---------------------------------------------------
// ## VARIABLES

var safariDialog = null;
var currentCustomer = Alloy.Models.customer;
var currentBasket = Alloy.Models.basket;
var currentAssociate = Alloy.Models.associate;
var checkoutStates = Alloy.Models.basket.checkoutStates;
var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var eaUtils = require('EAUtils');
var analytics = require('analyticsBase');
var webOrderDeferred = null;
var processingWebOrder = false;
var logger = require('logging')('checkout:index', getFullControllerPath($.__controllerPath));

var customerIsLoggedIn = currentCustomer.hasCustomerNumber() ? true : false;
var toCountryCode = eaUtils.countryNameToCountryCode;
var getAddressNickname = eaUtils.getAddressNickname;
var savedItemsDisplayed = false;
var currentPage = 0;
var wishListItemsDisplayed = false;
var tokenHash = {};

//---------------------------------------------------
// ## APP LISTENERS

// when an associate logs out, cancel the order if there is one
$.listenTo(Alloy.eventDispatcher, 'associate_logout', function() {
    abandonOrder();
});

// listen for the cart cleared event and reinitialize the cart
$.listenTo(Alloy.eventDispatcher, 'cart_cleared', function() {
    render();
    updateCheckoutButton();
});

// listen for hideAuxillaryViews and close browser window
$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', function() {
    closeSafariDialog();
});

// handle the post login changes
$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', function() {
    /* set the checkout states */
    if (Alloy.CFG.payment_entry === 'web') {
        checkoutStates = ['cart', 'shippingAddress', 'askBillingAddress', 'billingAddress', 'shippingMethod', 'payThroughWeb', 'confirmation'];
    } else if (Alloy.CFG.payment_entry === 'default') {
        checkoutStates = Alloy.CFG.collect_billing_address ? ['cart', 'shippingAddress', 'askBillingAddress', 'billingAddress', 'shippingMethod', 'payments', 'confirmation'] : ['cart', 'shippingAddress', 'shippingMethod', 'payments', 'confirmation'];
    }
    currentBasket.setCheckoutStates(checkoutStates);
});

$.listenTo(Alloy.eventDispatcher, 'payment:check_signature', showCheckSignature);

$.listenTo(Alloy.eventDispatcher, 'payment:prompt_signature', showPromptSignature);

// fired when all necessary payments have been applied, so the balance is now 0 and the order has been placed
$.listenTo(Alloy.eventDispatcher, 'order_just_created', handleOrderCompletion);

// listen for events related to the pay through web,
// This is how control comes back to the app after being in the browser for pay through web
$.listenTo(Alloy.eventDispatcher, 'appLaunch:browserUrl', function(event) {
    if (!processingWebOrder) {
        // sometimes app resume comes back with an old url and we have already processed the web order
        return;
    }

    var url = decodeURI(event.url);
    logger.info('Received external launch event: ' + url);

    var index = url.indexOf('?');
    if (index == -1) {
        return;
    }

    // parse the url parameters out of the url
    var paramObj = {};
    var params = url.substr(index + 1).split('&');
    _.each(params, function(param) {
        var parts = param.split('=');
        var key = parts[0];
        var value = '';
        if (parts.length > 1) {
            value = parts[1];
        }
        paramObj[key] = value;
    });

    // if there is no token param, don't do anything
    var token = paramObj['token'];
    if (!token) {
        return;
    }

    // lookup order using token and verify it is the current order
    var orderToken = paramObj['token'];
    var orderNo = null;

    if (orderToken && tokenHash[orderToken]) {
        orderNo = tokenHash[orderToken];
        delete tokenHash[orderToken];
    } else {
        logger.info('Order token does not match, ignoring invalid token.');
        return;
    }

    // check if the request is to cancel the order
    if (paramObj.hasOwnProperty('action') && paramObj['action'] == 'cancel' || paramObj['action'] == 'timeout' || paramObj['action'] == 'confirmCancelledOrder') {
        // remove the pay through web browser
        if (closeSafariDialog()) {
            if (paramObj['action'] == 'timeout') {
                notify(_L('Server call failed. Please try again.'), {
                    preventAutoClose : true
                });
            }
            // if it was already closed then we don't need to cancel the web order
            cancelWebOrder(orderNo, paramObj['action']).always(function() {
                webOrderDeferred.resolve();
            });
        }
    } else if (paramObj.hasOwnProperty('action') && paramObj['action'] == 'confirm') {
        // remove the pay through web browser
        closeSafariDialog();

        var b = currentBasket.clone();
        currentBasket.clear({
            silent : true
        });
        // reset the basket
        logger.info('fetching full basket');
        currentBasket.getBasket({
            c_eaEmployeeId : Alloy.Models.associate.getEmployeeId()
        }).done(function() {
            if (currentCustomer.isLoggedIn()) {
                currentCustomer.claimBasket(currentBasket).done(function() {
                    finishFetchOrder(orderNo);
                }).fail(function() {
                    deferred.reject();
                });
            } else {
                finishFetchOrder(orderNo);
            }
        }).always(function() {
            webOrderDeferred.resolve();
        });
    }
});

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.checkout_button.addEventListener('click', onCheckoutButtonClick);

// fired when the basket has 'enable_checkout' set to false after having set the shipping method. This can happen
// when the server determines checkout cannot go any further due to, for example, an inventory issue
$.listenTo($.shipping_method, 'checkoutDisabled', function() {
    currentBasket.setCheckoutStatus('cart');
});

// fired when the basket has 'enable_checkout' set to false after having set the shipping address. This can happen
// when the server determines checkout cannot go any further due to, for example, an inventory issue
$.listenTo($.shipping_address, 'checkoutDisabled', function() {
    currentBasket.setCheckoutStatus('cart');
});

// fired when the basket has 'enable_checkout' set to false after having set the billing address. This can happen
// when the server determines checkout cannot go any further due to, for example, an inventory issue
$.listenTo($.billing_address, 'checkoutDisabled', function() {
    currentBasket.setCheckoutStatus('cart');
});

// fired when the shipping override button on the shipping method page is selected. Show the shipping override overlay.
$.listenTo($.shipping_method, 'shippingOverride', function(args) {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/shippingMethod/shippingOverrides',
        continueEvent : 'shippingOverride:dismiss',
        initOptions : {
            selectedOverride : args.selectedShippingOverride,
            selectedMethod : args.selectedShippingMethod
        }
    });
});

$.listenTo($.confirmation, 'orderAbandoned', handleOrderAbandoned);

// fired when the 'cancel order' button on the payments page is selected. Go back to the cart page.
$.listenTo($.payments, 'orderAbandoned', handleOrderAbandoned);

// fired when there's an error encountered on the payments page
$.listenTo($.payments, 'payment:error', function(error) {
    Alloy.Dialog.showConfirmationDialog({
        messageString : error.message,
        titleString : error.title,
        hideCancel : true,
        okFunction : function() {
            // close the payment terminal
            dismissPaymentTerminal();
        }
    });
});

$.listenTo($.payments, 'payment:success', function(success) {
    Alloy.Dialog.showConfirmationDialog({
        messageString : success.message,
        titleString : success.title,
        hideCancel : true,
        okFunction : function() {
            if (success.completionFunction) {
                success.completionFunction();
            }
        }
    });
});

// fired to show the balance of a gift card
$.listenTo($.payments, 'payment:gc_balance', openGCBalanceModal);

// fired to show the 'use payment terminal' overlay when a payment type has been selected
$.listenTo($.payments, 'payment:use_terminal', function(args) {
    // if the payment device has not been connected we do not want this to continue
    Alloy.Router.checkPaymentDevice().done(function() {
        args = _.extend(args, {
            hideManualEntry : (paymentMethodType == 'giftCard') ? true : false
        });
        $.payment_terminal = Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/payments/paymentTerminal',
            continueEvent : 'payment_terminal:dismiss',
            initOptions : args,
            continueFunction : function() {
                $.payment_terminal = null;
                $.payments.stopPaymentListening();
            }
        });
    });
    // fail not needed because the checkPaymentDevice will put up a dialog to user if terminal not connected
});

$.listenTo($.cart, 'cart:display', function(event) {
    savedItemsDisplayed = event.savedItemsDisplayed;
    wishListItemsDisplayed = event.wishListItemsDisplayed;
    updateCheckoutButton();
    render();
});

//---------------------------------------------------
// ## MODEL LISTENERS

// when there's a change in the basket's checkout status, determine which page/tab to display
$.listenTo(currentBasket, 'change:checkout_status', function() {
    logger.info('Responding to change in checkoutStatus');
    // on the cart page, show the checkout button; otherwise hide
    updateCheckoutButton();

    if (currentBasket.getCheckoutStatus() == 'shippingAddress' && currentBasket.getLastCheckoutStatus() == 'cart') {
        moveFromCartToShippingAddress();
    } else if (currentBasket.getCheckoutStatus() == 'askBillingAddress' && currentBasket.getLastCheckoutStatus() == 'shippingAddress') {
        moveFromShippingToBillingAddress();
    } else {
        handlePageSelection({
            page : currentBasket.getCheckoutStatus()
        });
    }
});

// when there's a change in the basket's shipments (either shipping address or shipping method), change which
// sections in the right hand page are shown
$.listenTo(currentBasket, 'change:shipments reset:shipments', function(type, model, something, options) {
    logger.info('Responding to change in shipments or reset shipments');
    updateCheckoutButton();
});

// when there's a change in the current customer's logged in status, go back to the cart page
$.listenTo(currentCustomer, 'change', function() {
    logger.info('Responding to customer change');
    var customerNowLoggedIn = currentCustomer.hasCustomerNumber() ? true : false;

    if (customerNowLoggedIn != customerIsLoggedIn) {
        currentBasket.setCheckoutStatus('cart');
    }
    customerIsLoggedIn = customerNowLoggedIn;
});

// when there's a change in the product items in the cart, some display elements will have to be updated
$.listenTo(currentBasket, 'change:product_items reset:product_items change:enable_checkout', function() {
    logger.info('Responding to change or reset product_items');
    // checkout button shouldn't be enabled if there are no products in the cart
    updateCheckoutButton();
});

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    $.shipping_address.init();
    $.billing_address.init();
    render();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('render called');
    currentBasket.setCheckoutStatus('cart');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    if (safariDialog) {
        safariDialog.removeEventListener('open', onSafariOpen);
        safariDialog.removeEventListener('close', onSafariClose);
    }
    // removes all listenTo events
    $.stopListening();
    $.checkout_button.removeEventListener('click', onCheckoutButtonClick);

    // deinit required views
    $.shipping_method.deinit();
    $.shipping_address.deinit();
    $.billing_address.deinit();
    $.header.deinit();
    $.cart.deinit();
    $.payments.deinit();
    $.confirmation.deinit();
    $.order_totals.deinit();
    $.promotions.deinit();
    $.basket_shipping_details.deinit();
    $.entered_payments.deinit();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * hideAllPages - hide all pages if the checkout status is null
 *
 * @api private
 */
function hideAllPages() {
    // hide the other tabs if there is no current page
    if (!currentBasket.getLastCheckoutStatus()) {
        for (var i = 0,
            ii = $.checkout_tab_group.children.length; i < ii; i++) {
            $.checkout_tab_group.children[i].hide();
        }
    }
}

/**
 * hideCurrentPage - hide the current page
 *
 * @api private
 *
 */
function hideCurrentPage() {
    $.checkout_tab_group.children[currentPage].hide();
}

/**
 * displayCartPage - displays the cart page
 *
 * @return {Deferred} promise
 * @api private
 */
function displayCartPage() {
    var deferred = new _.Deferred();
    // go to the cart page
    $.cart.init();

    // hide the current page
    hideCurrentPage();
    currentPage = 0;
    // show the cart tab
    $.checkout_tab_group.children[0].show();

    // enable the checkout button?
    updateCheckoutButton();

    currentBasket.trigger('change:shipments');
    currentBasket.trigger('change:payment_details');
    analytics.fireScreenEvent({
        screen : _L('Cart')
    });
    return deferred.promise();
}

/**
 * displayShippingAddressPage - displays the shipping address page
 *
 * @return {Deferred} promise
 * @api private
 */
function displayShippingAddressPage() {
    // go to the shipping address page. When it is done rendering, select the tab in the header and show the page
    var promise = $.shipping_address.render(true);
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        hideCurrentPage();
        currentPage = 1;
        $.checkout_tab_group.children[1].show();
        analytics.fireScreenEvent({
            screen : _L('Shipping Address')
        });
    }).fail(function() {
        currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
            silent : true
        });
    });
    return promise;
}

/**
 * moveFromShippingToBillingAddress - moves from shipping address to billing address and determines
 * if same address dialog needs to display
 *
 * @api private
 */

function moveFromShippingToBillingAddress() {
    logger.info('moveFromShippingToBillingAddress hasBillingAddress ' + currentBasket.hasBillingAddress() + ' getShipToStore ' + currentBasket.getShipToStore());
    // see if billing address has been entered. If so, show the billing address page. If it has not been set, ask about
    // billing address === shipping address OR billing person === shipping person in case of ship to store or different store pickup.
    // If shipping to store, must ask for a billing address
    if (currentBasket.hasBillingAddress()) {
        displayBillingAddressPage();
    } else if (currentBasket.getShipToStore() || currentBasket.getDifferentStorePickup()) {
        // If the customer is logged in and shipping is ship to store or different store pickup, display billing address page without asking shipping person === billing person
        if (currentCustomer.isLoggedIn()) {
            displayBillingAddressPage();
            return;
        }
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('Is the billing person the same as the shipping person?'),
            titleString : _L('Same Person'),
            okButtonString : _L('Yes'),
            cancelButtonString : _L('No'),
            okFunction : function() {
                var shippingAddress = currentBasket.getShippingAddress();
                var newBillingAddress = {
                    first_name : shippingAddress.getFirstName(),
                    last_name : shippingAddress.getLastName(),
                    address1 : '',
                    address2 : '',
                    city : '',
                    state_code : '',
                    postal_code : '',
                    country_code : '',
                    phone : shippingAddress.getPhone()
                };
                $.billing_address.setAddress(newBillingAddress, null, false, {
                    c_employee_id : Alloy.Models.associate.getEmployeeId()
                }).done(function() {
                    displayBillingAddressPage();
                }).fail(function() {
                    currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
                        silent : true
                    });
                });
            },
            cancelFunction : function() {
                displayBillingAddressPage();
            }
        });
    } else {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('Is the billing address the same as the shipping address?'),
            titleString : _L('Same Address'),
            okButtonString : _L('Yes'),
            cancelButtonString : _L('No'),
            okFunction : function() {
                var shippingAddress = currentBasket.getShippingAddress();
                logger.info('setting billing address to shipping address ');
                logger.secureLog(JSON.stringify(shippingAddress, null, 4));
                $.billing_address.setAddress(shippingAddress, null, false, {
                    c_employee_id : Alloy.Models.associate.getEmployeeId()
                }).done(function() {
                    // no need to verify this address as we just verified it for shipping address
                    currentBasket.setCheckoutStatus('shippingMethod');
                }).fail(function() {
                    currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
                        silent : true
                    });
                });
            },
            cancelFunction : function() {
                displayBillingAddressPage();
            }
        });
    }
}

/**
 * displayBillingAddressPage - displays the billing address page

 * @return {Deferred} promise
 * @api private
 */
function displayBillingAddressPage() {
    var promise = $.billing_address.render();
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        currentBasket.setCheckoutStatus('billingAddress');
        hideCurrentPage();
        currentPage = 2;
        $.checkout_tab_group.children[2].show();
        analytics.fireScreenEvent({
            screen : _L('Billing Address')
        });
    }).fail(function() {
        currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
            silent : true
        });
    });
    return promise;
}

/**
 * displayShippingMethodPage - displays the shipping method page
 *
 * @return {Deferred} promise
 * @api private
 */
function displayShippingMethodPage() {
    // go to the shipping method page. When it is done rendering, select the tab in the header and show the page
    var promise = $.shipping_method.render();
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        hideCurrentPage();
        currentPage = 3;
        $.checkout_tab_group.children[3].show();
        analytics.fireScreenEvent({
            screen : _L('Shipping Methods')
        });
    }).fail(function() {
        currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
            silent : true
        });
    });
    return promise;
}

/**
 * displayPaymentsPage - displays the payments page
 *
 * @return {Deferred} promise
 * @api private
 */
function displayPaymentsPage() {
    var deferred = new _.Deferred();
    // go to the payments page
    if (!currentBasket.getOrderNumber() || currentBasket.getOrderNumber() === 'null') {
        createOrder(deferred, initializeAndDisplayPaymentsPage);
    } else {
        initializeAndDisplayPaymentsPage(deferred);
    }
    return deferred.promise();
}

/**
 * initializeAndDisplayPaymentsPage - initialize and then displays the payments page
 *
 * @param {Deferred} deferred
 * @param {Object} model
 * @api private
 */
function initializeAndDisplayPaymentsPage(deferred, model) {
    $.payments.init().done(function() {
        $.payments.render();
    });
    hideCurrentPage();
    currentPage = 4;
    $.checkout_tab_group.children[4].show();
    // fire a general event that the app is on the payments page, so other navigation can be turned off
    Alloy.eventDispatcher.trigger('payments_active', {
        payments_active : true
    });
    analytics.fireScreenEvent({
        screen : _L('Payments')
    });
    deferred.resolve();
}

/**
 * setStoreBillingAddress - sets the store billing address
 *
 * @return {Deferred} promise
 * @api private
 */
function setStoreBillingAddress() {
    var deferred = new _.Deferred();
    if (Alloy.CFG.collect_billing_address) {
        deferred.resolve();
    } else {
        var billingAddress = currentBasket.getBillingAddress();
        if (billingAddress == null) {
            // default is to set the billing address to the store's address
            var storeAddress = Alloy.Models.storeInfo.constructStoreAddress();
            $.billing_address.setAddress(storeAddress, null, false).done(function() {
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
            });
        } else {
            deferred.resolve();
        }
    }
    return deferred.promise();
}

/**
 * createOrder - creates the order
 *
 * @param {Deferred} deferred
 * @param {Function} onSuccessClosure
 * @api private
 */
function createOrder(deferred, onSuccessClosure) {
    logger.info('createOrder called');
    // show an activity indicator, since this action might take some time
    var deferred1 = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred1);
    // set the store's billing address if it's not already set
    setStoreBillingAddress().done(function() {
        // then create the order
        currentBasket.createOrder().done(function(model, params, options) {
            // then if the basket says it's ok to checkout, go to the payments page
            if (currentBasket.getOrderNo() && currentBasket.canEnableCheckout()) {
                onSuccessClosure(deferred, model);
            } else {
                hideCurrentPage();
                // basket can't continue with checkout, so go back to the cart page
                currentBasket.setCheckoutStatus('cart');
                deferred.resolve();
            }
        }).fail(function(model) {
            // creating order failed, so show an error message and go back to the cart
            var message = model.getFaultMessage();
            if (!message) {
                message = _L('Unable to create order.');
            }
            notify(message, {
                preventAutoClose : true
            });
            hideCurrentPage();
            currentBasket.setCheckoutStatus('cart');
            deferred.reject();
        }).always(function() {
            deferred1.resolve();
        });
    }).fail(function() {
        currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
            silent : true
        });
        deferred1.resolve();
    });
}

/**
 * displayConfirmationPage - displays the confirmation page
 *
 * @return {Deferred} promise
 * @api private
 */
function displayConfirmationPage() {
    var deferred = new _.Deferred();
    initializeAndDisplayConfirmationPage(Alloy.Models.order, deferred);
    return deferred.promise();
}

/**
 * initializeAndDisplayConfirmationPage - displays the confirmation page after order
 *
 * @param {Object} order
 * @param {Deferred} deferred
 * @api private
 */
function initializeAndDisplayConfirmationPage(order, deferred) {
    // go to the confirmation page
    hideCurrentPage();
    currentPage = 5;
    $.checkout_tab_group.children[5].show();

    $.confirmation.render(order);
    analytics.fireScreenEvent({
        screen : _L('Confirmation')
    });
    deferred.resolve();
}

/**
 * handlePageSelection - add page selection event handler
 *
 * @param {Object} event
 * @api private
 */
function handlePageSelection(event) {
    // hide all pages if the current basket does not have a checkoutStatus set yet
    hideAllPages();

    var promise;
    switch (event.page) {
    case 'cart':
        promise = displayCartPage();
        break;
    case 'shippingAddress':
        promise = displayShippingAddressPage();
        break;
    case 'billingAddress':
        promise = displayBillingAddressPage();
        break;
    case 'shippingMethod':
        promise = displayShippingMethodPage();
        break;
    case 'payThroughWeb':
        promise = payThroughWeb();
        break;
    case 'payments':
        promise = displayPaymentsPage();
        break;
    case 'confirmation':
        promise = displayConfirmationPage();
        break;
    }
    if (promise) {
        promise.done(function() {
            $.header.updateTabStates();
            // Will verify if the terminal is connected only before switch to certain pages
            verifyPaymentTerminalConnection(event.page);
        });
    }
}

/**
 * canCheckout - determine if the cart can checkout
 *
 * @api private
 */
function canCheckout() {
    return currentBasket.getProductItems().length > 0 && !savedItemsDisplayed && !wishListItemsDisplayed;
}

/**
 * createAccount - show the create account modal
 *
 * @param {Object} order
 * @api private
 */
function createAccount(order) {
    var orderModel = Alloy.createModel('baskets', order.toJSON());
    var createDialog = Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/confirmation/createAccount',
        initOptions : {
            order : order
        },
        continueEvent : 'createAccount:dismiss',
        continueFunction : function() {
            $.stopListening(createDialog, 'createAccount:create');
        }
    });
    createDialog.focusFirstField();

    // go ahead and create the account
    $.listenTo(createDialog, 'createAccount:create', function(customer_info, address, saveAddress) {
        var newCustomer = Alloy.createModel('customer');
        if (saveAddress) {
            var nickname = getAddressNickname(address.getCity(), address.getStateCode());
            address.setAddressId(nickname, {
                silent : true
            });

            // 'null' is saved by ocapi when the state is not passed in as part of the billing address
            if (address.getStateCode() == 'null') {
                address.unset('state_code', {
                    silent : true
                });
            }
            // translate the country name into the country code
            address.setCountryCode(toCountryCode(address.getCountryCode()), {
                silent : true
            });
            if (!address.getAddress2()) {
                address.setAddress2('', {
                    silent : true
                });
            }
            if (!address.getPhone()) {
                address.setPhone('', {
                    silent : true
                });
            }
        }

        var data = {
            c_employee_id : currentAssociate.getEmployeeId(),
            c_employee_passcode : currentAssociate.getPasscode(),
            c_store_id : Alloy.CFG.store_id,
            c_orderNo : orderModel.getOrderNumber(),
        };
        if (saveAddress) {
            data.c_address = address.toJSON();
        }

        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        newCustomer.register(customer_info, data).done(function() {
            analytics.fireAnalyticsEvent({
                category : _L('Users'),
                action : _L('Create User'),
                label : customer_info.username
            });
            analytics.fireUserEvent({
                category : _L('Users'),
                action : _L('Create User'),
                userId : customer_info.username
            });
            currentAssociate.loginAssociate({
                employee_id : currentAssociate.getEmployeeId(),
                passcode : currentAssociate.getPasscode()
            }).done(function() {
                createDialog.dismiss();
                notify(_L('Account successfully created.'));
            }).fail(function(data) {
                var failMsg = _L('Unable to create account.');
                if (data && data.faultDescription) {
                    failMsg = data.faultDescription;
                } else if (data && data.get('httpStatus') != 200 && data.get('fault')) {
                    failMsg = data.get('fault').message;
                }
                createDialog.showErrorMessage(failMsg);
            }).always(function() {
                deferred.resolve();
            });
        }).fail(function(model, options, params) {
            createDialog.showErrorMessage( model ? model.get('fault') : null);
            deferred.resolve();
        });
    });
}

/**
 * abandonOrder - handle cancelling the order

 * @api private
 */
function abandonOrder() {
    logger.info('abandonOrder called');
    // hide the current page
    hideCurrentPage();
    // fire a general app event
    Alloy.eventDispatcher.trigger('payments_active', {
        payments_active : false
    });
}

/**
 * moveFromCartToShippingAddress - transition from the cart to the shipping address page

 * @api private
 */
function moveFromCartToShippingAddress() {
    // refresh the basket, but no notifications are necessary
    var promise = currentBasket.validateCartForCheckout({
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    }, {
        silent : true
    });
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        // only if checkout is enabled can the page transition happen
        if (currentBasket.canEnableCheckout()) {
            handlePageSelection({
                page : 'shippingAddress'
            });
            // go to shippingAddress
        } else {
            currentBasket.setCheckoutStatus('cart');
            // go back to cart page
        }
    }).fail(function() {
        currentBasket.setCheckoutStatus(currentBasket.getLastCheckoutStatus(), {
            silent : true
        });
        updateCheckoutButton();
    });
}

/**
 * updateCheckoutButton - determine whether or not to show the checkout button
 *
 * @api private
 */
function updateCheckoutButton() {
    if (currentBasket.getCheckoutStatus() === undefined) {
        return;
    }

    if (currentBasket.getCheckoutStatus() == 'cart') {
        $.checkout_button.show();
        $.checkout_button.setEnabled(canCheckout());
    } else {
        $.checkout_button.hide();
    }
}

/**
 * payThroughWeb - initiates the pay through web process
 *
 * @return {Deferred} promise
 * @api private
 */
function payThroughWeb() {
    logger.info('payThroughWeb called');
    var deferred = new _.Deferred();
    createOrder(deferred, displayPayThroughWebModal);
    return deferred.promise();
}

/**
 * displayPayThroughWebModal - displays the pay through web dialog
 *
 * @param {Deferred} deferred
 * @param {Object} model
 * @api private
 */
function displayPayThroughWebModal(deferred, model) {
    logger.info('displayPayThroughWebModal called');
    var webOrder = Alloy.createModel('storeWebOrder');
    // create a random token
    var token = Ti.Utils.sha256(currentAssociate.getFirstName() + currentAssociate.getLastName() + Date.now() + Ti.Platform.createUUID());

    tokenHash[token] = currentBasket.getOrderNo();

    webOrder.save({
        token : token,
        order_no : currentBasket.getOrderNo()
    }).done(function() {
        analytics.fireScreenEvent({
            screen : _L('Pay Through Web')
        });
        webOrderDeferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(webOrderDeferred);
        var params = {
            token : token,
            appUrl : Alloy.CFG.app_url_scheme,
            timeout : Alloy.CFG.session_timeout,
            sessionCurrency : Alloy.CFG.appCurrency
        };
        params = _.extend(params, eaUtils.getCurrencyConfiguration());
        var urlEnd = eaUtils.buildRequestUrl('EACheckout-StartWebPayment', params);
        var url = eaUtils.buildStorefrontURL('https', urlEnd);
        openSafariDialog(url);
    }).fail(function() {
        notify(_L('Failed to create order. Please try again.'), {
            preventAutoClose : true
        });
    });
    deferred.resolve();
}

/**
 * openSafariDialog - opens the safari dialog for capturing payment information
 *
 * @param {String} url
 * @api private
 */
function openSafariDialog(url) {
    logger.info('openSafariDialog with url: ' + url);
    safariDialog = require('ti.safaridialog');
    if (safariDialog) {
        safariDialog.addEventListener('open', onSafariOpen);
        safariDialog.addEventListener('close', onSafariClose);

        safariDialog.open({
            url : url,
            entersReaderIfAvailable : false,
            tintColor : Alloy.Styles.payThroughWeb.navigationTint // The color for the buttons
        });
    } else {
        logger.error('ti.safaridialog is not supported');
    }
}

/**
 * onSafariClose - event for when safari window is closed after PTW,
 * either closed by appLaunch:browserUrl event or a user clicked on Done button
 *
 * @param {Object} event
 * @api private
 */
function onSafariClose(event) {
    logger.info('onSafariClose: ' + JSON.stringify(event));
    safariDialog.removeEventListener('close', onSafariClose);
    // the close event can happen after an order has already been cancelled from an app resume
    // we don't want to cancel again
    if (processingWebOrder) {
        // this is for the case when the Done button is clicked in the browser window
        // and we didn't get a cancel action for appLaunch:browserUrl
        cancelWebOrder(currentBasket.getOrderNo()).always(function() {
            webOrderDeferred.resolve();
        });
        processingWebOrder = false;
    }
    // cleanup the safari dialog
    safariDialog = null;
}

/**
 * onSafariOpen - event for when safari window is opened for PTW
 *
 * @param {Object} event
 * @api private
 */
function onSafariOpen(event) {
    logger.info('onSafariOpen: ' + JSON.stringify(event));
    safariDialog.removeEventListener('open', onSafariOpen);
    // We know the safari dialog is open at this point so we need to wait for the appLaunch:browserUrl event
    // for the PTW flow to complete
    processingWebOrder = true;
}

/**
 * closeSafariDialog - close the safari dialog
 *
 * @return {Boolean} whether or not the safari dialog was closed
 * @api private
 */
function closeSafariDialog() {
    logger.info('closeSafariDialog called');
    var closing = false;
    if (safariDialog) {
        // Check if the safariDialog is still open
        var opened = safariDialog.opened;
        logger.info('ti.safaridialog.opened ' + opened);

        if (opened) {
            // We are manually closing the dialog and have completed processing the web order
            // This will ensure we don't cancel the order twice
            processingWebOrder = false;
            // Programmatically close it
            logger.info('closeSafariDialog closing open dialog');
            safariDialog.close();
            closing = true;
        }
    }
    return closing;
}

/**
 * verifyPaymentTerminalConnection - verifies the payment terminal is connected
 *
 * @param {String} page
 * @api private
 */
function verifyPaymentTerminalConnection(page) {
    if (!Alloy.CFG.devices.verify_payment_terminal_connection_at_checkout || Alloy.CFG.devices.payment_terminal_module == 'webDevice') {
        return;
    }

    // only make this check if using an actual device and only before switching to certain pages
    if (_.indexOf(['verifoneDevice', 'adyenDevice'], Alloy.CFG.devices.payment_terminal_module, false) != -1) {
        switch (page) {
        case 'shippingAddress':
        case 'billingAddress':
        case 'shippingMethod':
        case 'payments':
            Alloy.Router.checkPaymentDevice();
            break;
        }
    }
}

/**
 * showPaymentSignature - displays the payment signature dialog, which shows signature (if needed) and order confirmation
 *
 * @param {Object} args
 * @api private
 */
function showPaymentSignature(args) {
    if (!paymentTerminal.needsSignature) {
        _.each(args.getPaymentInstruments(), function(payment) {
            if (paymentTerminal.signaturePromptedViaDevice) {
                // Adyen handles signature prior to payment approval with transactionRequiresSignature, so we should not show it again after
                payment.c_eaRequireSignature = false;
            } else if (payment.c_eaIsContactless && (Alloy.CFG.payment.nfc_signature_threshold_amount > payment.amount || Alloy.CFG.payment.nfc_signature_threshold_amount == -1.0)) {
                payment.c_eaRequireSignature = false;
            } else if (!payment.c_eaIsContactless && (Alloy.CFG.payment.swipe_signature_threshold_amount > payment.amount || Alloy.CFG.payment.swipe_signature_threshold_amount == -1.0)) {
                payment.c_eaRequireSignature = false;
            }
        });
    }

    // bring up the payment signature window
    var paymentSignature = Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/payments/paymentSignature',
        initOptions : args,
        continueEvent : 'signature:dismiss',
        continueFunction : function() {
            // if shopping anonymously, need to ask to create an account
            if (!customerIsLoggedIn && !isKioskMode()) {
                createAccount(args);
            }
            if (isKioskMode()) {
                Alloy.Kiosk.order_complete_timer = setTimeout(function() {
                    Alloy.Kiosk = {};
                    Alloy.Router.associateLogout();
                }, Alloy.CFG.kiosk_mode.order_complete_reset_delay);
            }
        }
    });
    paymentSignature.once('signature:accepted', function() {
        currentBasket.setCheckoutStatus('confirmation');
    });

    if (!paymentTerminal.needsSignature) {
        currentBasket.setCheckoutStatus('confirmation');
    }
}

/**
 * dismissPaymentTerminal - removes the payment terminal dialog
 *
 * @api private
 */
function dismissPaymentTerminal() {
    if ($.payment_terminal) {
        $.payment_terminal.dismiss();
    }
}

/**
 * handleOrderAbandoned - handles order abandoned and moves back to cart
 *
 * @api private
 */
function handleOrderAbandoned() {
    abandonOrder();
    currentBasket.setCheckoutStatus('cart');
    updateCheckoutButton();
}

/**
 * showCheckSignature Payment terminal requires signature approval
 *
 * @param {Object} image
 * @api private
 */
function showCheckSignature(image) {
    logger.info('showCheckSignature ' + image);

    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/payments/confirmSignature',
        initOptions : image,
        cancelEvent : 'confirmSignature:dismiss',
        cancelFunction : function() {
            // This sends the signature and unconfirmed signature status to the adyen server
            paymentTerminal.signatureDeclined({
                image : image
            });
        },
        continueEvent : 'confirmSignature:accepted',
        continueFunction : function(event) {
            if (event) {
                logger.info('signature accepted ' + event.image);
                // This sends the signature to the adyen server as confirmed by associate
                paymentTerminal.signatureApproved({
                    image : event.image
                });
            } else {
                // session timeout occurred and need to decline signature
                paymentTerminal.signatureDeclined({
                    image : image
                });
            }
        }
    });
}

/**
 * showPromptSignature Payment terminal requires signature input before approval
 *
 * @api private
 */
function showPromptSignature() {
    logger.info('showPromptSignature called');

    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/payments/promptSignatureDialog',
        cancelEvent : 'promptSignatureDialog:dismiss',
        cancelFunction : function() {
            // cancel the payment on the device as the signature is required (per adyen device)
            paymentTerminal.cancelPayment();
            setTimeout(function() {
                logger.info('cancelServerTransaction (showPromptSignature/cancelFunction)');
                paymentTerminal.cancelServerTransaction({
                    order_no : Alloy.Models.basket.getOrderNo()
                });
            }, 5000);
        },
        continueEvent : 'promptSignatureDialog:accept_signature',
        continueFunction : function(event) {
            if (event) {
                logger.info('signature accepted ' + event.image);
                // This sends the signature to the adyen server and is now ready for approval
                paymentTerminal.signatureCollected({
                    image : event.image
                });
            } else {
                // session timeout occurred and need to cancel payment
                paymentTerminal.cancelPayment();
                setTimeout(function() {
                    logger.info('cancelServerTransaction (showPromptSignature/continueFunction)');
                    paymentTerminal.cancelServerTransaction({
                        order_no : Alloy.Models.basket.getOrderNo()
                    });
                }, 5000);
            }
        }
    });
}

/**
 * cancelWebOrder - cancels the web order
 *
 * @param {String} the order number to cancel
 * @param {String} (optional) the action from the browser
 * @return {Deferred} promise
 * @api private
 */
function cancelWebOrder(orderNo, action) {
    logger.info('cancelWebOrder called');
    var deferred = new _.Deferred();
    var retryFailure = function() {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('The order needs to be cancelled before you can continue. Please try again.'),
            titleString : (action == 'timeout') ? _L('The request timed out.') : _L('Unable to cancel order.'),
            okButtonString : _L('Retry'),
            hideCancel : true,
            okFunction : function() {
                removeNotify();
                var promise = cancelWebOrder(orderNo, action);
                Alloy.Router.showActivityIndicator(promise);
            }
        });
    };
    var orderDetails = Alloy.createModel('baskets');
    orderDetails.getOrder({
        order_no : orderNo
    }).done(function() {
        // if the order has been created, cancel it
        logger.info('order status ' + orderDetails.getStatus());
        if (orderDetails.isStatusCreated()) {
            currentBasket.abandonOrder(Alloy.Models.associate.getEmployeeId(), Alloy.Models.associate.getPasscode(), Alloy.CFG.store_id).done(function() {
                // put back the saved products
                handleOrderAbandoned();
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
                retryFailure();
            });
        } else if (action) {
            // otherwise it has already been cancelled
            deferred.resolve();
            var message = '';
            logger.info('action ' + action);
            if (action == 'cancel') {
                message = _L('This transaction has already been cancelled.');
            } else if (action == 'confirmCancelledOrder') {
                message = _L('This transaction has been cancelled and payment cannot be applied.');
            }
            Alloy.Dialog.showAlertDialog({
                messageString : message
            });
        } else {
            logger.error('action ' + action + ' or order status incorrect');
            deferred.reject();
        }
    }).fail(function() {
        deferred.reject();
        retryFailure();
    });

    return deferred.promise();
}

/**
 * handleOrderCompletion - called after order has been completed
 *
 * @param {Object} event
 * @api private
 */
function handleOrderCompletion(event) {
    // close payment terminal if it's still open
    dismissPaymentTerminal();
    showPaymentSignature(event);
}

/**
 * finishFetchOrder - finish fetching the newly completed order from the server
 *
 * @param {String} orderNo
 * @api private
 */
function finishFetchOrder(orderNo) {
    currentBasket.trigger('change');
    currentBasket.trigger('basket_sync');
    // get the order
    var customerOrder = Alloy.createModel('baskets');
    logger.info('looking up order detail: ' + orderNo);
    customerOrder.getOrder({
        order_no : orderNo
    }).done(function() {
        // let listeners know the order succeeded
        Alloy.Models.order = this;
        Alloy.eventDispatcher.trigger('order_just_created', this);
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCheckoutButtonClick - clicking on the checkout button
 *
 * @api private
 */
function onCheckoutButtonClick() {
    var index = _.indexOf(checkoutStates, currentBasket.getCheckoutStatus());
    if (index < checkoutStates.length - 1) {
        currentBasket.setCheckoutStatus(checkoutStates[index + 1]);
    } else {
        currentBasket.setCheckoutStatus(checkoutStates[0]);
    }
}

/**
 * openGCBalanceModal - open the overlay to show the balance of a gift card
 *
 * @param {Object} args
 * @api private
 */

function openGCBalanceModal(args) {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/payments/gcBalanceDetails',
        initOptions : args,
        cancelEvent : 'gc_balance:dismiss',
        cancelFunction : function() {
            dismissPaymentTerminal();
        },
        continueEvent : 'gc_balance:continue',
        continueFunction : function() {
            $.payments.applyGCPayment({
                track_1 : args.track_1,
                track_2 : args.track_2,
                order_no : args.order_no
            }, args.toApply);
        }
    });
}