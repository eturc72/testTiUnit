// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/main/bundledProducts.js - view for displaying product bundle
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:main:bundledProduct', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args
 * @return {Deferred} promise for creating view
 * @api public
 */
function init(args) {
    logger.info('init called');
    var deferred = new _.Deferred();

    $.name.setText($model.getName());
    $.quantity.setText($model.getQuantity() || 1);

    $model.ensureImagesLoaded('bundleProductImages').done(function() {
        var smallImages = $model.getBundleProductImages();
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
            model : $model,
            replaceItem : args.replaceItem
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
    $.stopListening();

    $.promotions.deinit();
    $.variations.deinit();
    $.options.deinit();
}

