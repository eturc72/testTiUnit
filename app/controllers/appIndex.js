// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/appIndex.js - main application view controller
 */

//---------------------------------------------------
// ## VARIABLES

var analytics = require('analyticsBase');
var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var animation = require('alloy/animation');
var logger = require('logging')('application:appIndex', getFullControllerPath($.__controllerPath));

var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var customerAddress = Alloy.Models.customerAddress;
var currentBasket = Alloy.Models.basket;
var newCustomer = Alloy.Models.customer;
var currentAssociate = Alloy.Models.associate;
var eaUtils = require('EAUtils');
var storePasswordHelpers = require('storePasswordHelpers');
var paymentDeviceDialogInterval = null;
var paymentDeviceConnected = false;
var addPaymentDeviceTimer = true;
var searchDialog = null;

var tabs = {
    product_search_tab : $.product_search_tab,
    product_detail_tab : $.product_detail_tab,
    customer_search_tab : $.customer_search_tab,
    customer_tab : $.customer_tab,
    cart_tab : $.cart_tab,
    order_tab : $.order_tab
};

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', Alloy.Dialog.dismissDialog);
$.listenTo(Alloy.eventDispatcher, 'app:ready', onAppReady);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;
exports.viewManager = new ViewManager();
exports.router = new Router();

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    $.header.init();
    $.cart.init();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    // cleanout searches for next time appIndex is created
    Alloy.Models.product.clear({
        silent : true
    });
    Alloy.Models.productSearch.clear({
        silent : true
    });
    removePaymentDeviceDialogInterval();
    $.header.deinit();
    $.hamburger_menu.deinit();
    $.product_search.deinit();
    $.product_index.deinit();
    $.customer_results.deinit();
    $.customer_tabset.deinit();
    $.cart.deinit();
    $.order_results.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * handleAppRoute - Handle the app routing
 *
 * @param {Object} options, include route and other optional data
 * @return {Deferred} promise
 * @api private
 */
