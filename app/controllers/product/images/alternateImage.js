// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/images/alternateImage.js - controller for an alternate image view
 */

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.small_image_view.addEventListener('click', handleClick);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} config
 * @api public
 */
function init(config) {
    $.small_image_view.large_view = config.largeImageView;
    $.small_image_view.large_image = config.largeImage;
    Alloy.Globals.getImageViewImage($.small_image_view, config.image);
    $.small_image_view.alt_image_number = config.altImageNumber;
    $.small_image_view.image_container_number = config.imageContainerNumber;
    $.small_image_view.product_number = config.productNumber;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.small_image_view.large_view = null;
    $.small_image_view.large_image = null;
    $.small_image_view.alt_image_number = null;
    $.small_image_view.image_container_number = null;
    $.small_image_view.product_number = null;
    $.small_image_view.removeEventListener('click', handleClick);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleClick - small image view click listener
 *
 * @param {Object} event
 * @api private
 */
function handleClick(event) {
    // Load associated image
    Alloy.Globals.getImageViewImage(event.source.large_view, event.source.large_image);
    $.alt_image_container.fireEvent('alt_image_selected', {
        image : event.source.alt_image_number,
        imageContainerNumber : event.source.image_container_number,
        productNumber : event.source.product_number
    });
}