// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customerSearch/index.js - Display customer search results
 */

//---------------------------------------------------
// ## VARIABLES

var currentCustomers = Alloy.Collections.customer;
var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;

var returnToShoppingOrCart = require('EAUtils').returnToShoppingOrCart;
var analytics = require('analyticsBase');
var logger = require('logging')('customerSearch:index', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.searchResults.addEventListener('postlayout', onResultsPostLayout);

$.results_container.addEventListener('click', onResultContainerClick);

$.breadcrumbs_back_button.addEventListener('singletap', returnToShoppingOrCart);

$.search_textfield.addEventListener('return', handlePerformSearch);

$.search_button.addEventListener('click', handlePerformSearch);

// hide the keyboard if the home icon is clicked
$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', hideKeyboard);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentCustomers, 'sync', render);
$.listenTo(currentCustomers, 'reset:customers', initCustomersCollection);
$.listenTo(currentCustomer, 'saved_products:downloaded', onSavedProducts);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options
 * @param {Deferred} promise
 * @api public
 */
function init(options) {
    logger.info('Calling INIT');
    $.results_error.setText('');
    $.search_results_container.setVisible(false);
    $.search_textfield.setValue(options.customer_query || '');
    if (options.customer_query) {
        return handlePerformSearch();
    } else {
        var deferred = new _.Deferred();
        deferred.resolve();
        return deferred.promise();
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.searchResults.removeEventListener('postlayout', onResultsPostLayout);
    $.breadcrumbs_back_button.removeEventListener('singletap', returnToShoppingOrCart);
    $.search_textfield.removeEventListener('return', handlePerformSearch);
    $.search_button.removeEventListener('click', handlePerformSearch);
    $.results_container.removeEventListener('click', onResultContainerClick);
    $.stopListening();
    $.destroy();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('Calling RENDER');
    var customers = currentCustomers.getCustomers();
    if (customers.length == 0) {
        renderError();
        return;
    }
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * sendSearchRequest - Send the search request
 * @param {String} searchText - search text
 * @param {Object} searchParams - search properties
 * @param {Deferred} deferred - deferred of the function this is being called from
 * @api private
 */
function sendSearchRequest(searchText, searchParams, deferred) {
    Alloy.Collections.customer.search({
        attrs : searchParams
    }).done(function() {
        handleCustomerSearchDone(deferred, searchText);
    }).fail(function(error) {
        renderError(deferred, error);
    });
}

/**
 * handleCustomerSearchDone - Handle UI logic when the server returns a response from customer search
 * @param {Deferred} deferred - deferred of the current server call
 * @param {String} searchText - search text
 * @api private
 *
 */
function handleCustomerSearchDone(deferred, searchText) {
    renderResults();
    if (Alloy.Collections.customer.length > 0) {
        deferred.resolve();
    } else {
        deferred.reject({
            message : String.format(_L('Could not find any customers matching \'%s\'.'), searchText)
        });
    }
}

/**
 * renderResults - render the customers list
 * @api private
 */
function renderResults() {
    logger.info('RENDER RESULTS');
    logger.secureLog(JSON.stringify(currentCustomers));
    var customers = currentCustomers.getCustomers();
    if (customers.length == 0) {
        renderError();
        return;
    }

    initCustomersCollection();

    $.results_error.setText('');
    $.search_results_container.setVisible(false);
    $.search_textfield.blur();
}

/**
 * renderError - renders the error
 * @param {Deferred} deferred
 * @param {Object} error
 * @api private
 */
function renderError(deferred, error) {
    logger.info('RENDER ERROR');
    initCustomersCollection();
    var search_text = $.search_textfield.value || currentCustomers.search_text;
    var errorMessage = String.format(_L('Could not find any customers matching \'%s\'.'), search_text);
    $.results_error.setText(errorMessage);

    if (deferred && _.isFunction(deferred.reject)) {
        if (error) {
            var message = error.description ? error.description : error.message;
            $.results_error.setText(message);
            deferred.reject({
                message : message
            });
        } else {
            deferred.reject({
                message : errorMessage
            });
        }
    }
    $.search_results_container.setVisible(true);
}

/**
 * transformCustomer
 * @param {Object} customer
 * @api private
 */
function transformCustomer(customer) {
    logger.info('transformCustomer: ' + customer);
    var name = customer.getFirstName() + ' ' + customer.getLastName();
    var hasAnAddress = customer.getAddresses() && customer.getAddresses().length > 0;
    if (hasAnAddress) {
        var address = customer.getAddresses()[0];
        var address1 = address && address.address1 && address.address1 != 'null' ? address.address1 : '';
        var address2 = address && address.address2 && address.address2 != 'null' ? address.address2 : '';
        var city_state_zip = (address && address.city && address.city != 'null') ? address.city : '';
        city_state_zip += (address && address.state_code && address.state_code != 'null') ? ', ' + address.state_code : '';
        city_state_zip += (address && address.postal_code && address.postal_code != 'null') ? ' ' + address.postal_code : '';
        var country = (address && address.country_code && address.country_code != 'null') ? address.country_code : '';
    }
    return {
        name : name,
        address1 : address1,
        address2 : address2,
        city_state_zip : city_state_zip,
        country : country,
        email : customer.getEmail(),
        phone : customer.getPhone(),
        login : customer.getLogin()
    };
}

/**
 * hideKeyboard - hides the keyboard
 * @api private
 */
function hideKeyboard() {
    $.search_textfield.blur();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * profileButtonClickHandler - handles the profile button click
 * @api private
 */
function profileButtonClickHandler(login_info) {
    logger.info('profileButtonClickHandler');
    var promise = currentCustomer.loginCustomer({
        login : login_info
    }, currentBasket);
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        logger.info('redirecting to customer page');
        Alloy.Router.navigateToCustomer();
    }).fail(function(error) {
        notify(error && error.responseText ? error.responseText : String.format(_L('Could not get \'%s\' profile information'), login_info), {
            preventAutoClose : true
        });
    });
}

/**
 * loginButtonClickHandler - handles the shop for button click
 * @api private
 */
function loginButtonClickHandler(login_info) {
    logger.info('loginButtonClickHandler');
    var promise = currentCustomer.loginCustomer({
        login : login_info
    }, currentBasket);
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        returnToShoppingOrCart();
        analytics.fireAnalyticsEvent({
            category : _L('Users'),
            action : _L('Customer Login')
        });
    }).fail(function(error) {
        notify(error && error.responseText ? error.responseText : String.format(_L('Could not get \'%s\' profile information'), login_info), {
            preventAutoClose : true
        });
    });
}

