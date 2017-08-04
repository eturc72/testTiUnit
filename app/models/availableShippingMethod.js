// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/availableShippingMethod.js - model definiton of available shipping method
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'availableShippingMethod',
        adapter : {
            type : 'ocapi'
        }
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getBasePrice - gets the base price of a shipping method
             * @return {Integer}
             */
            getBasePrice : function() {
                return this.get('shipping_method_base_price');
            },

            /**
             * getSurcharge - gets the surcharge
             * @return {Integer}
             */
            getSurcharge : function() {
                return this.get('shipping_method_surcharge');
            },

            /**
             * getDescription - gets the description of the shipping method
             * @return {String}
             */
            getDescription : function() {
                return this.get('shipping_method_description');
            },

            /**
             * getName - gets the name of the shipping method
             * @return {String}
             */
            getName : function() {
                return this.get('shipping_method_name');
            },

            /**
             * getID - gets the id of the shipping method
             * @return {String}
             */
            getID : function() {
                return this.get('shipping_method_id');
            },

            /**
             * getDefaultMethod - gets the default shipping method
             * @return {Object}
             */
            getDefaultMethod : function() {
                return this.get('default_method');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });

        return Collection;
    }
};
