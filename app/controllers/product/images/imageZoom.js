// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/images/imageZoom.js - controller for image zoom view
 */

//---------------------------------------------------
// ## VARIABLES

var selectedVariationValue = null;
var selectedAlternateImage = 0;
var swatchListeners = [];
var altImageListeners = [];

var logger = require('logging')('product:images:imageZoom', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENER

$.close_button.addEventListener('click', dismiss);
$.backdrop.addEventListener('click', dismiss);
$.detail_image_container.addEventListener('pinch', onImagePinch);
$.detail_image_container.addEventListener('touchend', onImageTouchEnd);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise
 * @api public
 */
function init(options) {
    logger.info('init called');
    var deferred = new _.Deferred();
    var product_id = options.product_id;
    selectedVariationValue = options.selected_variation_value;
    selectedAlternateImage = options.selected_alternate_image ? options.selected_alternate_image : 0;
    $model = options.model;
    if (product_id) {
        // Should look up the product by id and call render() when done()
        $model = Alloy.createModel('product');
        $model.id = product_id;
        $.detail_image_container.zoomScale = 1.0;
        $model.fetchModel().always(function(model) {
            render();
            deferred.resolve();
        });
    } else {
        // Just render with what we have
        render();
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');
    // render is called when swatches or colors are selected, so remove previous items
    cleanupView();

    $model.ensureImagesLoaded('altImages').done(function() {
        $model.ensureImagesLoaded('altZoomImages').done(function() {
            $model.ensureImagesLoaded('swatchImages').done(function() {
                var swatchGroups = $model.getSwatchImageGroups();

                // get swatches for different colors
                if (swatchGroups && swatchGroups.length > 0) {

                    var vas = $model.getVariationAttribute(Alloy.CFG.product.color_attribute);
                    var vasModels = vas.getValues();
                    var vasIndex = 0;
                    if (selectedVariationValue) {
                        for (var i = 0; i < vasModels.length; i++) {
                            if (selectedVariationValue == vasModels[i].getValue()) {
                                vasIndex = i;
                                break;
                            }
                        }
                    } else {
                        selectedVariationValue = vasModels[0].getValue();
                    }

                    $.color_label.setVisible(true);
                    $.color_name.setText(vasModels[vasIndex].getName());

                    _.each(swatchGroups, function(group, i) {
                        // only create swatches for master products if there are no variants
                        var var_attributes = group.getVariationAttributes()[0];
                        var vv = var_attributes && var_attributes.getValues()[0].getValue();
                        if ((swatchGroups.length == 1) || vv) {
                            var images = group.getImages();
                            // filter out images for which there is no inventory
                            var validValue = false;
                            for (var j = 0; j < vasModels.length; j++) {
                                if (vv == vasModels[j].getValue()) {
                                    validValue = true;
                                    break;
                                }
                            }

                            if (validValue) {
                                var altImages = $model.getAltImages(vv);
                                var swatchURL = images[0].getLink();
                                var alt_images = _.map(altImages, function(n) {
                                    return n.getLink();
                                });

                                var swatchContainer = Ti.UI.createView($.createStyle({
                                    classes : ['swatch_container_view'],
                                    apiName : 'View',
                                    borderColor : vv == selectedVariationValue ? Alloy.Styles.color.border.darkest : Alloy.Styles.color.border.lighter,
                                    swatchValueId : vv
                                }));
                                var iv = Ti.UI.createImageView($.createStyle({
                                    classes : ['swatch_image_view'],
                                    variation_value : vv,
                                    swatch_image : i,
                                    alt_images : alt_images,
                                    accessibilityLabel : 'alt_color_' + i
                                }));
                                Alloy.Globals.getImageViewImage(iv, swatchURL);
                                iv.addEventListener('click', onSwatchClick);
                                swatchListeners.push(iv);
                                swatchContainer.add(iv);

                                $.alt_swatches_box.add(swatchContainer);
                                if (!selectedVariationValue) {
                                    selectedVariationValue = vv;
                                }
                            }
                        }
                    });
                }

                // Get alternate images for current selectedVariationValue
                var smallImages = $model.getAltImages(selectedVariationValue);
                var largeImages = $model.getAltZoomImages(selectedVariationValue);
                var hiresAvailable = true;
                if (!largeImages || largeImages.length == 0) {
                    hiresAvailable = false;
                }

                var commonNumber = smallImages.length < largeImages.length ? smallImages.length : largeImages.length;
                var alt_images = _.map(smallImages, function(n) {
                    return n.getLink();
                });

                for (var i = 0; i < commonNumber; i++) {
                    var altviewContainer = Ti.UI.createView($.createStyle({
                        classes : ['alt_view_container'],
                        borderColor : i == selectedAlternateImage ? Alloy.Styles.color.border.darkest : Alloy.Styles.color.border.lighter,
                        apiName : 'View'
                    }));
                    var iv = Ti.UI.createImageView($.createStyle({
                        classes : ['alt_image_view'],
                        apiName : 'ImageView',
                        largeImage : largeImages[i].getLink(),
                        alt_image : i,
                        accessibilityLabel : 'alt_view_' + i
                    }));
                    Alloy.Globals.getImageViewImage(iv, smallImages[i].getLink());
                    altviewContainer.add(iv);
                    iv.addEventListener('click', onAltImageClick);
                    altImageListeners.push(iv);
                    $.alt_center_box.add(altviewContainer);
                }
                if (!selectedAlternateImage) {
                    selectedAlternateImage = 0;
                }

                if (hiresAvailable) {
                    $.detail_image_container.setMaxZoomScale(6.0);
                }

                if (largeImages && largeImages.length > selectedAlternateImage) {
                    Alloy.Globals.getImageViewImage($.detail_image, largeImages[selectedAlternateImage].getLink());
                }
            });
        });
    });
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.close_button.removeEventListener('click', dismiss);
    $.backdrop.removeEventListener('click', dismiss);
    $.detail_image_container.removeEventListener('pinch', onImagePinch);
    $.detail_image_container.removeEventListener('touchend', onImageTouchEnd);
    $.stopListening();
    $.destroy();
    cleanupView();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * cleanupView - cleans up the view for recreation in render
 *
 * @api private
 */
function cleanupView() {
    _.each(altImageListeners, function(listener) {
        listener.removeEventListener('click', onAltImageClick);
    });
    altImageListeners = [];
    _.each(swatchListeners, function(listener) {
        listener.removeEventListener('click', onSwatchClick);
    });
    swatchListeners = [];
    removeAllChildren($.alt_swatches_box);
    removeAllChildren($.alt_center_box);
}

/**
 * dismiss - close the image zoom dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('image_zoom:dismiss');
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAltImageClick - handles when alt image is tapped
 *
 * @api private
 */
function onAltImageClick(event) {
    event.cancelBubble = true;
    logger.info('altImageClick: ' + event.source.alt_image);
    $.detail_image_container.setZoomScale(1.0);
    selectedAlternateImage = event.source.alt_image;
    render();
}

/**
 * onSwatchClick - handles when swatch image is tapped
 *
 * @api private
 */
function onSwatchClick(event) {
    event.cancelBubble = true;
    logger.info('swatchClick: ' + event.source.swatch_image);
    $.detail_image_container.setZoomScale(1.0);
    selectedVariationValue = event.source.variation_value;
    selectedAlternateImage = 0;
    render();
}

/**
 * onImagePinch - when the image is pinched to zoom
 *
 * @param {Object} event
 * @api private
 */
function onImagePinch(event) {
    $.detail_image_container.zoomScale -= ((1.0 - event.scale) / $.detail_image_container.maxZoomScale);
}

/**
 * onImageTouchEnd - when the image zoom is done
 *
 * @api private
 */
function onImageTouchEnd() {
    $.detail_image_container.oldZoom = $.detail_image_container.zoomScale;
}
