// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/imageServiceUtilityMethods.js - image service utility methods
 * Note that the methods below can only be mixed into a imageService class. The imageService
 * class needs to contain a getImageForContext() method and getImagesForContext() method.
 * Mixing these methods into any other class will yield errors at runtime because the methods
 * mentioned above will not be defined.
 */

//---------------------------------------------------
// ## PUBLIC API

exports.mixinImageServiceUtilityMethods = mixinImageServiceUtilityMethods;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * mixinImageServiceUtilityMethods - mixin methods for imageService class
 *
 * @param {Object} model_class
 * @api public
 */
function mixinImageServiceUtilityMethods(model_class) {
    // Utility Methods

    /**
     * getCartImage - return the cart image
     *
     * @return {Object}
     * @api public
     */
    model_class.prototype.getCartImage = function() {
        return this.getImageForContext('cart');
    };

    /**
     * getProductTileImage - return the product tile image
     *
     * @return {Object}
     * @api public
     */
    model_class.prototype.getProductTileImage = function() {
        return this.getImageForContext('productTile');
    };

    /**
     * getHeroImage - return the hero image for the product PDP
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getHeroImage = function(variationValue) {
        return this.getImageForContext('heroImage', variationValue ? variationValue : null);
    };

    /**
     * getHeroImageGroups - return the hero image group for the product PDP
     *
     * param {Object} variationValue of product
     * @return {Object} image group
     * @api public
     */
    model_class.prototype.getHeroImageGroups = function(variationValue) {
        return this.getImageGroupsForViewType('heroImage', variationValue ? variationValue : null);
    };

    /**
     * getCategoryTileImage - return the category tile image
     *
     * @return {Object}
     * @api public
     */
    model_class.prototype.getCategoryTileImage = function() {
        return this.getImageForContext('categoryTile');
    };

    /**
     * getImageSwatchLink - return the swatch image
     *
     * @return {Object}
     * @api public
     */
    model_class.prototype.getImageSwatchLink = function() {
        return this.getImageForContext('imageSwatchLink');
    };

    /**
     * getAltImages - return the alternate images for PDP
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getAltImages = function(variationValue) {
        return this.getImagesForContext('altImages', variationValue ? variationValue : null);
    };

    /**
     * getAltZoomImages - return the alt images for zoom
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getAltZoomImages = function(variationValue) {
        return this.getImagesForContext('altZoomImages', variationValue ? variationValue : null);
    };

    /**
     * getLargeAltZoomImages - return the large alt images for zoom
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getLargeAltZoomImages = function(variationValue) {
        return this.getImagesForContext('largeAltZoomImages', variationValue ? variationValue : null);
    };

    /**
     * getBundleProductImages - return the bundle product images
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getBundleProductImages = function(variationValue) {
        return this.getImagesForContext('bundleProductImages', variationValue ? variationValue : null);
    };

    /**
     * getSetProductImages - return the product set images
     *
     * @param {Object} attribute of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getSetProductImages = function(attribute) {
        return this.getImagesForContext('setProductImages', attribute ? attribute : null);
    };

    /**
     * getSwatchImages - return the swatch images
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getSwatchImages = function(variationValue) {
        return this.getImagesForContext('swatchImages', variationValue ? variationValue : null);
    };

    /**
     * getSwatchImageGroups - return the swatch image groups
     *
     * @param {Object} variationValue of product
     * @return {Object}
     * @api public
     */
    model_class.prototype.getSwatchImageGroups = function(variationValue) {
        return this.getImageGroupsForViewType('swatchImages', variationValue ? variationValue : null);
    };

    /**
     * getFirstImageFromImageGroup - return the first image from image group
     *
     * @return {Object}
     * @api public
     */
    model_class.prototype.getFirstImageFromImageGroup = function() {
        if (this.get('image_groups').length > 0) {
            return this.getHeroImage(this.get('image_groups').at(0));
        }
        return null;
    };
}
