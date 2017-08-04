// ©2017 salesforce.com, inc. All rights reserved.
/**
 * lib/googlePlaceDetails.js - Functions for fetching details of particular address
 */

//---------------------------------------------------
// ## VARIABLES
var eaUtils = require('EAUtils');

//---------------------------------------------------
// ## PUBLIC API
module.exports = function(args) {
    return new api(args);
};

//---------------------------------------------------
// ## FUNCTIONS

function api(googleAddressDetails) {
    var xhr = null;
    var self = this;
    var logger = require('logging')('googlePlaceDetails', 'app/lib/googlePlaceDetails');
    /**
     * serviceCall - Function to make API call
     * @param {String} url - google places api url created in getPlaceDetails
     *
     * @api private
     */
    function serviceCall(url, callback) {
        if (xhr == null) {
            xhr = Ti.Network.createHTTPClient();
        }
        logger.log('request', 'google place details GET ' + url);
        xhr.open('GET', url);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
        xhr.onerror = function(eResp) {
            logger.error('API ERROR ' + eResp.error);
            if (callback.fail) {
                callback.fail(eResp);
            }
        };
        xhr.onload = function() {
            logger.log('request-response', 'API response: ' + this.responseText);
            if (callback.success) {
                var jsonResponse = JSON.parse(this.responseText);
                googleAddressDetails.set(jsonResponse.result);
                callback.success(jsonResponse);
            }
        };
        xhr.send();
    };

    /**
     * getPlaceDetails - get details of address picked from suggestions
     * @param {Object} opts -
     * {
     * 	reference : 'ClREAAAAPnDnLpS74g6b', //unique reference id of location
     *  sensor : "true/false"
     * }
     *
     * @api public
     */
    this.getPlaceDetails = function(opts) {
        var options = {
            reference : opts.reference || '',
            sensor : opts.sensor || false,
            key : Alloy.CFG.google_places_key
        };
        var success = opts.success ||
        function() {
        };
        var fail = opts.fail ||
        function() {
        };
        var url = eaUtils.buildRequestUrl('https://maps.googleapis.com/maps/api/place/details/json', options);
        serviceCall(url, {
            success : success,
            fail : fail
        });
    };

};