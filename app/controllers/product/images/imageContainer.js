// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/images/imageContainer.js - controller for the image container
 */

//---------------------------------------------------
// ## VARIABLES

var keepSessionAlive;
var logger = require('logging')('product:images:imageContainer', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS
if (Alloy.CFG.product.enable_video_player) {
    $.listenTo(Alloy.eventDispatcher, 'app:header_bar_clicked', pauseVideo);
    $.listenTo(Alloy.eventDispatcher, 'app:navigation', stopVideo);
    $.listenTo(Alloy.eventDispatcher, 'app:dialog_displayed', pauseVideo);
}

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getAltContainer = getAltContainer;
exports.getColorContainer = getColorContainer;
exports.getLargeImageView = getLargeImageView;
exports.getVideoPlayer = getVideoPlayer;
exports.stopVideoAndShowImage = stopVideoAndShowImage;
exports.showVideo = showVideo;
exports.stopVideo = stopVideo;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(valuePrefix, image) {
    logger.info('init called');
    $.large_image_view.id = 'large_image_' + valuePrefix;
    $.color_container.id = 'color_container_' + valuePrefix;
    $.image_view.id = 'image_' + valuePrefix;
    $.alt_container.id = 'alt_container_' + valuePrefix;
    Alloy.Globals.getImageViewImage($.large_image_view, image);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    if (Alloy.CFG.product.enable_video_player) {
        $.pdp_video_player.stop();
        $.pdp_video_player.release();
        //release video resource and free memory
        $.large_image_container.remove($.pdp_video_player);
        $.video_play_button.removeEventListener('click', playProductVideo);
        $.pdp_video_player.removeEventListener('playbackstate', handlePlaybackStateChange);
    }
    $.large_image_container.removeAllChildren();
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * getAltContainer - returns the container for alt images
 *
 * @return {View} alt container
 * @api public
 */
function getAltContainer() {
    return $.alt_container;
}

/**
 * getColorContainer - returns the container for colors
 *
 * @return {View} color container
 * @api public
 */
function getColorContainer() {
    return $.color_container;
}

/**
 * getLargeImageView - returns the container for large images
 *
 * @return {View} large image view
 * @api public
 */
function getLargeImageView() {
    return $.large_image_view;
}

/**
 * getVideoPlayer - returns the video player container
 *
 * @return {View} video player view
 * @api public
 */
function getVideoPlayer() {
    return $.pdp_video_player;
}

/**
 * stopVideoAndShowImage - stops video and shows image
 *
 * @api public
 */
function stopVideoAndShowImage() {
    logger.info('stopVideoAndShowImage called');
    // Stops and hide video and  show image  of product
    if (Alloy.CFG.product.enable_video_player) {
        $.pdp_video_player.stop();
        $.pdp_video_player.hide();
        $.video_play_button.hide();
        showLargeImage();
    }
}

/**
 * showVideo - show the video and play
 *
 * @api public
 */
function showVideo() {
    logger.info('showVideo called');
    // Hide the image, show video and play it
    if (Alloy.CFG.product.enable_video_player && !$.pdp_video_player.getVisible()) {
        $.pdp_video_player.show();
        $.video_play_button.show();
        $.pdp_video_player.play();
        hideLargeImage();
    }
}

/**
 * playProductVideo - play product video
 *
 * @api private
 */
function playProductVideo() {
    logger.info('playProductVideo called');
    //Play video
    $.pdp_video_player.play();
}

/**
 * hideLargeImage - hides the large image view
 *
 * @api private
 */
function hideLargeImage() {
    logger.info('hideLargeImage called');
    // Hide large image view.
    $.large_image_view.hide();
    _.extend($.large_image_view, {
        width : 0,
        height : 0
    });
}

/**
 * showLargeImage - show the large image view
 *
 * @api private
 */
function showLargeImage() {
    logger.info('showLargeImage called');
    // Show large image view.
    _.extend($.large_image_view, {
        width : null,
        height : null
    });
    //setting these atrributes to null for view to use the top left attributes that were originally set
    $.large_image_view.show();
}

/**
 * handlePlaybackStateChange - listener for video state
 *
 * @param {Object} event
 * @api private
 */
function handlePlaybackStateChange(event) {
    logger.info('handlePlaybackStateChange called');
    // Handle the change of the video player playback state
    if (event.playbackState == Titanium.Media.VIDEO_PLAYBACK_STATE_STOPPED || event.playbackState == Titanium.Media.VIDEO_PLAYBACK_STATE_PAUSED) {
        //if the video is stopped or paused
        clearInterval(keepSessionAlive);
        // the app session can time out if video not playing and there is no activity
        $.video_play_button.show();
        // show the play button on top the video player
    } else {
        if (event.playbackState == Titanium.Media.VIDEO_PLAYBACK_STATE_PLAYING) {
            //if the playback state is playing
            Alloy.eventDispatcher.trigger('session:renew');
            // keep app session alive. Do not logout because video has started playing
            keepSessionAlive = setInterval(function() {// keep app session alive while video is playing
                Alloy.eventDispatcher.trigger('session:renew');
            }, 10000);
            $.video_play_button.hide();
            // hide play button
        }
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * stopVideo - stop the video player
 *
 * @api public
 */
function stopVideo() {
    logger.info('stopVideo called');
    if (Alloy.CFG.product.enable_video_player && $.pdp_video_player.getVisible()) {
        if ($.pdp_video_player.getFullscreen()) {
            //if the video player is in full screen mode
            $.pdp_video_player.setFullscreen(false);
            //exit full screen mode
        }
        $.pdp_video_player.stop();
        //stop video
    }
}

/**
 * pauseVideo - pause video playback
 *
 * @api private
 */
function pauseVideo() {
    logger.info('pauseVideo called');
    if ($.pdp_video_player.getPlaybackState() === Ti.Media.VIDEO_PLAYBACK_STATE_PAUSED || $.pdp_video_player.getPlaybackState() === Ti.Media.VIDEO_PLAYBACK_STATE_PLAYING) {
        if ($.pdp_video_player.getFullscreen()) {
            //if the video player is in full screen mode
            $.pdp_video_player.setFullscreen(false);
            //exit full screen mode
        }
        $.pdp_video_player.pause();
        //pause video
    }
}

