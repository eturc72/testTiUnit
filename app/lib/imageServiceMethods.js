// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/imageServiceMethods.js - image service mixin methods
 * The mixinImageServiceMethods will dynamically add image accessor methods to the supplied
 * object's prototype object. If you want to add your own image service then you must expose
 * the following methods that should ideally be added to the supplied oject's prototype:
 *
 *   getCartImage = function()
 *   getProductTileImage = function()
 *   getHeroImage = function(variationValue)
 *   getCategoryTileImage = function()
 *   getImageSwatchLink = function()
 *   getAltImages = function(variationValue)
 *   getAltZoomImages = function(variationValue)
 *   getLargeAltZoomImages = function(variationValue)
 *   getBundleProductImages = function(variationValue)
 *   getSetProductImages = function(attribute)
 *   getSwatchImages = function(variationValue)
 *
 * The functions above are the public interface to the rest of the application. You should only
 * ever mixin these functions into a prototype that needs to implement an image service.
 *
 * Note that some objects that have the above methods mixed have properties like 'image_swatch'
 * which is why the methods above are named as they are, for example getImageSwatchLink(). In order
 * to avoid clashing with the ocapi_methods mixins we have given these method unique names which
 * will not clash with methods that already exist on model objects or methods that are mixed in
 * by ocapi_methods.
 */
function mixinImageServiceMethods(model_class) {
    // checks to see if the functions have already been mixed in
    if (!model_class.prototype.getHeroImage && !model_class.prototype.getCartImage && !model_class.prototype.getProductTileImage) {
        require(Alloy.CFG.image_service.type + 'Methods').mixinImageServiceMethods(model_class);
    }
}

module.exports = mixinImageServiceMethods;
