// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/disImageServiceMethods.js - Functions for DIS Image service
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('images:disImageServiceMethods', 'app/lib/disImageServiceMethods');

var buildURLParams = require('EAUtils').buildURLParams;

//---------------------------------------------------
// ## PUBLIC API

exports.mixinImageServiceMethods = mixinImageServiceMethods;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * mixinImageServiceMethods - mixin methods
 *
 * @param {Object} model_class
 * @api public
 */
function mixinImageServiceMethods(model_class) {
    /**
     * getImageForContext - get image for context on model
     *
     * @param {Object} context
     * @param {Object} data
     * @return {String} image link
     * @api public
     */
    model_class.prototype.getImageForContext = function(context, data) {
        if (!context) {
            return null;
        }

        var imageRef = null;
        switch (context) {
        case 'cart':
            imageRef = getCartImage(this, data);
            break;

        case 'productTile':
            imageRef = getSearchHitImage(this, data);
            break;

        case 'heroImage':
            imageRef = getImageFromImageGroup(this, data);
            break;

        case 'categoryTile':
            imageRef = getImageForCategoryTile(this, context);
            break;

        case 'imageSwatchLink':
            imageRef = getColorSwatchImage(this, context);
            break;
        }

        if (imageRef) {
            return getDynamicImageServiceImage(this, imageRef, context);
        }
        return Alloy.CFG.image_service.placeholderImageURL;

        /**
         * getSearchHitImage - get search hit image
         *
         * @param {Object} hit
         * @param {Object} data
         * @return {String} image link
         * @api private
         */
        function getSearchHitImage(hit, data) {
            var imageObj = hit.get('image');
            return imageObj ? imageObj.get('link') : null;
        }

        /**
         * getCartImage - get cart image
         *
         * @param {Object} product
         * @param {Object} data
         * @return {String} image link
         * @api private
         */
        function getCartImage(product, data) {
            var images,
                vvs = product.getVariationValues();
            if (vvs && vvs.color) {
                images = product.getImages('cart', vvs.color);
                if (!images) {
                    images = product.getImages('cart');
                }
            } else {
                images = product.getImages('cart');
            }
            if (images && images.length > 0) {
                return images[0].get('link');
            }
            return null;
        }

        /**
         * getImageFromImageGroup - get image from image group for product
         *
         * @param {Object} product
         * @param {Object} imageGroup
         * @return {String} image link
         * @api private
         */
        function getImageFromImageGroup(product, imageGroup) {
            return imageGroup.get('images').at(0).get('link');
        }

        /**
         * getImageForCategoryTile - get image for category tile
         *
         * @param {Object} category
         * @param {Object} context
         * @return {String} image link
         * @api private
         */
        function getImageForCategoryTile(category, context) {
            return category.get('thumbnail');
        }

        /**
         * getColorSwatchImage - get image swatch for color
         *
         * @param {Object} color
         * @param {Object} context
         * @return {String} image link
         * @api private
         */
        function getColorSwatchImage(color, context) {
            return color.get('image_swatch').get('link');
        }

        /**
         * getDynamicImageServiceImage - Transform an image link to a DIS image link
         *
         * @param {Object} model
         * @param {Object} imageRef
         * @param {Object} context
         * @return {String} image link
         * @api private
         */
        function getDynamicImageServiceImage(model, imageRef, context) {
            logger.info('getImageForContext getDynamicImageServiceImage for ' + context);
            if (context === 'categoryTile') {
                return imageRef;
            }
            var urlParams = buildURLParams(Alloy.CFG.image_service.dynamic_size[context]);

            if (_.isArray(imageRef)) {
                _.each(imageRef, function(imageObj) {
                    var link = imageObj.get('link');
                    imageObj.set('link', model.transformImageLink(link, urlParams), {
                        silent : true
                    });
                });
            } else {
                imageRef = model.transformImageLink(imageRef, urlParams);
            }

            return imageRef;
        }

    };

    /**
     * getImagesForContext - get images for context
     *
     * @param {Object} context
     * @param {Object} data
     * @return {String} image link
     * @api public
     */
    model_class.prototype.getImagesForContext = function(context, data) {
        if (!context) {
            return null;
        }

        var imageRef = null;
        switch (context) {
        case 'altImages':
        case 'altZoomImages':
        case 'largeAltZoomImages':
        case 'bundleProductImages':
        case 'setProductImages':
        case 'swatchImages':
            imageRef = getProductImages(this, context, data);
            break;
        }

        if (imageRef) {
            return getDynamicImageServiceImage(this, imageRef, context);
        }
        return Alloy.CFG.image_service.placeholderImageURL;

        /**
         * getProductImages - get product images
         *
         * @param {Object} product - product model
         * @param {Object} context - image type to get
         * @param {Object} variationValue - product variation
         * @return {Array} images
         * @api private
         */
        function getProductImages(product, context, variationValue) {
            return product.getImages(context, variationValue) || [];
        }

        /**
         * getDynamicImageServiceImage - Transform an image link to a DIS image link
         *
         * @param {Object} model
         * @param {Object} imageRef
         * @param {Object} context
         * @return {String} image link
         * @api private
         */
        function getDynamicImageServiceImage(model, imageRef, context) {
            logger.info('getImagesForContext getDynamicImageServiceImage for ' + context);
            var urlParams = buildURLParams(Alloy.CFG.image_service.dynamic_size[context]);

            if (_.isArray(imageRef)) {
                _.each(imageRef, function(imageObj) {
                    var link = imageObj.get('link');
                    imageObj.set('link', model.transformImageLink(link, urlParams), {
                        silent : true
                    });
                });
            } else {
                imageRef = model.transformImageLink(imageRef, urlParams);
            }

            return imageRef;
        }

    };

    /**
     * getImageGroupsForContext - get image groups for context
     *
     * @param {Object} context
     * @param {Object} data
     * @param {Objectg} image groups
     * @api public
     */
    model_class.prototype.getImageGroupsForContext = function(context, data) {
        var imageGroups;

        if (this.isMaster() || this.isVariant()) {
            imageGroups = product.getOrderableColorImageGroups(context);
        }

        if (!imageGroups) {
            imageGroups = product.getImageGroupsForViewType(context);
        }

        return imageGroups;
    };

    /**
     * getImageViewType - get image view type
     *
     * @param {Object} context
     * @return {String} view type for context
     * @api public
     */
    model_class.prototype.getImageViewType = function(context) {
        return Alloy.CFG.image_service.view_type[context];
    };

    /**
     * transformImageGroupImageURLs - transform image groups
     *
     * @param {Object} imageGroupJSON
     * @param {Object} view_type
     * @return {Object} imageGroupJSON
     * @api public
     */
    model_class.prototype.transformImageGroupImageURLs = function(imageGroupJSON, view_type) {
        logger.info('transformImageGroupImageURLs for ' + view_type);
        if (!imageGroupJSON) {
            return null;
        }

        if (view_type === 'categoryTile') {
            return imageGroupJSON;
        }
        var urlParams = buildURLParams(Alloy.CFG.image_service.dynamic_size[view_type]);

        if (_.isArray(imageGroupJSON)) {
            _.each(imageGroupJSON, function(imageGroupObj) {
                _.each(imageGroupObj.images, function(imageObj) {
                    imageObj.link = model_class.prototype.transformImageLink(imageObj.link, urlParams);
                });
            });
        } else {
            imageGroupJSON = model_class.prototype.transformImageLink(imageGroupJSON.link, urlParams);
        }

        return imageGroupJSON;
    };

    /**
     * transformImageLink - transform the image link from a dw image service to a dis image service
     *
     * @param {Object} link
     * @param {Object} urlParams
     * @return {String} image url
     * @api public
     */
    model_class.prototype.transformImageLink = function(link, urlParams) {
        var newLink = link,
        // don't include any previous size arguments
            baseUrl = link.split('?')[0];

        // don't translate the missing image link as that won't be found on the dis image service
        if (link.indexOf(Alloy.Styles.imageNotAvailableImage) != -1) {
            return newLink;
        }
        var productionBaseUrl = Alloy.CFG.image_service.productionBaseUrl;
        if (link.search(productionBaseUrl) == -1) {
            // pull off storefront from image link and replace with dis image service
            var siteName = Alloy.CFG.storefront_home.substr(Alloy.CFG.storefront_home.lastIndexOf('/') + 1);
            if (baseUrl.indexOf('/' + siteName + '/') == -1) {
                siteName = '-';
            }
            var start = baseUrl.indexOf('/' + siteName + '/') + siteName.length + 2,
                filepath = baseUrl.substr(start);
            if (productionBaseUrl.lastIndexOf('/') < productionBaseUrl.length - 1) {
                productionBaseUrl += '/';
            }
            // create the new dis image service url with the params based on the view type config
            newLink = productionBaseUrl + filepath + urlParams;
        } else {
            // already using dis image service so append the new params
            newLink = baseUrl + urlParams;
        }
        logger.info('image link: ' + newLink);
        return newLink;
    };

    var imageServiceUtilityMethods = require('imageServiceUtilityMethods');
    imageServiceUtilityMethods.mixinImageServiceUtilityMethods(model_class);
}
