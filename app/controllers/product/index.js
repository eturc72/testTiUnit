// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/index.js - Index page for product detail
 */

//---------------------------------------------------
// ## VARIABLES

var analytics = require('analyticsBase');
var logger = require('logging')('product:index', getFullControllerPath($.__controllerPath));
var currentProduct = Alloy.Models.product;

var historyCursor,
    replaceItem,
    selectedProductID,
    altImage,
    altProduct;

//---------------------------------------------------
// ## UI listeners

$.product_detail_container.addEventListener('product:zoom', handleProductZoomSelection);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options object with historyCursor, optional variant_id, product_id and replaceItem object
 * @return {Deferred} promise
 * @api public
 */
function init(options) {
    logger.info('init start');
    deinitPDP();

    historyCursor = options.historyCursor;
    replaceItem = options.replaceItem;
    var variantID = options.variant_id;
    altImage = null;
    altProduct = null;

    var productLoad = new _.Deferred();

    if (!options.product_id) {
        logger.info('NO PRODUCT ID AVAILABLE!');
        productLoad.resolve();
        return productLoad.promise();
    }

    if (currentProduct.id != options.product_id || _.keys(currentProduct.attributes).length < 1) {
        currentProduct.id = options.product_id;

        logger.info('fetching product ' + options.product_id + '... should be silent');
        var promise = currentProduct.fetchModel({
            silent : true
        });

        promise.done(function() {
            logger.info('init fetch done start');
            analytics.fireAnalyticsEvent({
                category : _L('Products'),
                action : _L('Product View'),
                label : currentProduct.getName() + ' (' + currentProduct.id + ')'
            });
            // for some reason, when this line is in, edit product doesn't work
            if (currentProduct.isMaster()) {
                // product search hits only have the master id ... so if we have a variantID (query)
                //  then we should look in the variants and see if there is a match ...
                var variants = currentProduct.getVariants();
                var variant = (variants.length == 1 ? variants : variants.filter(function(v) {
                    return v.getProductId() == variantID;
                }));
                if (variant && variant.length) {
                    currentProduct.setVariationValues(variant[0].getVariationValues(), {
                        silent : true
                    });
                    currentProduct.setSelectedVariant(variant[0], {
                        silent : true
                    });
                    render().done(function() {
                        logger.info('init - Setting selected_variant and variation_values');
                        productLoad.resolve();
                        currentProduct.trigger('change:selected_variant', {});
                    });

                } else {
                    // see if there is only one orderable variant for the preselected variant choices (shouldSelectFirstValues), and if so, select it
                    var vvs = currentProduct.getVariationValues();
                    if (vvs && _.keys(vvs).length) {
                        var filteredVariants = currentProduct.getOrderableVariants(vvs);

                        if (filteredVariants && filteredVariants.length == 1) {
                            var vId = filteredVariants[0].product_id;

                            var variants = currentProduct.getVariants();
                            var variant = variants.filter(function(v) {
                                return v.getProductId() == vId;
                            });
                            if (variant && variant.length) {
                                currentProduct.setVariationValues(variant[0].getVariationValues(), {
                                    silent : true
                                });
                                currentProduct.setSelectedVariant(variant[0], {
                                    silent : true
                                });
                            }
                        }
                    }
                    render().done(function() {
                        productLoad.resolve();
                        logger.info('init - I should be looking for selected_variant if my values are pre-filled!');
                        if (variant && variant.length) {
                            currentProduct.trigger('change:selected_variant', {});
                        }
                    });
                }
            } else if (currentProduct.isStandard()) {
                render().done(function() {
                    logger.info('init - loading product prices for standard');
                    currentProduct.getProductPrices().fail(function(response, status, err) {
                        logger.error('getProductPrices fetch failed! \nmessage: ' + response.statusText + '\nerror: ' + err);
                        productLoad.reject();
                    }).done(function() {
                        productLoad.resolve();
                        logger.info('init - loaded product prices for standard or variant ... telling currentProduct to use selected_variant');
                        currentProduct.setSelectedVariant(currentProduct);
                    });
                });
            } else if (currentProduct.isVariant()) {
                // if a variant then request master product so that we get the correct variations, otherwise switching colors or sizes may not show the correct enabled items
                var masterId = currentProduct.getMasterID();
                if (!masterId) {
                    logger.error('Unable to get master id for ' + currentProduct.id);
                    productLoad.reject();
                    return;
                }
                var variantProduct = currentProduct.clone();
                currentProduct.clear({
                    silent : true
                });
                currentProduct.id = masterId;
                logger.info('fetching master product ' + masterId + '... should be silent');
                var promise = currentProduct.fetchModel({
                    silent : true
                });
                promise.done(function() {
                    currentProduct.setVariationValues(variantProduct.getVariationValues(), {
                        silent : true
                    });
                    currentProduct.setSelectedVariant(variantProduct, {
                        silent : true
                    });
                    render().done(function() {
                        logger.info('init - loading product prices for variant');
                        currentProduct.getProductPrices().fail(function(response, status, err) {
                            logger.error('getProductPrices fetch failed! \nmessage: ' + response.statusText + '\nerror: ' + err);
                            productLoad.reject();
                        }).done(function() {
                            productLoad.resolve();
                            logger.info('init - loaded product prices for standard or variant ... telling currentProduct to use selected_variant');
                            currentProduct.trigger('change:selected_variant', {});
                        });
                    });
                }).fail(function(response, status, err) {
                    logger.error('fetch failed! \nmessage: ' + response.statusText + '\nerror: ' + err);
                    productLoad.reject();
                });
            } else {
                render().done(function() {
                    productLoad.resolve();
                });
            }
            logger.info('init fetch done end');
        }).fail(function(response, status, err) {
            logger.error('fetch failed! \nmessage: ' + response.statusText + '\nerror: ' + err);
            productLoad.reject();
        });
    } else {
        // Already loaded ...
        render().done(function() {
            productLoad.resolve();
        });
    }
    logger.info('init end');

    return productLoad.promise();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('render start');

    var component = null;

    if (currentProduct.isBundle()) {
        component = 'product/main/productBundleDetail';
    } else if (currentProduct.isSet()) {
        component = 'product/main/productSetDetail';
    } else {
        component = 'product/main/productDetail';
    }

    $.product_detail = Alloy.createController(component, {
        product : currentProduct
    });
    $.listenTo($.product_detail, 'alt_image_selected', function(event) {
        altImage = event.image;
        altProduct = event.productId;
    });

    var deferred = new _.Deferred();
    $.product_detail.init({
        historyCursor : historyCursor,
        replaceItem : replaceItem
    }).always(function() {
        $.product_detail_container.add($.product_detail.getView());
        if (_.isFunction($.product_detail.postInit)) {
            $.product_detail.postInit();
        }
        deferred.resolve();
    });

    logger.info('render end');

    return deferred;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');

    $.stopListening();
    deinitPDP();
    $.destroy();
    $.product_detail_container.removeEventListener('product:zoom', handleProductZoomSelection);

    logger.info('deinit end');
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * deinitPDP - deinit pdp
 *
 * @api private
 */
function deinitPDP() {
    if ($.product_detail) {
        removeAllChildren($.product_detail_container);
        $.stopListening($.product_detail);
        $.product_detail.deinit();
    }
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleProductZoomSelection to bring up image zoom when product image is double clicked
 *
 * @param {Object} event information to get the product id from
 * @api private
 */
function handleProductZoomSelection(event) {
    logger.info('handleProductZoomSelection start');

    if (!Alloy.CFG.enable_zoom_image) {
        return;
    }

    var productId = event.product_id;
    if (altProduct) {
        productId = altProduct;
    } else {
        productId = currentProduct.getId();
    }
    var selectedVariationValue = null;
    if (currentProduct.hasVariationValues()) {
        selectedVariationValue = currentProduct.getVariationValues()[Alloy.CFG.product.color_attribute];
    }
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'product/images/imageZoom',
        options : {
            zIndex : 999
        },
        initOptions : {
            model : currentProduct,
            selected_variation_value : selectedVariationValue,
            selected_alternate_image : altImage
        },
        continueEvent : 'image_zoom:dismiss'
    });

    logger.info('handleProductZoomSelection end');
}
