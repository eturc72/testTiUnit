// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/productDetailsTabBundle.js - controller for product bundle tab
 */

//---------------------------------------------------
// ## VARIABLES

var bundledProductControllers = [];
var allVariations = [];
var logger = require('logging')('product:tabs:productDetailsTabBundle', getFullControllerPath($.__controllerPath));
var currentProduct = Alloy.Models.product;

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
 * @return {Deferred} promise for creating view
 * @api public
 */
function init(args) {
    logger.info('init called');

    $.promotions.init();
    $.cart_add.init({
        replaceItem : args.replaceItem
    });

    var bundledProductsModels = _.extend([], currentProduct.getBundledProducts());
    // get the deferred for the first element and then reduce through the models one at a time after each promise is finished
    // this ensures we resolve the deferred after all the promises are done
    var deferred = createBundledProduct(bundledProductsModels.shift(), args.replaceItem);
    return bundledProductsModels.reduce(function(sequence, bundledProductModel) {
        return sequence.then(function() {
            return createBundledProduct(bundledProductModel, args.replaceItem);
        });
    }, deferred);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.promotions.deinit();
    $.cart_add.deinit();
    _.each(bundledProductControllers, function(controller) {
        controller.deinit();
    });
    removeAllChildren($.bundle_products);
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * createBundledProduct - Creates the bundled product controller
 *
 * @return {Deferred} promise for creating view
 * @api private
 */
function createBundledProduct(model, replaceItem) {
    logger.info('createBundledProduct called');
    var bundledProduct = Alloy.createController('product/main/bundledProduct', {
        $model : model
    });
    $.bundle_products.add(bundledProduct.getView());
    bundledProductControllers.push(bundledProduct);
    return bundledProduct.init({
        replaceItem : replaceItem
    }).always(function() {
        allVariations.push(bundledProduct.variations);
    });
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
    _.each(allVariations, function(variationGroup) {
        if (variationGroup) {
            variationGroup.verifySelectedVariations();
        }
    });
}
