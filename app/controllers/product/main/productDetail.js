// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/main/productDetail.js - controller for product details
 */

exports.baseController = 'product/productDetailBase';

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:main:productDetail', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.getDetailsTabView = getDetailsTabView;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

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
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * getDetailsTabView - Initializes the details tab
 *
 * @return {Deferred} promise for creating tab view
 * @api protected
 */
function getDetailsTabView() {
    logger.info('getDetailsTabView called');
    var deferred = new _.Deferred();
    $.pdp_details = Alloy.createController('product/tabs/productDetailsTab');

    $.pdp_details.init({
        replaceItem : $.replaceItem,
    }).always(function() {
        deferred.resolve($.pdp_details.getView());
    });

    return deferred.promise();
}
