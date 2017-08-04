// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/bundleProduct.js - bundled product model
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'bundleProduct',
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

            relations : [{
                type : Backbone.One,
                key : 'product',
                relatedModel : require('alloy/models/Product').Model
            }],

            urlRoot : '/products'

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
