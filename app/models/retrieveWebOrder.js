// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/retrieveWebOrder.js - model definition for retrieve web order
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'retrieveWebOrder',
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

            urlRoot : '/EAOrder-RetrieveWebOrder'
        });
        return Model;
    }
};
