// ©2017 salesforce.com, inc. All rights reserved.
/**
 * lib/googlePlaces.js - Functions for fetching suggested addresses from google places.
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

function api(autocompleteAddressListCollection) {
    var xhr = null;
    var self = this;
    var logger = require('logging')('googlePlaces', 'app/lib/googlePlaces');
    // Google API allows only 5 countries upon which addresses can be filtered.
    var maxCountForGoogleCountryFilter = 5;

    /**
     * serviceCall - function make API call
     * @param {String} url - google places api url constructed in autoComplete
     *
     * @api private
     */
    function serviceCall(url, callback) {
        var deferred = new _.Deferred();
        if (xhr == null) {
            xhr = Ti.Network.createHTTPClient();
        }
        xhr.open('GET', url);
        logger.log('request', 'google place autocomplete GET ' + url);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
        xhr.onerror = function(eResp) {
            logger.error('Api Error' + eResp.error);
            if (callback.fail) {
                callback.fail(eResp);
            }
            deferred.reject();
        };
        xhr.onload = function() {
            logger.log('request-response', 'API response: ' + this.responseText);
            if (callback.success) {
                if (this.responseText != undefined) {
                    var jsonResponse = JSON.parse(this.responseText);
                    autocompleteAddressListCollection.reset(jsonResponse.predictions);
                    callback.success(jsonResponse);
                }

            }
            deferred.resolve();
        };
        xhr.send();
        return deferred.promise();
    };

    /**
     * autoComplete - fetches the list of suggested address from Google Places API
     * @param {Object} opts -
     * {
     * 	input : 'Bos', //search term
     *  type : 'geocode', //[establishment, geocode],
     *  language : 'en', //[en, fr]
     * }
     * @param {Object} globalCountries - list of countries for country filter in URL
     *
     * @api public
     */
    this.autoComplete = function(opts, globalCountries) {
        var deferred = new _.Deferred();
        var options = {
            input : opts.input || '',
            type : opts.type || 'address',
            language : opts.language || 'en',
            location : appendLocationCoordinatesToUrl(),
            radius : Alloy.CFG.google_address_suggestion_radius,
            components : appendCountryCodesToUrl(globalCountries),
            key : Alloy.CFG.google_places_key
        };

        var success = opts.success ||
        function() {
        };
        var fail = opts.fail ||
        function() {
        };

        var url = eaUtils.buildRequestUrl('https://maps.googleapis.com/maps/api/place/autocomplete/json', options);

        serviceCall(url, {
            success : success,
            fail : fail
        }).done(function() {
            deferred.resolve();
        }).fail(function() {
            deferred.reject();
        });
        return deferred.promise();
    };

    /**
     * appendCountryCodesToUrl - appends country codes for filter in URL for fetching address suggestions
     *
     * @param {Object} - countryList
     * @return {String} - string with country fillter to be appended in URL
     *
     * @api private
     */
    function appendCountryCodesToUrl(countryList) {
        var count = 0;
        var countryCodesUrl = '';
        _.each(countryList, function(child) {
            count++;
            if (count > maxCountForGoogleCountryFilter) {
                return;
            } else if (count < maxCountForGoogleCountryFilter && count != countryList.length) {
                countryCodesUrl = countryCodesUrl + 'country:' + child.countryCode + '|';
            } else {
                countryCodesUrl = countryCodesUrl + 'country:' + child.countryCode;
            }
        });
        return countryCodesUrl;
    };

    /**
     * appendLocationCoordinatesToUrl - appends latitude and longitude as filter to URL for fetching address suggestions
     *
     * @return {String} - String with location coordinates of store to be appended in URL
     *
     * @api private
     */
    function appendLocationCoordinatesToUrl() {
        if (Alloy.Models.storeInfo.getLatitude() && Alloy.Models.storeInfo.getLongitude()) {
            return (Alloy.Models.storeInfo.getLatitude() + ',' + Alloy.Models.storeInfo.getLongitude());
        } else if (Alloy.CFG.latitudeOnStartup && Alloy.CFG.longitudeOnStartup) {
            return (Alloy.CFG.latitudeOnStartup + ',' + Alloy.CFG.longitudeOnStartup);
        } else {
            return 'undefined';
        }
    };

};
