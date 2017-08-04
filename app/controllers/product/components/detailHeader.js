// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/detailHeader.js - controller for product detail header
 */

//---------------------------------------------------
// ## VARIABLES

$.currentProduct = Alloy.Models.product;
var logger = require('logging')('product:components:detailHeader', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

// init calls render
exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.setProductID = setProductID;
exports.setPrice = setPrice;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    $.pricing.init({
        model : $.currentProduct
    });
    $.product_id.init();
    $.render();
}

/**
 * RENDER
 *
 * @api protected
 */
function render() {
    logger.info('render called');
    var id = $.currentProduct.getId();
    setProductID();
    $.product_name.setText($.currentProduct.getName());

    $.pdp_ratings.setVisible(Alloy.CFG.product.ratings.max_rating > 0);

    var rating = Alloy.CFG.product.ratings.attribute_name ? $.currentProduct.get(Alloy.CFG.product.ratings.attribute_name) : 0;
    rating = rating || 0;

    var fraction = rating % 1;

    if (fraction) {
        rating = Math.floor(rating);
    }

    // Add in ratings stars
    for (var i = 0; i < Alloy.CFG.product.ratings.max_rating; i++) {
        var imagepath = null;
        if (rating > i) {
            imgpath = Alloy.CFG.product.ratings.starFull;
        } else if (fraction) {
            imgpath = Alloy.CFG.product.ratings.starHalf;
            fraction = 0;
        } else {
            imgpath = Alloy.CFG.product.ratings.starNone;
        }

        // Can't use classes b/c of Bug: AC-637 and derived detailHeaderSet, once fixed we should use 'star_image' class
        var imageView = Ti.UI.createImageView({
            image : imgpath,
            accessibilityValue : 'rating_stars',
            width : 20,
            height : 20
        });
        Alloy.Globals.getImageViewImage(imageView, imgpath);
        $.stars.add(imageView);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    $.pricing.deinit();
    $.product_id.deinit();
    removeAllChildren($.stars);
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * setProductID - sets the product id in the header
 *
 * @param {Object} new_id
 * @api public
 */
function setProductID(new_id) {
    logger.info('setProductID called with ' + new_id);
    $.product_id.setId(new_id || _L('n/a'));
}

/**
 * setPrice - Sets the price in the header
 *
 * @param {Object} new_price
 * @api public
 */
function setPrice(new_price) {
    logger.info('setPrice called with ' + new_price);
    $.pricing.setPrice(new_price);
}
