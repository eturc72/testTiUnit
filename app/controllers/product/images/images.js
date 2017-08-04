// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/images/images.js - controller for images view
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');

var args = arguments[0] || {},
    COLOR_CONTAINER_ID_PREFIX = 'color_container_',
    $model = $model || args.product,
    product_id = args.product_id,
    loading = false,
    imageContainers = [],
    smallImagesViews = [],
    smallImagesControllers = [];

var logger = require('logging')('product:images:images', getFullControllerPath($.__controllerPath));

// Use passed in parameter 'product' or global singleton
var currentProduct = $model || Alloy.Models.product;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.images.addEventListener('doubletap', imagesDoubleTapEventHandler);
$.pdp_image_scroller.addEventListener('scrollend', pdpImageScrollerScrollendEventHandler);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentProduct, 'change:variation_values', function(model, change, options) {
    if (change && change[Alloy.CFG.product.color_attribute]) {
        resetVariationSelection(currentProduct.getVariationValues());
    }
});

$.listenTo(currentProduct, 'change:id', render);

//---------------------------------------------------
// ## PUBLIC API

// init calls render
exports.init = init;
exports.deinit = deinit;
exports.resetVariationSelection = resetVariationSelection;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    imageContainers = [];
    if (product_id && !$model) {
        // Should look up the product by id and call render() when done()
        currentProduct = Alloy.createModel('product');
        currentProduct.id = product_id;
        currentProduct.ensureImagesLoaded('heroImage').done(function() {
            render();
        });
    } else {
        // Just render with what we have
        currentProduct.ensureImagesLoaded('heroImage').done(function() {
            render();
        }).fail(function() {
            logger.error('cannot get images!');
        });
    }
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render start');

    var imageViews = $.pdp_image_scroller.views || [];

    for (var i = 0,
        ii = imageViews.len; i < ii; i++) {
        $.pdp_image_scroller.removeView(imageViews[i]);
    }
    if (currentProduct.isBundle()) {
        // This should be done another way, in the SDK layer, but I think we should statically generate the model files ...
        // Which is kinda a big change.
        renderBundleOrSet(currentProduct.getBundledProducts());
    } else if (currentProduct.isSet()) {
        renderBundleOrSet(currentProduct.getSetProducts());
    } else {
        renderProduct();
    }

    logger.info('render end');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.images.removeEventListener('doubletap', imagesDoubleTapEventHandler);
    $.pdp_image_scroller.removeEventListener('scrollend', pdpImageScrollerScrollendEventHandler);
    _.each(smallImagesViews, function(view) {
        view.removeEventListener('alt_image_selected', altImageSelectedEventHandler);
    });
    _.each(smallImagesControllers, function(controller) {
        controller.deinit();
    });
    _.each(imageContainers, function(controller, key) {
        controller.deinit();
    });
    smallImagesViews = null;
    smallImagesControllers = null;
    imageContainers = null;
    removeAllChildren($.pdp_image_scroller);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * resetVariationSelection - reset the image selected based on variation selected
 *
 * @param {Object} event
 * @api private
 */
function resetVariationSelection(event) {
    logger.info('resetVariationSelection start');

    // filter variants based on selected attributes
    var selectedAttributes = currentProduct.getVariationValues(),
        aid;

    for (aid in selectedAttributes) {
        if (aid === Alloy.CFG.product.color_attribute) {
            var viewId = COLOR_CONTAINER_ID_PREFIX + event[aid];
            var imageView = $.pdp_image_scroller[viewId];
            if (imageView) {
                $.pdp_image_scroller.scrollToView(imageView);
            }
        }
    }

    logger.info('resetVariationSelection end');
}

/**
 * renderProduct - render view for product
 *
 * @api private
 */
