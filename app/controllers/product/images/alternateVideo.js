// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/images/alternateVideo.js - controller for an alternate video view
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:images:alternateVideo', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.small_video_view.addEventListener('click', handleClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} config - settings for video
 * @api public
 */
function init(config) {
    logger.info('init called');
    $.small_video_view.videoPlayer = config.videoPlayer;
    $.small_video_view.video = config.videoURL;
    $.small_video_view.alt_image_number = config.altImageNumber;
    $.small_video_view.image_container_number = config.imageContainerNumber;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.small_video_view.videoPlayer = null;
    $.small_video_view.video = null;
    $.small_video_view.alt_image_number = null;
    $.small_video_view.image_container_number = null;
    $.small_video_view.removeEventListener('click', handleClick);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleClick - video click listener
 *
 * @param {Object} event
 * @api private
 */
function handleClick(event) {
    logger.info('handleClick called');
    // Load associated video
    event.source.videoPlayer.setUrl(event.source.video);
    $.alt_video_container.fireEvent('alt_image_selected', {
        video : event.source.video,
        imageContainerNumber : event.source.image_container_number
    });
}
