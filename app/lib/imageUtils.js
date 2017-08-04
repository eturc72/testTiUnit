// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/imageUtils.js - Functions for handling Image URLs
 */

var logger = require('logging')('images:imageUtils', 'app/lib/imageUtils');

(function() {
    /**
     * getImageViewImage - sets the 'image' element of an imageView component with the encoded version of the image URL
     *
     * @param {Object} imageView
     * @param {Object} url
     * @api public
     */
    Alloy.Globals.getImageViewImage = function(imageView, url) {
        if (!url) {
            logger.error('Trying to lookup non-existent image.');
            url = '';
        }
        if (!Alloy.CFG.is_live) {
            url = url.replace('https', 'http');
        }

        imageView.image = encodeURI(url);
    };

    /**
     * getImageForObjectProperty - sets the (generic) property of a (generic) object to the encoded version of the image URL
     *
     * @param {Object} object
     * @param {Object} url
     * @param {Object} property
     */
    Alloy.Globals.getImageForObjectProperty = function(object, url, property) {
        if (!url) {
            return;
        }
        object[property] = encodeURI(url);
        return;
    };
})();