/**
 * onResultsPostLayout - search results post layout event
 * @api private
 */
function onResultsPostLayout() {
    $.searchResults.setVisible(true);
    $.results_contents.setVisible(true);
    $.lookup_window.setVisible(true);
    $.search_form_container.setVisible(true);
}

/**
 * onResultContainerClick - results customer container click
 * @param {Object} event
 * @api private
 */
function onResultContainerClick(event) {
    logger.info('results_container click handler');
    var unsorted_customers = currentCustomers.getCustomers();
    var customers = _.sortBy(_.sortBy(unsorted_customers, 'first_name'), 'last_name');

    var customer = customers[event.index];
    if (event.source.id === 'profile_button') {
        event.source.animate(Alloy.Animations.bounce);
        confirmCurrentCustomerLogout(profileButtonClickHandler, customer.getLogin());
    } else if (event.source.id === 'login_button') {
        event.source.animate(Alloy.Animations.bounce);
        confirmCurrentCustomerLogout(loginButtonClickHandler, customer.getLogin());
    }
}

/**
 * confirmCurrentCustomerLogout - Show dialog to confirm logout of current customer logged in
 * @param {Function} callback - function to call when user taps continue or customer is not logged in
 * @param {Object} loginInfo - data of customer to login
 * @api private
 *
 */
