// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/webDevice.js - Functions for web device - Pay Through Web
 */

(function() {

    //---------------------------------------------------
    // ## VARIABLES

    exports.needsSignature = false;

    /**
     * verifyDeviceConnection - verify the device connection
     *
     * @return {Boolean} connected
     * @api public
     */
    exports.verifyDeviceConnection = function() {
        return true;
    };

    /**
     * supports - determines if device supports feature
     *
     * @param {Object} feature
     * @return {Boolean} if feature is supported
     * @api public
     */
    exports.supports = function(feature) {
        return false;
    };
})();
