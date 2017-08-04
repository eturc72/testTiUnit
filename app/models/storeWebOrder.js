// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/storeWebOrder.js - model definition for storing web order
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'storeWebOrder',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront'
        }
    },

    // **extendModel**
    extendModel : function(Model) {

        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/EACheckout-StoreWebOrder'
        });

        return Model;
    }
};
