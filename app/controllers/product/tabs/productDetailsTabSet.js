// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/productDetailsTabSet.js - controller for product detail tabs
 */

//---------------------------------------------------
// ## VARIABLES

var setProductControllers = [];
var logger = require('logging')('product:tabs:productDetailsTabSet', getFullControllerPath($.__controllerPath));
var currentProduct = Alloy.Models.product;
var currentBasket = Alloy.Models.basket;
var analytics = require('analyticsBase');

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.verifyVariants = verifyVariants;
exports.getAllEnabled = getAllEnabled;
exports.addAllToCart = addAllToCart;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('init called');
    $.promotions.init();

    var setProductsModels = _.extend([], currentProduct.getSetProducts());
    // get the deferred for the first element and then reduce through the models one at a time after each promise is finished
    // this ensures we resolve the deferred after all the promises are done
    var deferred = createSetProduct(setProductsModels.shift());
    return setProductsModels.reduce(function(sequence, setProductModel) {
        return sequence.then(function() {
            return createSetProduct(setProductModel);
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
    _.each(setProductControllers, function(setProduct) {
        setProduct.deinit();
    });
    removeAllChildren($.set_products);
    // removes all listenTo events
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * createSetProduct - Creates the set product controller
 *
 * @return {Deferred} promise
 * @api private
 */
function createSetProduct(model) {
    var setProduct = Alloy.createController('product/main/setProduct', {
        $model : model
    });
    $.set_products.add(setProduct.getView());
    setProductControllers.push(setProduct);
    $.listenTo(setProduct, 'setProduct:add_cart_changed', onAddCartChanged);
    return setProduct.init();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * verifyVariants - Verify if variations are selected
 *
 * @api public
 */
function verifyVariants() {
    logger.info('verifyVariants called');
    var scrolledToFirstVariationError = false;
    _.each(setProductControllers, function(setProduct, index) {
        if (setProduct) {
            setProduct.verifyVariants();
            if (!scrolledToFirstVariationError && !setProduct.getIsEnabled()) {
                if ($.set_products.getChildren()[index]) {
                    scrolledToFirstVariationError = true;
                    $.set_products.scrollTo(0, $.set_products.getChildren()[index].getRect().y);
                }
            }
        }

    });
}

/**
 * getAllEnabled - Returns if all set products are enabled
 *
 * @return {Boolean} all enabled
 * @api public
 */
function getAllEnabled() {
    logger.info('getAllEnabled called');
    var productsEnabled = [];
    _.each(setProductControllers, function(setProduct, index) {
        productsEnabled[index] = setProduct.getIsEnabled();
    });
    return _.every(productsEnabled);
}

/**
 * addAllToCart - Add all product set items to the cart
 *
 * @api public
 */
function addAllToCart() {
    logger.info('addAllToCart called');
    // one call with all products passed in
    // for each setProductController
    var productInfos = [];
    var productIds = [];
    _.each(setProductControllers, function(setProductController) {
        var model = setProductController.getModel();
        var product_info = model.getSelectedProductInfo();
        product_info.c_employee_id = Alloy.Models.associate.getEmployeeId();
        product_info.c_store_id = Alloy.CFG.store_id;
        productIds.push(model.getSelectedVariant().getProductId());
        productInfos.push(product_info);
    });
    var promise = currentBasket.addProducts(productInfos);
    promise.done(function() {
        analytics.fireAnalyticsEvent({
            category : _L('Basket'),
            action : _L('Add All To Basket'),
            label : currentProduct.getName() + ' (' + productIds.join(', ') + ')'
        });
        notify(_L('Items added to the cart'));
    }).fail(function(response) {
        logger.error('failure adding products to cart: ' + JSON.stringify(response));
        var msg = _L('Unable to add items to the cart');
        if (response) {
            var fault = response.get('fault');
            if (fault && fault.message && fault.message != '') {
                msg = fault.message;
            }
        }
        notify(msg, {
            preventAutoClose : true
        });
    }).always(function() {
        processing = false;
    });
    Alloy.Router.showActivityIndicator(promise);
}

/**
 * onAddCartChanged - Add to Cart button changed on a set product
 * @api private
 */
function onAddCartChanged() {
    logger.info('onAddCartChanged called');
    $.trigger('productDetailsTabSet:add_cart_changed');
}
