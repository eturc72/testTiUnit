// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/main/productBundleDetail.js - View for displaying product details for bundles
 * @see product/productDetailBase
 */

exports.baseController = 'product/productDetailBase';

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:main:productBundleDetail', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.postInit = postInit;
exports.getDetailsTabView = getDetailsTabView;

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

    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
var superDeinit = $.deinit;
function deinit() {
    logger.info('deinit called');
    $.pdp_details.deinit();
    superDeinit();
    $.stopListening();
    $.destroy();
}

/**
 * POSTINIT
 *
 * @api public
 */
function postInit() {
    var products = $.currentProduct.getBundledProducts();
    $.trigger('alt_image_selected', {
        productId : products[0].getId(),
        image : 0
    });
}

//---------------------------------------------------
// ## FUNCTIONS OVERRIDDEN FROM BASE

/**
 * getDetailsTabView - Get the view to show in the Details tab
 * @return {Deferred} promise for creating tab view
 *
 * @api protected
 */
function getDetailsTabView() {
    logger.info('getDetailsTabView called');
    var deferred = new _.Deferred();

    $.pdp_details = Alloy.createController('product/tabs/productDetailsTabBundle');

    $.pdp_details.init({
        replaceItem : $.replaceItem,
    }).always(function() {
        // update inventory and pricing information
        $.currentProduct.setSelectedVariant($.currentProduct);
        deferred.resolve($.pdp_details.getView());
    });

    return deferred.promise();
}
