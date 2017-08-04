// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/shippingMethod.js - model definition for shipping method
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'shippingMethod',
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
             * getName - returns the name of a shipping Method
             * @return {String}
             */
            getName : function() {
                return this.get('name');
            },

            /**
             * hasPriceOverride - check if the shipping Method has price override option
             * @return {Boolean}
             */
            hasPriceOverride : function() {
                return this.has('price_override') && this.get('price_override') == 'true';
            },

            /**
             * getPriceOverrideType - returns the price override type
             * @return {String}
             */
            getPriceOverrideType : function() {
                return this.get('price_override_type');
            },

            /**
             * getPriceOverrideValue - returns the price override value
             * @return {String}
             */
            getPriceOverrideValue : function() {
                return this.get('price_override_value');
            },

            /**
             * getPriceOverrideReasonCode - returns the price override reason code
             * @return {String}
             */
            getPriceOverrideReasonCode : function() {
                return this.get('price_override_reason_code');
            },

            /**
             * getPriceOverrideManagerId - returns the price override manager id
             * @return {String}
             */
            getPriceOverrideManagerId : function() {
                return this.get('manager_employee_id');
            },

            /**
             * getID - returns the id of the shipping Method
             * @return {String}
             */
            getID : function() {
                return this.get('id');
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
