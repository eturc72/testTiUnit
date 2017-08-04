// ©2017 salesforce.com, inc. All rights reserved.
/**
 * models/googleAddressDetails.js - model definition for address details
 *
 * @api public
 */
exports.definition = {
    config : {

        adapter : {
            type : 'properties',
            collection_name : 'addressDetails'
        }
    },
    // **extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getAddressComponents - returns the breakdown of address
             * @return {Object}
             */
            getAddressComponents : function() {
                return this.get('address_components');
            },
            /**
             * getName - returns the name of address
             * @return {String}
             */
            getName : function() {
                return this.get('name');
            },
            /**
             * getPostalCode - extracts the postal code from address componenets array for address picked from suggestion
             *
             * @return {String}
             */
            getPostalCode : function() {
                var postalCode = null;
                _.each(this.get('address_components'), function(child) {
                    if (child.types[0] === 'postal_code') {
                        postalCode = child.long_name;
                    }
                });
                return postalCode;
            },
            /**
             * getStateCode - extracts the state code from address componenets array for address picked from suggestion
             *
             * @return {String}
             */
            getStateCode : function() {
                var stateCode = null;
                _.each(this.get('address_components'), function(child) {
                    if (child.types[0] === 'administrative_area_level_1') {
                        stateCode = child.short_name;
                    }
                });
                return stateCode;
            },
            /**
             * getCountryCode - extracts the country code from address componenets array for address picked from suggestion
             *
             * @return {String}
             */
            getCountryCode : function() {
                var countryCode = null;
                _.each(this.get('address_components'), function(child) {
                    if (child.types[0] === 'country') {
                        countryCode = child.short_name;
                    }
                });
                return countryCode;
            },
            /**
             * getVicinity - returns the vicinity of address
             * @return {String}
             */
            getVicinity : function() {
                return this.get('vicinity');
            }
        });

        return Model;
    }
};
