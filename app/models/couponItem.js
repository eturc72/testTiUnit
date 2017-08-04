// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/couponItem.js - model definition of coupon item
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'coupon_item',
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
             * getCode - get he coupon code
             * @return {String} code
             */
            getCode : function() {
                return this.get('code');
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
