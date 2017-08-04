// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/history.js - Functions for handling Customer History
 */

//---------------------------------------------------
// ## VARIABLES

var currentHistory = Alloy.Collections.customerOrderHistory;
var toCurrency = require('EAUtils').toCurrency;
var currentCustomer = Alloy.Models.customer;
var logger = require('logging')('customer:components:history', getFullControllerPath($.__controllerPath));
var filteredOrders = [];

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.history_container.addEventListener('singletap', handleOrderSelected);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentCustomer, 'customer:clear', onCustomerClear);

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
 * @return {Deferred} promise
 * @api public
 */
function init() {
    logger.info('Calling INIT');
    var deferred = new _.Deferred();
    $.empty_label.setText(_L('There are no orders.'));
    $.empty_label.setTop(0);
    $.empty_label.setHeight(0);

    // Get the orders
    currentHistory.search({
        customerId : currentCustomer.getCustomerNumber()
    }).done(function() {
        $.orders.once('reset', function() {
            disableSelectionOnRows();
        });

        filteredOrders = filterOrders(currentHistory);
        $.orders.reset(filteredOrders);
        if (filteredOrders && filteredOrders.length == 0) {
            $.empty_label.setTop(40);
            $.empty_label.setHeight(40);
        } else {
            $.empty_label.setTop(0);
            $.empty_label.setHeight(0);
        }
        deferred.resolve();
    }).fail(function() {
        logger.info('cannot retrieve history');
        deferred.reject();
    });
    return deferred.promise();

}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('Calling RENDER');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('Calling deinit');
    $.history_container.removeEventListener('singletap', handleOrderSelected);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * disableSelectionOnRows - turn of the selection style for each row
 * @api private
 *
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
 * filterOrders - filter orders for collection view rendering
 * @return {Array}
 * @api private
 */
function filterOrders(collection) {
    logger.info('filterOrders' + JSON.stringify(collection.models[0]));
    var filter = collection.filter(function(model) {
        return model.isStatusCompleted();
    });
    return filter;
}

/**
 * transformOrder - transform Order model for collection view rendering
 * @param {Object} model
 * @return {Array}
 * @api private
 */
function transformOrder(model) {
    logger.info('transform Order');
    var imageUrl = model.getImageURL().replace('https', 'http');
    return {
        imageUrl : encodeURI(imageUrl),
        creationDate : model.getCreationDate(),
        order_status : model.getStatus(),
        totalNetPrice : toCurrency(model.getTotalNetPrice(), model.getCurrencyCode()),
        orderNo : model.getOrderNo()
    };
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleOrderSelected -  handle when order is selected in tableview
 * @param {object} event
 * @api private
 */
function handleOrderSelected(event) {
    if (filteredOrders && filteredOrders.length > 0) {
        var order = filteredOrders[event.index];
        if (order) {
            var promise = Alloy.Models.customerOrder.getOrder({
                order_no : order.get('orderNo')
            });
            Alloy.Router.showActivityIndicator(promise);
            promise.done(function() {
                $.history_contents.fireEvent('route', {
                    page : 'order'
                });
            }).fail(function() {
                notify(String.format(_L('Could not retrieve order \'%s\'.'), order.get('orderNo')), {
                    preventAutoClose : true
                });
            });
        }
    }
}

//---------------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * onCustomerClear - current customer has been cleared
 * @api private
 */
function onCustomerClear() {
    logger.info('currentCustomer - customer:clear event listener');
    $.orders.reset();
}
