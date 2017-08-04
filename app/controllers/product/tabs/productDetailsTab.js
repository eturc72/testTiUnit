// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/productDetailsTab.js - controller for product details tab on PDP
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:tabs:productDetailsTab', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.listenTo($.cart_add, 'cartAdd:verify_variants', verifyVariants);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args - options for controller
 * @return {Deferred} promise for creating view
 * @api public
 */
function init(args) {
    logger.info('init called');
    var deferred = new _.Deferred();
    $.promotions.init();
    $.variations.init();
    $.options.init({
        replaceItem : args.replaceItem
    });
    $.cart_add.init({
        replaceItem : args.replaceItem
    });
    deferred.resolve();
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.promotions.deinit();
    $.variations.deinit();
    $.options.deinit();
    $.cart_add.deinit();
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * verifyVariants - Verify if variations are selected
 *
 * @api private
 */
function verifyVariants() {
    logger.info('verifyVariants called');
    $.variations.verifySelectedVariations();
}
