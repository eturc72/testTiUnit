// ©2017 salesforce.com, inc. All rights reserved.
/**
 * lib/geaolocation.js - Functions for fetching current coordinates of device
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('geolocation', 'app/lib/geolocation');

//---------------------------------------------------
// ## PUBLIC API
exports.getCurrentLocation = getCurrentLocation;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getCurrentLocation - used GPS to fetch device current coordinates
 * @param {Object} callback
 *
 * @api public
 */
function getCurrentLocation(callback) {
    if (Ti.Geolocation.locationServicesEnabled) {
        Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;
        Ti.Geolocation.distanceFilter = 10;
        Ti.Geolocation.preferredProvider = Ti.Geolocation.PROVIDER_GPS;

        Ti.Geolocation.getCurrentPosition(function(event) {
            if (event.error) {
                //It will throw error if permissions are not given
                logger.error('Error: ' + event.error);
            } else {
                callback(event.coords);
            }
        });
    } else {
        logger.error('Geo Location Is NOT Active');
    }
};

