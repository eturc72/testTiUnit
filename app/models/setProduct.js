// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/setProduct.js - model definition for a set product
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'setProduct',
        secure : false,
        adapter : {
            type : 'ocapi'
        }
    },

    // **extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/product',

            relations : [{
                type : Backbone.One,
                key : 'product',
                relatedModel : require('alloy/models/Product').Model
            }],

        });
        return Model;
    },

    // **extendCollection**
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {

        });
        return Collection;
    }
};