function confirmCurrentCustomerLogout(callback, loginInfo) {
    if (currentCustomer.getLogin() == loginInfo) {
        Alloy.Dialog.showAlertDialog({
            messageString : String.format(_L('\'%s\' is already logged in.'), currentCustomer.getFullName())
        });
        return;
    }
    if (currentCustomer.isLoggedIn()) {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('By tapping on "Continue", the cart will be cleared and you will logout the current customer you are logged in as.'),
            titleString : _L('Confirm Current Customer Logout'),
            okButtonString : _L('Continue'),
            okFunction : function() {
                Alloy.Router.customerLogout({
                    noHomeScreenNavigation : true
                }).done(function() {
                    callback(loginInfo);
                });
            }
        });
    } else {
        callback(loginInfo);
    }
}

/**
 * handlePerformSearch - processes the input and determines what kind of search to do (email vs first/last name)
 *
 * @return {Deferred} promise
 * @api private
 */
function handlePerformSearch() {
    logger.info('handlePerformSearch');
    var search_text = ($.search_textfield.value).trim();
    var searchParams = {};
    if (!search_text) {
        $.results_error.setText(_L('You must provide either a first/last name or an email for a customer search!'));
        $.search_results_container.setVisible(true);
        return;
    }
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    var customers = Alloy.Collections.customer;
    var isEmail = (search_text.indexOf('@') >= 0);

    analytics.fireAnalyticsEvent({
        category : _L('Search'),
        action : _L('Customer Search'),
        label : search_text
    });

    if (isEmail || (search_text == '*')) {
        searchParams = {
            email : search_text,
            firstname : '',
            lastname : ''
        };
        sendSearchRequest(search_text, searchParams, deferred);
    } else {

        var spacePos = search_text.indexOf(' ');

        if (spacePos < 0) {
            searchParams = {
                email : '',
                firstname : '*',
                lastname : search_text
            };
            sendSearchRequest(search_text, searchParams, deferred);
        } else {
            searchParams = {
                firstname : search_text.substring(0, spacePos),
                lastname : search_text.substring(spacePos + 1),
                email : ''
            };
            sendSearchRequest(search_text, searchParams, deferred);

        }
    }
    return deferred.promise();
}

//---------------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * onSavedProducts - saved product change event
 * @api private
 */
function onSavedProducts() {
    logger.info('Responding to currentBasket saved_products:downloaded');
    var saved_products = currentCustomer.getSavedProducts();
    if (saved_products && saved_products.length > 0) {
        var sum = 0;
        sum = _.reduce(saved_products, function(memo, product) {
            return memo + product.getQuantity();
        }, 0);
        if (sum == 1) {
            notify(_L('1 saved product retrieved from your cart'));
        } else {
            notify(String.format(_L('%d saved products retrieved from your cart'), sum));
        }
    }
}

/**
 * initCustomersCollection - This will trigger 'reset' on $.customers
 * and subsequently trigger a table redraw
 * @api private
 */
function initCustomersCollection() {
    logger.info('initCustomersCollection');
    var unsorted_customers = currentCustomers.getCustomers();
    var customers = _.sortBy(_.sortBy(unsorted_customers, 'first_name'), 'last_name');

    if (customers && customers.length > 0) {
        logger.info('Calling reset with data');
        $.search_results_count.setText(String.format((customers.length == 1 ? _L('%d Customer') : _L('%d Customers')), customers.length));

        $.customers.once('reset', function() {
            var children = $.results_container.getSections()[0].getRows();
            var count = 0;
            _.each(children, function(child, index) {
                child.getChildren()[0].setBackgroundColor(((index % 2) == 0) ? Alloy.Styles.color.background.white : Alloy.Styles.color.background.light);
            });
            $.results_container.scrollToTop();
        });
        $.customers.reset(customers);
    } else {
        logger.info('Calling reset with no data');
        $.search_results_count.setText(String.format(_L('%d Customers'), 0));
        $.customers.reset([]);
    }
}