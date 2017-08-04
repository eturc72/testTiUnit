// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/orders/orderProductDetails.js - Handles the display of order product details
 */

//----------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var fetchImages = require('EAUtils').fetchImagesForProducts;
var logger = require('logging')('orders:orderProductDetails', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.render = render;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 * @param {Object} order
 *
 * @api public
 */
function render(order) {
    logger.info('render called');
    var plis = order.getProductItems();
    _.each(plis, function(row) {
        row.currencyCode = order.getCurrencyCode();
    });
    var deferred;
    $.productLineItems.once('reset', function() {
        disableSelectionOnRows();
    });

    // render can be called multiple times so need to clean up the old rows before resetting the line items in the table
    deinitRows();

    if (plis && plis.length > 0) {
        logger.info('[order] Calling reset with data');
        $.productLineItems.once('reset', function() {
            logger.info('Fetching images for plis');
            deferred = fetchImageForProducts(plis, order);
        });
        $.productLineItems.reset(plis);

    } else {
        logger.info('[order] Calling reset with no data');
        $.productLineItems.reset([]);
        deferred = new _.Deferred();
        deferred = deferred.promise();
    }
    if (plis && plis.length > 3) {
        // enable scrolling on the table view if there are more than 3 PLIs
        $.pli_table.setTouchEnabled(true);
        $.pli_table.setShowVerticalScrollIndicator(true);
    }

    return deferred;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    deinitRows();
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * transformPLI - transform model
 * @param {Object} model
 *
 * @api private
 */
function transformPLI(model) {
    logger.info('[confirmation] transform PLI');
    var option_string = '';
    if (model.getOptionItems()) {
        var options = model.getOptionItems();
        _.each(options, function(o) {
            option_string += String.format(_L('%s: %s'), o.getItemText(), toCurrency(o.getPrice())) + '\n';
        });
    }
    return {
        name : model.getProductName(),
        item_number : _L('Item# ') + model.getProductId(),
        color : '',
        size : '',
        price : toCurrency(model.getPrice()),
        quantity : _L('Quantity:') + ' ' + model.getQuantity(),
        options : option_string
    };
}

/**
 * deinitRows - deinit the rows in the table
 *
 * @api private
 */
function deinitRows() {
    if ($.pli_table.getSections().length > 0) {
        _.each($.pli_table.getSections()[0].getRows(), function(row) {
            row.deinit();
        });
    }
}

/**
 * fetchImageForProducts - fetch the images for the product line items
 * @param {Object} plis
 *
 * @api private
 */
function fetchImageForProducts(plis, order) {
    return fetchImages(plis, $.pli_table, true, order);
}

/**
 * disableSelectionOnRows - turn of the selection style for each row
 *
 * @api private
 */
function disableSelectionOnRows() {
    if ($.pli_table.getSections() && $.pli_table.getSections().length > 0) {
        var children = $.pli_table.getSections()[0].getRows();
        // for each row, save the row based on the product id
        _.each(children, function(child) {
            child.setSelectionStyle(Ti.UI.iOS.TableViewCellSelectionStyle.NONE);
        });
    }
}
