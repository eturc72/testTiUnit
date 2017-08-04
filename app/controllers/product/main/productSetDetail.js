// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/main/productSetDetail.js - View for displaying product details for sets
 * @see product/productDetailBase
 */

exports.baseController = 'product/productDetailBase';

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:main:productSetDetail', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getDetailsTabView = getDetailsTabView;
exports.getHeaderView = getHeaderView;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise for creating view
 * @api public
 */
var superInit = $.init;
function init(info) {
    logger.info('init override called');

    var deferred = new _.Deferred();
    superInit(info).done(function() {
        deferred.resolve();
    }).fail(function() {
        deferred.reject();
    });
    $.pdp_header_controller.enableAddAllToCart($.pdp_details.getAllEnabled());
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
var superDeinit = $.deinit;
function deinit() {
    logger.info('deinit override called');
    $.stopListening();
    $.pdp_details.deinit();
    superDeinit();

    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS OVERRIDDEN FROM BASE

/**
 * getDetailsTabView - Get the view to show in the Details tab
 *
 * @return {Deferred} promise for creating tab view
 * @api protected
 */
function getDetailsTabView() {
    logger.info('getDetailsTabView called');
    var deferred = new _.Deferred();

    $.pdp_details = Alloy.createController('product/tabs/productDetailsTabSet');

    $.pdp_details.init({
        replaceItem : $.replaceItem
    }).always(function() {
        $.listenTo($.pdp_details, 'productDetailsTabSet:add_cart_changed', onAddCartChanged);
        // update inventory and id information
        $.currentProduct.trigger('change:selected_variant');
        deferred.resolve($.pdp_details.getView());
    });

    return deferred.promise();
}

/**
 * getHeaderView - Get the view for the header on Details and Description tab
 *
 * @return {View} header view
 * @api protected
 */
function getHeaderView() {
    logger.info('getHeaderView called');

    $.pdp_header_controller = Alloy.createController('product/components/detailHeaderSet');

    $.pdp_header_controller.init();
    $.listenTo($.pdp_header_controller, 'detailHeaderSet:add_all_to_cart_btn_tap', function() {
        logger.info('add all tapped');
        $.pdp_details.addAllToCart();
    });
    $.listenTo($.pdp_header_controller, 'detailHeaderSet:check_all_variations', function() {
        logger.info('header tapped');
        $.pdp_details.verifyVariants();
    });

    return $.pdp_header_controller.getView();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * onAddCartChanged - Add to cart has been changed on one of the sets
 *
 * @api private
 */
function onAddCartChanged() {
    logger.info('onAddCartChanged called');
    var allEnabled = $.pdp_details.getAllEnabled();
    $.pdp_header_controller.enableAddAllToCart(allEnabled);
    if (allEnabled) {
        calculateTotal();
    }
}

/**
 * calculateTotal - Calculates the total amount for the set based on selected variations, once all items are selected
 *
 * @api private
 */
function calculateTotal() {
    logger.info('calculateTotal called');
    var sum = 0.0;
    var selectedVariants = [];
    var products = [];
    _.each($.currentProduct.getSetProducts(), function(setProduct) {
        selectedVariants.push(setProduct.getSelectedVariant());
        products.push(setProduct.getSelectedProductInfo());
    });

    _.each(products, function(selectedProduct, index) {
        var variant = _.find(selectedVariants, function(v) {
            return v.getProductId() == selectedProduct.product_id;
        });
        if (variant) {
            sum += (variant.getPrice() * selectedProduct.quantity);
        }
    });
    $.pdp_header_controller.setPrice(sum);
}

/**
 * getSelectedProductItems - get all the selected products in the product set
 *
 * @api private
 */
function getSelectedProductItems() {
    logger.info('getSelectedProductItems called');
    var products = [];
    _.each($.currentProduct.getSetProducts(), function(setProduct) {
        products.push(setProduct.getSelectedProductInfo());
    });
    return products;
}