function renderProduct() {
    logger.info('renderProduct start');
    var imageGroups = currentProduct.getHeroImageGroups();
    var altImagesInfo = [],
        imageViews = [];

    currentProduct.ensureImagesLoaded('altImages').done(function() {
        var imageGroup,
            imageGroupImages,
            image,
            imageContainer,
            variationValue,
            valuePrefix,
            altContainer,
            altImages,
            commonNumber,
            smallImage,
            counter = -1,
            imageGroupsLength = imageGroups ? imageGroups.length : 0;

        if (imageGroupsLength == 0) {
            logger.error('product/components/images: heroImage group empty for product id ' + currentProduct.getId());
        }

        for (var i = 0, ii = imageGroupsLength; i < ii; i++) {
            // make the first large image visible
            imageGroup = imageGroups[i];

            variationValue = determineImageVariationValue(imageGroup);
            valuePrefix = variationValue || 'default';

            // If there a bunch of colors ... then skip the first one
            if (ii > 1 && !variationValue) {
                continue;
            }
            counter++;
            imageGroupImages = imageGroup.getImages();
            image = imageGroupImages[0].getLink();

            imageContainer = Alloy.createController('product/images/imageContainer');

            imageContainer.init(valuePrefix, image);
            imageContainer.number = counter;

            altContainer = imageContainer.getAltContainer();

            altImages = currentProduct.getAltImages(valuePrefix);
            commonNumber = imageGroupImages.length > altImages.length ? altImages.length : imageGroupImages.length;
            // create the small images to put in the alternate view
            for (var j = 0; j < commonNumber; j++) {
                smallImage = Alloy.createController('product/images/alternateImage');
                smallImagesControllers.push(smallImage);

                smallImage.init({
                    largeImageView : imageContainer.getLargeImageView(),
                    largeImage : imageGroupImages[j].getLink(),
                    image : altImages[j].getLink(),
                    altImageNumber : j,
                    imageContainerNumber : imageContainer.number
                });
                altContainer.add(smallImage.getView());

                smallImagesViews.push(smallImage.getView());

            }

            addVideos({
                videoURL : 'http://assets.appcelerator.com.s3.amazonaws.com/video/media.m4v',
                imageContainerNumber : imageContainer.number,
                altImageNumber : commonNumber,
                videoPlayer : imageContainer.getVideoPlayer(),
                altContainer : altContainer

            });

            _.each(smallImagesViews, function(view) {
                view.addEventListener('alt_image_selected', altImageSelectedEventHandler);
            });

            imageViews.push(imageContainer.getView());
            $.pdp_image_scroller[COLOR_CONTAINER_ID_PREFIX + valuePrefix] = imageContainer.getColorContainer();
            imageContainers[counter] = imageContainer;
            imageContainer.selectedImage = 0;
        }
        $.pdp_image_scroller.setViews(imageViews);
    });

    logger.info('renderProduct end');
}

/**
 * renderBundleOrSet - render view for bundle or sets
 *
 * @param {Object} products
 * @api private
 */
function renderBundleOrSet(products) {
    logger.info('renderBundleOrSet start');

    var largeImageGroups = [],
        smallImageGroups = [],
        altImages = [],
        imageProduct = currentProduct,
        imagePromises = [];

    // load all images for products first
    _.each(products, function(product) {
        var deferred = new _.Deferred();
        product.ensureImagesLoaded('heroImage').always(function() {
            product.ensureImagesLoaded('altImages').always(function() {
                deferred.resolve();
            });
        });
        imagePromises.push(deferred);
    });

    _.when(imagePromises).done(function() {
        // create the initial image container with the first image
        var imageGroups = products[0].getHeroImageGroups();
        var imageGroup = imageGroups[0];
        if (!imageGroup) {
            logger.error('product/components/images: heroImage group empty for products of bundle or set ' + currentProduct.getId());
            return;
        }
        var imageGroupImages = imageGroup.getImages();
        var valuePrefix = determineImageVariationValue(imageGroup) || 'default';

        // create one large image container
        var imageContainer = Alloy.createController('product/images/imageContainer');
        imageContainer.init(valuePrefix, imageGroupImages[0].getLink());

        var altContainer = imageContainer.getAltContainer();

        // for each image group, add the one alternate image that is a small image for that will link
        // to the large image
        _.each(products, function(product, index) {
            var imageGroups = product.getHeroImageGroups();
            var imageGroup = imageGroups[0];
            imageGroupImages = imageGroup.getImages();

            var altImages = product.getAltImages(valuePrefix);

            var altImageLink = altImages && altImages.length > 0 ? altImages[0].getLink() : Alloy.Styles.imageNotAvailableImage;
            var smallImage = Alloy.createController('product/images/alternateImage');
            smallImagesControllers.push(smallImage);
            smallImage.init({
                largeImageView : imageContainer.getLargeImageView(),
                largeImage : imageGroupImages[0].getLink(),
                image : altImageLink,
                altImageNumber : 0,
                imageContainerNumber : index,
                productNumber : index
            });
            altContainer.add(smallImage.getView());

            smallImagesViews.push(smallImage.getView());
        });
        addVideos({
            videoURL : 'http://assets.appcelerator.com.s3.amazonaws.com/video/media.m4v',
            imageContainerNumber : 0, //For bundle or Sets we only have one image container
            altImageNumber : largeImageGroups.length,
            videoPlayer : imageContainer.getVideoPlayer(),
            altContainer : altContainer,
        });
        altImageSelectedEventHandler = function(event) {

            if (event.video) {
                //if event has video property then vidImage was clicked
                imageContainer.showVideo();
            } else {
                event.productId = products[0].getId();
                $.trigger('alt_image_selected', event);
                imageContainer.stopVideoAndShowImage();
                //if video is enabled and an smallImage is clicked while video is playing stop video and show Image
            }

        };
        _.each(smallImagesViews, function(view) {
            view.addEventListener('alt_image_selected', altImageSelectedEventHandler);
        });

        $.pdp_image_scroller.addView(imageContainer.getView());
        $.pdp_image_scroller[COLOR_CONTAINER_ID_PREFIX + valuePrefix] = imageContainer.getColorContainer();
        // only one imageContainer for all alt images of bundle/set
        imageContainers[0] = imageContainer;
        imageContainer.selectedImage = 0;
    });

    logger.info('renderBundleOrSet end');
}

