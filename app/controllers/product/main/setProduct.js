// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/main/setProduct.js - controller for set product
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:main:setProduct', getFullControllerPath($.__controllerPath));
var lastSelectedColor;
var eaUtils = require('EAUtils');

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo($.cart_add, 'cartAdd:verify_variants', verifyVariants);
$.listenTo($.cart_add, 'cartAdd:add_cart_changed', onAddCartChanged);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.name.addEventListener('click', navigateToProduct);
$.product_id.getView().addEventListener('click', navigateToProduct);
$.product_image.addEventListener('click', navigateToProduct);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getIsEnabled = getIsEnabled;
exports.verifyVariants = verifyVariants;
exports.getModel = getModel;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise for creating view
 * @api public
 */
function init() {
    logger.info('init called');
    var deferred = new _.Deferred();

    $.listenTo($model, 'change:selected_variant', selectionsHandler);
    $.listenTo($model, 'change:variation_values', variationChanged);

    $.cart_add.init({
        model : $model
    });
    $.pricing.init({
        model : $model
    });
    $.product_id.init();

    if ($model.isMaster()) {
        $model.trigger('change:selected_details', $model);
    } else if ($model.isVariant()) {
        $model.setSelectedVariant($model, {
            silent : true
        });
    } else if ($model.isStandard()) {
        $model.setSelectedVariant($model);
        // want this to trigger so it can enable the add to cart as there are no variants to select
    }

    $.product_id.setId($model.getSelectedProductId());

    $.name.setText($model.getName());

    $model.ensureImagesLoaded('setProductImages').done(function() {
        var smallImages = $model.getSetProductImages();
        if (smallImages && smallImages.length > 0) {
            Alloy.Globals.getImageViewImage($.product_image, smallImages[0].getLink());
        }
        $.promotions.init({
            model : $model
        });
        $.variations.init({
            model : $model
        });
        $.options.init({
            model : $model
        });
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    // removes all listenTo events
    $.stopListening();

    $.name.removeEventListener('click', navigateToProduct);
    $.product_id.getView().removeEventListener('click', navigateToProduct);
    $.product_image.removeEventListener('click', navigateToProduct);

    $.pricing.deinit();
    $.promotions.deinit();
    $.variations.deinit();
    $.options.deinit();
    $.cart_add.deinit();

    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * getIsEnabled - Returns if the set product is enabled and a variation is selected
 *
 * @return {boolean} set product enabled for add to cart
 * @api public
 */
function getIsEnabled() {
    logger.info('getIsEnabled called');
    return $.cart_add.getEnabled();
}

/**
 * getModel - Gets the model associated with this product view
 *
 * @api public
 */
function getModel() {
    logger.info('getModel called');
    return $model;
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * navigateToProduct - Navigate to product details
 *
 * @api private
 */
function navigateToProduct() {
    logger.info('navigateToProduct called');
    Alloy.Router.navigateToProduct({
        product_id : $model.getId(),
        variant_id : $model.getSelectedProductId()
    });
}

/**
 * verifyVariants - Verify if variations are selected
 *
 * @api public
 */
function verifyVariants() {
    logger.info('verifyVariants called');
    $.variations.verifySelectedVariations();
}

/**
 * variationChanged - Variation has changed and may need to select a new image
 *
 * @api private
 */
function variationChanged() {
    logger.info('variationChanged called');
    // when the variation values change, see if we have to update the image being shown. only do this if the color
    // attribute has changed
    var selectedAttributes = $model.getVariationValues(),
        aid;
    for (aid in selectedAttributes) {
        if (aid === Alloy.CFG.product.color_attribute && lastSelectedColor != selectedAttributes[aid]) {
            var smallImages = $model.getSetProductImages(selectedAttributes[aid]);
            if (smallImages && smallImages.length > 0) {
                Alloy.Globals.getImageViewImage($.product_image, smallImages[0].getLink());
            }
        }
        lastSelectedColor = selectedAttributes[aid];
        break;
    }
}

/**
 * selectionsHandler - Selection of product has changed and need to update product id
 *
 * @api private
 */
function selectionsHandler() {
    logger.info('selectionsHandler called');
    var new_id = $model.getSelectedProductId();
    $.product_id.setId(new_id || _L('n/a'));
}

/**
 * onAddCartChanged - Add to Cart button changed on a set product
 *
 * @api private
 */
function onAddCartChanged() {
    logger.info('onAddCartChanged called');
    $.trigger('setProduct:add_cart_changed');
}

