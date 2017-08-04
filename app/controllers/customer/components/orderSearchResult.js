// ©2016-2017 salesforce.com, inc. All rights reserved
/**
 * controllers/customer/components/orderSearchResult.js - creates a component for order search
 */

//---------------------------------------------------
// ## VARIABLES

var ordersCollection = Alloy.Collections.customerOrderHistory;
var logger = require('logging')('customer:components:orderSearchResult', getFullControllerPath($.__controllerPath));
var toCurrency = require('EAUtils').toCurrency;
var returnToShoppingOrCart = require('EAUtils').returnToShoppingOrCart;
var filteredOrders = [];

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.history_container.addEventListener('singletap', handleOrderSelected);
$.breadcrumbs_back_button.addEventListener('singletap', returnToShoppingOrCart);
$.search_textfield.addEventListener('return', handleOrderSearch);
$.search_button.addEventListener('click', handleOrderSearch);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api public
 */
function init(options) {
    logger.info('Calling INIT');
    var deferred = new _.Deferred();
    $.orders.reset([]);
    hideErrorMessage();
    $.search_textfield.setValue(options.searchPhrase);
    $.search_results_count.setText(String.format(_L('%d Orders'), 0));
    var errorMsg = String.format(_L('Could not retrieve orders for id or email \'%s\'.'), options.searchPhrase);
    Alloy.Router.showActivityIndicator(deferred);
    ordersCollection.search({
        customerEmailOrOrderNo : options.searchPhrase
    }).done(function() {
        $.orders.once('reset', function() {
            disableSelectionOnRows();
        });
        filteredOrders = filterOrders(ordersCollection);
        $.orders.reset(filteredOrders);
        $.search_results_count.setText(String.format(_L('%d Orders'), filteredOrders.length));
        if (filteredOrders && filteredOrders.length == 0) {
            deferred.reject({
                message : errorMsg
            });
            showErrorMessage(errorMsg);
        } else if (filteredOrders && filteredOrders.length == 1) {
            hideErrorMessage();
            handleSingleOrder(filteredOrders[0].get('orderNo'), deferred);
        } else {
            hideErrorMessage();
            deferred.resolve();
        }
    }).fail(function(error) {
        if (error && error.message) {
            logger.info(error.message);
            showErrorMessage(error.message);
            deferred.reject({
                message : error.message
            });
        } else {
            logger.info(String.format('Could not retrieve orders for id or email \'%s\'.', options.searchPhrase));
            showErrorMessage(errorMsg);
            deferred.reject({
                message : errorMsg
            });
        }

    });

    return deferred.promise();

}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('Calling DESTROY');
    $.history_container.removeEventListener('singletap', handleOrderSelected);
    $.breadcrumbs_back_button.removeEventListener('singletap', returnToShoppingOrCart);
    $.search_textfield.removeEventListener('return', handleOrderSearch);
    $.search_button.removeEventListener('click', handleOrderSearch);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showOrderDetailsDialog -  show order details dialog
 * @param {String} orderId
 * @return {Deferred} promise
 * @api private
 */
function showOrderDetailsDialog(orderId) {
    var promise = Alloy.Models.customerOrder.getOrder({
        order_no : orderId
    });
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function(evt) {
        if (!evt || (evt && !evt.noResult)) {
            Alloy.Dialog.showCustomDialog({
                controllerPath : 'customer/components/order',
                continueEvent : 'order_history:dismiss'
            });
        }
    }).fail(function() {
        notify(String.format(_L('Could not retrieve order \'%s\'.'), orderId), {
            preventAutoClose : true
        });
    });
    return promise;
}

/**
 * handleSingleOrder -  handle UI and logic when order search server call return single order
 * @param {String} searchPhrase
 * @param {Deferred} deferred
 * @api private
 */
function handleSingleOrder(searchPhrase, deferred) {
    var errorMsg = String.format(_L('Could not retrieve orders for id or email \'%s\'.'), searchPhrase);
    showOrderDetailsDialog(searchPhrase).done(function(evt) {
        if (evt && evt.noResult) {
            logger.info(String.format('Could not retrieve orders for id or email \'%s\'.', searchPhrase));
            deferred.reject({
                message : errorMsg
            });
            showErrorMessage(errorMsg);
        } else {
            hideErrorMessage();
            deferred.resolve({
                singleOrder : true
            });
            $.search_results_count.setText(String.format(_L('%d Order'), 1));
        }
    });
}

/**
 * disableSelectionOnRows - turn off the selection style for each row
 * @api private
 */
function disableSelectionOnRows() {
    logger.info('disableSelectionOnRows');
    if ($.history_container.getSections().length >= 1) {
        var children = $.history_container.getSections()[0].getRows();
        // for each row, save the row based on the product id
        _.each(children, function(child) {
            child.setSelectionStyle(Ti.UI.iOS.TableViewCellSelectionStyle.NONE);
        });
    }
}

/**
 * filterOrders - filter out orders that are failed or just created
 *
 * @param {Object} collection
 * @return {Object} orders
 * @api private
 */
function filterOrders(collection) {
    logger.info('filterOrders' + JSON.stringify(collection.models[0]));
    var filter = collection.filter(function(model) {
        return model.get('status') !== 'FAILED' && model.get('status') !== 'CREATED';
    });
    return filter;
}

/**
 * transformOrder - model transform for backbone data binding functionality
 *
 * @param {Object} model
 * @param {Object} view data
 * @api private
 */
function transformOrder(model) {
    logger.info('transform Order');
    var imageUrl = model.get('imageURL').replace('https', 'http');
    return {
        imageUrl : encodeURI(imageUrl),
        creationDate : model.get('creationDate'),
        order_status : _L(model.get('status')),
        totalNetPrice : toCurrency(model.getTotalNetPrice(), model.getCurrencyCode()),
        orderNo : model.get('orderNo')
    };
}

/**
 * showErrorMessage - Show error message
 *
 * @param {String} errorText - Error text
 * @api private
 */
function showErrorMessage(errorText) {
    $.results_error.setText(errorText);
    $.search_results_container.setVisible(true);
}

/**
 * hideErrorMessage - Hide error message
 *
 * @api private
 */
function hideErrorMessage() {
    $.results_error.setText('');
    $.search_results_container.setVisible(false);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleOrderSearch - handle search button click and search field return key pressed
 * @api private
 */
function handleOrderSearch() {
    var searchTerm = $.search_textfield.getValue();
    if (searchTerm && searchTerm.length > 0) {
        init({
            searchPhrase : $.search_textfield.getValue()
        });
    } else {
        showErrorMessage(_L('You must provide either an order ID or a customer email for an order search.'));
    }

}

/**
 * handleOrderSelected -  handle when order is selected in tableview
 * @param {object} event - event
 * @api private
 */
function handleOrderSelected(event) {
    if (filteredOrders && filteredOrders.length > 0) {
        var order = filteredOrders[event.index];
        if (order) {
            showOrderDetailsDialog(order.get('orderNo'));
        }
    }
}

//---------------------------------------------------
// ## CONSTRUCTOR

$.search_textfield.setHintText(_L('Enter Order ID or Customer Email'));
