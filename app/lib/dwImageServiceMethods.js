// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dwImageServiceMethods.js - Functions for Digital Image service
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('images:dwImageServiceMethods', 'app/lib/dwImageServiceMethods');

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

        if (imageRef || imageRef != '') {
            return imageRef;
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
            if (vvs && vvs[Alloy.CFG.product.color_attribute]) {
                images = product.getImages('cart', vvs[Alloy.CFG.product.color_attribute]);
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

        if (imageRef || imageRef != '') {
            return imageRef;
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
        // = product.getImageGroupsForViewType(context);

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
        logger.info('image link: ' + JSON.stringify(imageGroupJSON));
        return imageGroupJSON;
    };

    var imageServiceUtilityMethods = require('imageServiceUtilityMethods');
    imageServiceUtilityMethods.mixinImageServiceUtilityMethods(model_class);
}