/**
 * determineImageVariationValue - obtains the variation value from an image group
 *
 * @param {Object} imageGroup
 * @api private
 */
function determineImageVariationValue(imageGroup) {
    var variationValue = null;
    if (imageGroup && imageGroup.getVariationAttributes) {
        var varAttributes = imageGroup.getVariationAttributes()[0];
        if (varAttributes) {
            variationValue = varAttributes.getValues()[0].getValue();
        }
    }
    return variationValue;
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * imagesDoubleTapEventHandler - event listener for image double tapped to zoom
 *
 * @param {Object} event
 * @api private
 */
function imagesDoubleTapEventHandler(event) {
    event.cancelBubble = true;
    $.images.fireEvent('product:zoom', {
        product_id : product_id
    });
}

/**
 * pdpImageScrollerScrollendEventHandler - event listener for image scroll
 *
 * @param {Object} event
 * @api private
 */
function pdpImageScrollerScrollendEventHandler(event) {
    _.each(imageContainers, function(controller) {
        controller.stopVideo();
    });
    if (event.view && event.view.id && event.view.id.indexOf(COLOR_CONTAINER_ID_PREFIX) == 0) {
        var variationValue = event.view.id.substring(COLOR_CONTAINER_ID_PREFIX.length);

        var pair = {},
            variationValues = currentProduct.getVariationValues();
        pair[Alloy.CFG.product.color_attribute] = variationValue;

        logger.info('updating variation_values with new selection: ' + JSON.stringify(pair));
        var selectedVariationValues = _.extend({}, variationValues, pair);
        currentProduct.setVariationValues(selectedVariationValues);
        $.trigger('alt_image_selected', {
            image : imageContainers[event.currentPage].selectedImage
        });
    }
}

/**
 * altImageSelectedEventHandler - event listener for alt image selected
 *
 * @param {Object} event
 * @api private
 */
function altImageSelectedEventHandler(event) {

    if (event.video) {
        //if event has video property then vidImage was clicked
        imageContainers[event.imageContainerNumber].showVideo();
    } else {
        $.trigger('alt_image_selected', event);
        imageContainers[event.imageContainerNumber].selectedImage = event.image;
        imageContainers[event.imageContainerNumber].stopVideoAndShowImage();
        //if video is enabled and an smallImage is clicked while video is playing stop video and show Image
    }

}

//--------------------------------------------------------------------------------------------
//video support (This is only a sample. Users have to implement this to suit their needs )
//--------------------------------------------------------------------------------------------

/**
 * addVideos - sample for adding videos to PDP images
 *
 * @param {Object} args
 * @api private
 */
function addVideos(args) {

    if (Alloy.CFG.product.enable_video_player) {
        //if enable_video_player_on_pdp is true
        //this can be a loop if you have multiple videos for the same product  or variation
        var vidImage = Alloy.createController('product/images/alternateVideo');
        //instantiate the small image representing a video. When clicked the video starts playing
        smallImagesControllers.push(vidImage);
        //keep track of controllers to deinit them later

        vidImage.init({//initialize the small image with the URL of the video, the videoPayer, the index(number) of the small image and the container index
            videoURL : args.videoURL, //direct link to video
            videoPlayer : args.videoPlayer, //video player  of current image container
            altImageNumber : args.altImageNumber, //this number is the index of the small image. could be incremented in case of multiple videos
            imageContainerNumber : args.imageContainerNumber // current imageContainer index
        });
        args.altContainer.add(vidImage.getView());
        // small vidImage will be added to the end of other alternate images

        smallImagesViews.push(vidImage.getView());
        // keep track of vidImage so its listeners can be removed later
    }
}

//--------------------------------------------------------------------------------------------
//video support
//--------------------------------------------------------------------------------------------
