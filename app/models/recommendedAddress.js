// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * models/recommendedAddress.js - model definition for recommended address
 *
 * @api public
 */
exports.definition = {

    config : {
        model_name : 'recommendedAddress',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getAddress1 - returns the address line 1
             * @return {String}
             */
            getAddress1 : function() {
                return this.get('Address1');
            },

            /**
             * getAddress2 - returns the address line 2
             * @return {String}
             */
            getAddress2 : function() {
                return this.get('Address2');
            },

            /**
             * getCityStateZip - returns the city,state and postal code
             * @return {String}
             */
            getCityStateZip : function() {
                return this.get('city') + ', ' + this.get('stateCode') + ' ' + this.get('postalCode');
            },

            /**
             * transform - returns the address object
             * @return {Object}
             */
            transform : function() {
                var toReturn = {
                    address1 : this.getAddress1(),
                    address2 : this.getAddress2() ? this.getAddress2() : '',
                    city_state_zip : this.getCityStateZip()
                };
                return toReturn;
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            // extended functions and properties go here
        });

        return Collection;
    }
};