function handleAppRoute(options) {
    var deferred = new _.Deferred();
    logger.info('handleAppRoute - ' + options.route);
    switch( options.route ) {
    case 'home':
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        showHomeScreen(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'product_search_result':
        if (options.switch_only) {
            Alloy.eventDispatcher.trigger('hideAuxillaryViews');
            recordHistoryEvent(options);
            bringViewToFront('product_search_tab');
            deferred.resolve();
        } else {
            showProductSearchScreen(options).done(function() {
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
            });
        }
        break;

    case 'product_search':
        showSearchDialog(options);
        deferred.resolve();
        break;

    case 'product_detail':
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        if (options.switch_only) {
            recordHistoryEvent(options);
            bringViewToFront('product_detail_tab');
            deferred.resolve();
        } else {
            showProductDetailScreen(options).done(function() {
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
            });
        }
        break;

    case 'customer_search':
        showSearchDialog(options);
        deferred.resolve();
        break;

    case 'order_search':
        showSearchDialog(options);
        deferred.resolve();
        break;

    case 'create_account':
        showCreateAccountDialog(options);
        deferred.resolve();
        break;

    case 'customer_search_result':
        showCustomerSearchScreen(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'customer':
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        if (Alloy.Models.customer.isLoggedIn()) {
            // If associate is logged in ... but customer is not, then show customer_search
            showCustomerDetailScreen(options);
            deferred.resolve();
        } else {
            logger.info('tried to access customer detail without being logged in');
            deferred.reject();
        }
        break;

    case 'customer_logout':
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        doCustomerLogout(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'change_store_password':
        storePasswordHelpers.showChangeStorePassword(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'associate_logout':
        addPaymentDeviceTimer = false;
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        if (customerAddress) {
            customerAddress.setModifyingCurrentAddress(false);
            customerAddress.setCurrentPage(null);
        }
        doAssociateLogout(options).done(function() {
            deferred.resolve();
            if (Alloy.CFG.use_log_to_file && (Ti.App.deployType == 'production' || Ti.App.deployType == 'test')) {
                swissArmyUtils.backupLogs();
                eaUtils.uploadLogsToServer();
            }
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'associate_login':
        showAssociateLoginDialog(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;

    case 'cart':
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        if (Alloy.CFG.devices.payment_terminal_module != 'webDevice' && Alloy.CFG.devices.verify_payment_terminal_connection_at_checkout) {
            // Can't do this in checkout/index b/c the cart status changes when login/logout of customer occurs and we need to reset to cart page
            checkPaymentDevice();
        }
        showCartScreen(options);
        deferred.resolve();
        break;

    case 'order_search_result':
        showOrderSearchScreen(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        break;
    }
    return deferred.promise();
}

/**
 * showHomeScreen - shows the home screen
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function showHomeScreen(options) {
    var deferred = new _.Deferred();
    // If the global ProductSearch is not already looking at the top level,
    //  with no other refinements ...
    if (!Alloy.Models.productSearch.isEmptySearch()) {
        Alloy.Router.showActivityIndicator(deferred);
        // when going home, clear out the selected sorting option
        Alloy.Models.productSearch.setSelectedSortingOption(null, {
            silent : true
        });
        // perform a top-level search
        Alloy.Models.productSearch.emptySearch().done(function() {
            // show home screen, if not already visible
            bringViewToFront('product_search_tab');
            deferred.resolve();
            recordHistoryEvent(options);
        }).fail(function(model) {
            // clear out the empty search params
            var messageString = _L('Error in application');
            var fault = model.get('fault');
            if (fault && fault.message) {
                messageString = fault.message;
            }
            Alloy.Dialog.showConfirmationDialog({
                messageString : messageString,
                titleString : _L('Unable to start the application'),
                okButtonString : _L('OK'),
                hideCancel : true
            });
            deferred.reject();
        });
    } else {
        // show home screen, if not already visible ...
        bringViewToFront('product_search_tab');
        deferred.resolve();
        recordHistoryEvent(options);
        analytics.fireScreenEvent({
            screen : _L('Home')
        });
    }
    return deferred.promise();
}

/**
 * showProductSearchScreen - shows the product search screen
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function showProductSearchScreen(options) {
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);

    $.product_search.init(options).fail(function(options) {
        logger.info('standard search was rejected: ' + JSON.stringify(options));

        deferred.reject();
    }).done(function() {
        if (searchDialog) {
            searchDialog.dismiss();
        }
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        logger.info('switching to search tab');
        deferred.resolve();
        bringViewToFront('product_search_tab');
        if (Alloy.Models.productSearch.getTotal() == 1) {
            // We want to make sure to record this as a single hit ...
            options.single_hit = true;
        }
        options.selected_refinements = Alloy.Models.productSearch.getSelectedRefinements();

        recordHistoryEvent(options);
        analytics.fireScreenEvent({
            screen : _L('Product Search')
        });
    });
    return deferred.promise();
}

/**
 * showSearchDialog - shows the search dialog
 *
 * @param {Object} event
 * @api private
 */
function showSearchDialog(event) {
    logger.info('showSearchDialog');

    // we don't want to recreate the search dialog if failed search
    if (searchDialog && event && event.message) {
        searchDialog.setMessage(event.message);
    } else {
        searchDialog = Alloy.Dialog.showCustomDialog({
            controllerPath : 'search/search',
            initOptions : event,
            continueEvent : 'search:dismiss',
            continueFunction : function() {
                logger.info('search dismiss called');
                $.stopListening(searchDialog);
                searchDialog = null;
            },
            options : {
                tabId : event.route
            }

        });
        if (event && event.message) {
            searchDialog.setMessage(event.message);
        }
        searchDialog.focusSearchField();
        // Null query will prevent loading initial results
        $.product_search.init();
    }
}

/**
 * showProductDetailScreen - shows the product detail screen
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function showProductDetailScreen(options) {
    logger.info('showProductDetailScreen');
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);

    Alloy.Models.product.clear({
        silent : true
    });

    $.product_index.init({
        product_id : options.product_id,
        variant_id : options.variant_id,
        historyCursor : options.historyCursor,
        replaceItem : options.replaceItem
    }).fail(function() {
        logger.info('$.product_index.init() fail in appIndex');
        deferred.reject();
    }).done(function() {
        logger.info('$.product_index.init() done in appIndex');

        bringViewToFront('product_detail_tab');
        deferred.resolve();

        if (!options.replaceItem) {
            recordHistoryEvent(options);
            analytics.fireScreenEvent({
                screen : _L('Product Detail')
            });
        }
    });
    return deferred.promise();
}

/**
 * requireAssociateLoggedIn - presents the associate login
 *
 * @param {Object} location - where to go after login
 * @api private
 */
function requireAssociateLoggedIn(location) {
    Alloy.Router.presentAssociateLogin({
        location : location
    });
}

/**
 * showOrderSearchScreen - show order search screen
 *
 * @param {Object} options
 * @return {Deferred} promise
 *
 * @api private
 */
function showOrderSearchScreen(options) {
    promise = $.order_results.init(options);
    promise.done(function(result) {
        // navigate to order search screen if the search result is more than one
        if (!result || (result && !result.singleOrder)) {
            Alloy.eventDispatcher.trigger('hideAuxillaryViews');
            bringViewToFront('order_tab');
            recordHistoryEvent(options);
        } else if (result && result.singleOrder && searchDialog) {// there is only one order in the search result
            searchDialog.dismiss();
        }
        analytics.fireScreenEvent({
            screen : _L('Order Lookup')
        });
    }).fail(function(event) {
        if (searchDialog && event && event.message) {
            searchDialog.setMessage(event.message);
        }
    });
    return promise;
}

/**
 * showCustomerSearchScreen - show customer search screen
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function showCustomerSearchScreen(options) {
    var promise = $.customer_results.init(options);

    promise.done(function() {
        // we show errors on this tab so need to always show it for messaging
        Alloy.eventDispatcher.trigger('hideAuxillaryViews');
        bringViewToFront('customer_search_tab');
        recordHistoryEvent(options);
        analytics.fireScreenEvent({
            screen : _L('Customer Search')
        });
    }).fail(function(event) {
        if (searchDialog && event && event.message) {
            searchDialog.setMessage(event.message);
        }
    });
    return promise;
}

/**
 * showCustomerDetailScreen - shows the customer detail screen
 *
 * @param {Object} options
 * @api private
 */
function showCustomerDetailScreen(options) {
    bringViewToFront('customer_tab');
    recordHistoryEvent(options);
    analytics.fireScreenEvent({
        screen : _L('Customer Details')
    });
    $.customer_tabset.init();
}

/**
 * showCustomerSearchDialog - shows the customer search dialog
 *
 * @param {Object} event
 * @api private
 */
function showCustomerSearchDialog(event) {
    var searchDialog = Alloy.Dialog.showCustomDialog({
        controllerPath : 'customerSearch/search',
        continueEvent : 'customer_search:dismiss'
    });
    if (event.errorMessage) {
        searchDialog.showErrorMessage(event.errorMessage);
    }
    searchDialog.focusSearchField();
}

/**
 * showCreateAccountDialog - shows the create account dialog
 *
 * @api private
 */
function showCreateAccountDialog() {
    var createDialog = Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/confirmation/createAccount',
        continueEvent : 'createAccount:dismiss',
        continueFunction : function() {
            logger.info('createAccount dismiss called');
            $.stopListening(createDialog);
            createDialog = null;
        }
    });
    createDialog.focusFirstField();

    // go ahead and create the account
    $.listenTo(createDialog, 'createAccount:create', function(customer_info, address, loginPreference) {
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        newCustomer.register(customer_info, {
            c_employee_id : currentAssociate.getEmployeeId(),
            c_employee_passcode : currentAssociate.getPasscode(),
            c_store_id : Alloy.CFG.store_id
        }).done(function() {

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

            //login customer
            if (loginPreference) {
                var promise = newCustomer.loginCustomer({
                    login : customer_info.customer.login
                }, currentBasket);
                promise.done(function() {
                    createDialog.dismiss();
                    notify(_L('Account successfully created.'));
                }).fail(function(model, options, params) {
                    createDialog.showErrorMessage( model ? model.get('fault') : null);
                }).always(function() {
                    deferred.resolve();
                });

            } else {// do not login customer
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
                    } else if (data.get('httpStatus') != 200 && data.get('fault')) {
                        failMsg = data.get('fault').message;
                    }
                    createDialog.showErrorMessage(failMsg);
                }).always(function() {
                    deferred.resolve();
                });
            }
            analytics.fireAnalyticsEvent({
                category : _L('Customer'),
                action : _L('Create New User')
            });
        }).fail(function(model, options, params) {
            createDialog.showErrorMessage( model ? model.get('fault') : null);
            deferred.resolve();
        });
    });
}

/**
 * doCustomerLogout - logs the customer out
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function doCustomerLogout(options) {
    logger.info('doCustomerLogout');
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);

    // on customer logout, need to save anything in the saved items area back to the customer's storefront cart
    Alloy.Models.customer.syncSavedProducts(currentBasket, {
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    }).done(function() {
        Alloy.Collections.history.reset([]);
        if (!options.noHomeScreenNavigation) {
            showHomeScreen(options);
        }
        // clear out the signature blob
        Alloy.sigBlob = null;
        Alloy.Models.customer.doLogout();
        Alloy.Globals.resetCookies();
        logger.info('Attempting to log in as associate again ... clearing customer');
        resetAssociate().done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
    }).fail(function() {
        deferred.reject();
    });
    return deferred.promise();
}

/**
 * resetAssociate - reset associate for when a customer is logged out and need to reset basket and customer.
 * This needs to be called until it was successfully done.
 *
 * @return {Deferred} promise
 * @api private
 */
function resetAssociate() {
    var deferred = new _.Deferred();
    var employee_code = Alloy.Models.associate.getEmployeeId();
    var employee_pin = Alloy.Models.associate.getPasscode();
    Alloy.Models.associate.loginAssociate({
        employee_id : employee_code,
        passcode : employee_pin
    }).done(function() {
        logger.info('Logged in as associate again ... success ... loading basket');
        // cleanup the existing basket from the server
        Alloy.Models.basket.deleteBasket().done(function() {
            Alloy.Models.basket.clear();
            Alloy.Models.basket.getBasket({
                c_eaEmployeeId : employee_code
            }).done(function() {
                Alloy.Models.basket.trigger('basket_sync');
                Alloy.Models.customer.clear();
                Alloy.Models.customer.trigger('change:login');
                // clear out associated data on the basket
                delete Alloy.Models.basket.shippingMethods;
                deferred.resolve();
            }).fail(function() {
                customerLogoutFailureCleanup(employee_code, deferred);
            });
        }).fail(function() {
            logger.info('Failed to delete the basket, clearing customer and associate');
            customerLogoutFailureCleanup(employee_code, deferred);
        });
    }).fail(function() {
        deferred.reject();
        logger.error('Failed to log in as associate again ... clearing customer & associate');
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('The customer needs to be logged out before you can continue. Please try again.'),
            titleString : _L('Unable to logout customer.'),
            okButtonString : _L('Retry'),
            hideCancel : false,
            okFunction : function() {
                removeNotify();
                var promise = resetAssociate();
                Alloy.Router.showActivityIndicator(promise);
            }
        });
    });
    return deferred.promise();
}

/**
 * customerLogoutFailureCleanup - cleanup after a customer logout failure
 *
 * @param {String} employeeID
 * @param {Deferred} deferred to resolve when complete
 * @api private
 */
function customerLogoutFailureCleanup(employeeId, deferred) {
    logger.error('failed to get the basket, clearing customer and associate');
    Alloy.Models.associate.clear();
    Alloy.Models.customer.clear();
    Alloy.Models.basket.clear();
    Alloy.Models.basket.getBasket({
        c_eaEmployeeId : employeeId
    });
    deferred.reject();
}

/**
 * doAssociateLogout - logs the associate out
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function doAssociateLogout(options) {
    logger.info('doAssociateLogout');
    var deferred = new _.Deferred();
    if (!Alloy.Models.associate.isLoggedIn()) {
        deferred.resolve();
        return deferred.promise();
    }
    Alloy.Router.showActivityIndicator(deferred);
    removePaymentDeviceDialogInterval();
    logger.info('isLoggedIn()');
    // clear out the signature blob
    Alloy.sigBlob = null;

    // if there's an order, abandon it

    if (Alloy.Models.basket.getOrderNumber()) {
        logger.info('has order number');
        var orderNo = Alloy.Models.basket.getOrderNumber();
        // execute in a timeout to avoid a possible race condition where the request to
        // cancel the transaction arrives before the transaction is created in the payment
        // provider's systems
        setTimeout(function() {
            logger.info('appIndex: cancelServerTransaction for order: ' + orderNo);
            paymentTerminal.cancelServerTransaction({
                order_no : orderNo
            });
        }, 5000);

        Alloy.Models.basket.abandonOrder(Alloy.Models.associate.getEmployeeId(), Alloy.Models.associate.getPasscode(), Alloy.CFG.store_id).done(function() {
            logger.info('order abandoned');
            // if the customer is logged in, sync the products back
            if (Alloy.Models.customer.isLoggedIn()) {
                logger.info('customer isLoggedIn()');
                Alloy.Models.customer.syncSavedProducts(Alloy.Models.basket, {
                    c_employee_id : Alloy.Models.associate.getEmployeeId()
                }).always(function() {
                    logger.info('basket sync\'d');
                    Alloy.Models.customer.clear();
                    associateLogout(options, deferred);
                });
            } else {
                logger.info('isLoggedIn()');
                associateLogout(options, deferred);
            }
        }).fail(function() {
            notify(_L('Could not cancel the order.'), {
                preventAutoClose : true
            });
        });
    } else {
        // no order, but the customer is logged in
        if (Alloy.Models.customer.isLoggedIn()) {
            logger.info('customer isLoggedIn()!');
            Alloy.Models.customer.syncSavedProducts(Alloy.Models.basket, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }).always(function() {
                Alloy.Models.customer.clear();
                associateLogout(options, deferred);
            });
        } else {
            logger.info('customer not isLoggedIn()!');
            associateLogout(options, deferred);
        }
    }
    return deferred.promise();
}

/**
 * showAssociateLoginDialog - shows the associate login dialog
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api private
 */
function showAssociateLoginDialog(options) {
    var deferred = new _.Deferred();
    // clear out the signature blob
    Alloy.sigBlob = null;
    logger.info('showAssociateLoginDialog');
    if (Alloy.Models.associate.isLoggedIn()) {
        // TODO: Check to see if the same associate is trying to log in or not
        logger.info('showAssociateLoginDialog - associate_login - already logged in ... logging out instead');
        doAssociateLogout(options).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
    } else {
        Alloy.eventDispatcher.trigger('app:login', options);
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * showCartScreen - shows the cart screen
 *
 * @param {Object} options
 * @api private
 */
function showCartScreen(options) {
    $.cart.render();

    recordHistoryEvent(options);
    bringViewToFront('cart_tab');
    if (options.switchToWishList) {
        //switch view to wish list view
        $.cart.cart.switchToWishListView();
    } else if (options.switchToCart) {
        //switch view to cart view
        $.cart.cart.switchToCartView();
    }
}

/**
 * associateLogout - triggers the associate log out and reset the basket
 *
 * @param {Object} options
 * @param {Deferred} deferred to resolve when complete
 * @api private
 */
function associateLogout(options, deferred) {
    logger.info('associateLogout');
    Alloy.Collections.history.reset([]);
    // clean up the server basket
    Alloy.Models.basket.deleteBasket().done(function() {
        Alloy.Models.basket.clear();
        delete Alloy.Models.basket.shippingMethods;
        Alloy.Models.basket.trigger('basket_sync');
        Alloy.Models.associate.logout().always(function() {
            logger.info('associateLogout done()');
            Alloy.eventDispatcher.trigger('associate_logout');
            // Should hide everything again and set login to trigger home action
            showHomeScreen(options);
            Alloy.eventDispatcher.trigger('app:login', options);
            deferred.resolve();
        });
    }).fail(function() {
        logger.info('could not clean up the server basket');
        deferred.reject();
    });
}

/**
 * removeAllDrawers - remove all the drawers
 *
 * @api private
 */
function removeAllDrawers() {
    if ($.size_chart_drawer) {
        $.appIndex.remove($.size_chart_drawer);
    }
}

/**
 * bringViewToFront - get the view to show
 *
 * @param {Object} tab_id - id of tab to bring forward
 * @api private
 */
function bringViewToFront(tab_id) {
    Alloy.eventDispatcher.trigger('app:navigation', {
        view : tab_id
    });
    for (var t in tabs) {
        if (t != tab_id) {
            tabs[t].hide();
            tabs[t].setHeight(0);
            tabs[t].setWidth(0);
        } else {
            tabs[t].setHeight(Ti.UI.FILL);
            tabs[t].setWidth('100%');
            tabs[t].show();
        }
    }
}

/**
 * Router - functions for routing to sections of the application
 * Access via Alloy.Router
 *
 * @api public
 */
function Router() {
    return {
        /**
         * navigateToCart - navigate to cart in checkout
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToCart : function(info) {
            info = _.extend({
                route : 'cart'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * navigateToCustomer - navigate to customer views
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToCustomer : function(info) {
            info = _.extend({
                route : 'customer'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * navigateToCustomerSearchResult - navigate to customer search results
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToCustomerSearchResult : function(info) {
            info = _.extend({
                route : 'customer_search_result'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * customerLogout - log out a customer
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        customerLogout : function(info) {
            info = _.extend({
                route : 'customer_logout'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentChangeStorePasswordDrawer - change the store password
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentChangeStorePasswordDrawer : function(info) {
            info = _.extend({
                route : 'change_store_password'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * navigateToHome - navigate to Home
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToHome : function(info) {
            info = _.extend({
                route : 'home'
            }, info);

            return handleAppRoute(info);
        },

        /**
         * navigateToCategory - navigate to category
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToCategory : function(info) {
            info = _.extend({
                route : 'product_search_result',
                query : ''
            }, info);

            return handleAppRoute(info);
        },

        /**
         * navigateToProduct - navigate to a product (PDP)
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToProduct : function(info) {
            info = _.extend({
                route : 'product_detail'
            }, info);

            return handleAppRoute(info);
        },

        /**
         * navigateToProductSearch - navigate to product search results
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToProductSearch : function(info) {
            info = _.extend({
                route : 'product_search_result'
            }, info);

            return handleAppRoute(info);
        },

        /**
         * navigateToOrderSearchResult - navigate to order search results
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigateToOrderSearchResult : function(info) {
            info = _.extend({
                route : 'order_search_result'
            }, info);

            return handleAppRoute(info);
        },

        /**
         * presentAssociateLogin - present associate login
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentAssociateLogin : function(info) {
            info = _.extend({
                route : 'associate_login'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentCustomerSearchDrawer - present customer search dialog
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentCustomerSearchDrawer : function(info) {
            info = _.extend({
                route : 'customer_search'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentOrderSearchDrawer - present order search dialog
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentOrderSearchDrawer : function(info) {
            info = _.extend({
                route : 'order_search'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentProductSearchDrawer - present product search dialog
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentProductSearchDrawer : function(info) {
            info = _.extend({
                route : 'product_search'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentPrinterChooserDrawer - present printer chooser dialog
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentPrinterChooserDrawer : function(info) {
            info = _.extend({
                route : 'printer_chooser'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * associateLogout - perform associate logout
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        associateLogout : function(info) {
            info = _.extend({
                route : 'associate_logout'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * presentCreateAccountDrawer - present create account dialog
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        presentCreateAccountDrawer : function(info) {
            info = _.extend({
                route : 'create_account'
            }, info);
            return handleAppRoute(info);
        },

        /**
         * checkPaymentDevice - check status of payment device
         *
         * @param {Boolean} verified - if verified
         * @return {Deferred} promise
         * @api public
         */
        checkPaymentDevice : function(verified) {
            return checkPaymentDevice(verified);
        },

        /**
         * paymentDeviceConnectionChecked - update device status
         *
         * @param {Boolean} connected - if connected
         * @api public
         */
        paymentDeviceConnectionChecked : function(connected) {
            if (connected != paymentDeviceConnected) {
                paymentDeviceConnected = connected;
                $.header.updateDeviceStatus(false, connected);
                if ($.no_payment_terminal) {
                    $.no_payment_terminal.updateDeviceStatus(connected);
                }
            }
        },

        /**
         * startup - restart the application
         *
         * @api public
         */
        startup : function() {
            Alloy.eventDispatcher.trigger('app:startup', {
                login : true
            });
        },

        /**
         * showActivityIndicator - shows activity indicator until deferred is complete
         *
         * @param {Deferred} deferred
         * @api public
         */
        showActivityIndicator : function(deferred) {
            showActivityIndicator(deferred);
        },

        /**
         * showHideHamburgerMenu - show the hamburger menu popover
         *
         * @api public
         */
        showHideHamburgerMenu : function() {
            $.hamburger_menu.showHideHamburgerMenu();
        },

        /**
         * hideHamburgerMenu - hide the hamburger menu popover
         *
         * @api public
         */
        hideHamburgerMenu : function() {
            $.hamburger_menu.hideHamburgerMenu();
        },

        /**
         * navigate - dynamic routing based on info passed in
         *
         * @param {Object} info - optional info
         * @return {Deferred} promise
         * @api public
         */
        navigate : function(info) {
            // for dynamic routing
            return handleAppRoute(info);
        }
    };
}

/**
 * checkPaymentDevice - check whether a device is connected or not
 *
 * @param {Boolean} verifiedNotConnected - if already verified
 * @return {Deferred} promise
 * @api private
 */
function checkPaymentDevice(verifiedNotConnected) {
    var deferred = new _.Deferred();
    var isVerifiedNotConnected = verifiedNotConnected || false;
    logger.info('checking payment device');
    if (isVerifiedNotConnected || !paymentTerminal.verifyDeviceConnection()) {
        createNoPaymentTerminal().done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
    } else {
        addPaymentDeviceDialogInterval();
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * createNoPaymentTerminal - creates a custom dialog to show that there is no payment terminal connected
 *
 * @return {Deferred} promise
 * @api private
 */
function createNoPaymentTerminal() {
    var deferred = new _.Deferred();
    logger.info('creating no payment terminal popover');
    // There should only be one payment terminal window up
    if (!$.no_payment_terminal) {
        $.no_payment_terminal = Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/payments/noPaymentTerminal',
            continueEvent : 'noPaymentTerminal:dismiss',
            continueFunction : function() {
                $.no_payment_terminal = null;
                // if you don't want to allow the app flow to continue you can use fail on the checkPaymentDevice, this is used for Payments tab Enter key
                if (paymentDeviceConnected) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
                addPaymentDeviceDialogInterval();
            }
        });
        removePaymentDeviceDialogInterval();
    } else {
        // a window is already up so we still need to know if the connection was a success or not
        $.no_payment_terminal.once('noPaymentTerminal:dismiss', function() {
            // if you don't want to allow the app flow to continue you can use fail on the checkPaymentDevice, this is used for Payments tab Enter key
            if (paymentDeviceConnected) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        });
    }
    return deferred.promise();
}

/**
 * removePaymentDeviceDialogInterval - remove the interval to check the payment device
 *
 * @api private
 */
function removePaymentDeviceDialogInterval() {
    if (paymentDeviceDialogInterval) {
        logger.info('removing payment device dialog interval');
        clearInterval(paymentDeviceDialogInterval);
        paymentDeviceDialogInterval = null;
    }
}

/**
 * addPaymentDeviceDialogInterval - add the interval to check the payment device
 *
 * @api private
 */
function addPaymentDeviceDialogInterval() {
    if (!addPaymentDeviceTimer && paymentDeviceDialogInterval) {
        return;
    }
    if (Alloy.CFG.devices.payment_terminal_module != 'webDevice' && Alloy.CFG.devices.check_device_dialog_interval > 0) {
        logger.info('adding payment device dialog interval');
        paymentDeviceDialogInterval = setInterval(checkPaymentDevice, Alloy.CFG.devices.check_device_dialog_interval);
    }
}

/**
 * onAppReady - called after the login has occurred and gone to the home screen for the first time
 *
 * @api private
 */
function onAppReady() {
    var deferredStore = new _.Deferred();

    // kiosk mode is handled in index for store password
    if (!isKioskMode()) {
        logger.info('onAppReady calling checkStorePasswordWarning');
        deferredStore = storePasswordHelpers.checkStorePasswordWarning();
    } else {
        deferredStore.resolve();
    }
    // even though we have a failure we still want the app to continue
    deferredStore.always(function() {
        if (Alloy.CFG.devices.payment_terminal_module != 'webDevice' && (Alloy.CFG.devices.verify_payment_terminal_connection_at_login || Alloy.CFG.devices.check_device_dialog_interval > 0)) {
            addPaymentDeviceTimer = true;
            checkPaymentDevice();
        }
        $.header.initNotifications();
    });
}

/**
 * ViewManager - Utility functions for managing main views in the app
 * Access via Alloy.ViewManager
 * @return {Object} -  collection of utility functions
 * @api public
 */
function ViewManager() {

    return {
        isProductSearchViewVisible : function() {
            return $.product_search_tab.getVisible();
        },

        isProductDetailViewVisible : function() {
            return $.product_detail_tab.getVisible();
        },

        isCustomerSearchViewVisible : function() {
            return $.customer_search_tab.getVisible();
        },

        isCustomerViewVisible : function() {
            return $.customer_tab.getVisible();
        },

        isCartViewVisible : function() {
            return $.cart_tab.getVisible();
        },

        isOrderSearchViewVisible : function() {
            return $.order_tab.getVisible();
        },
    };
}
