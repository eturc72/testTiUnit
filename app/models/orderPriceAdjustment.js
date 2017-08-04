// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/orderPriceAdjustment.js - model definition of order price adjustment
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'order_price_adjustment',
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
             * getPrice - get the order price
             * @return {String} price
             */
            getPrice : function() {
                return this.get('price');
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
