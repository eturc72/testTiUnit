// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/shipment.js - model definition for shipment in basket
 *
 * @api public
 */

/* nested relationships */
var price_adjustment = Backbone.Model.extend({
});

exports.definition = {
    // **config**
    config : {
        model_name : 'shipment',
        adapter : {
            type : 'ocapi'
        }
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            relations : [{
                type : Backbone.One,
                key : 'shipping_address',
                relatedModel : require('alloy/models/' + ucfirst('shippingAddress')).Model
            }, {
                type : Backbone.One,
                key : 'shipping_method',
                relatedModel : require('alloy/models/' + ucfirst('shippingMethod')).Model
            }]
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });

        return Collection;
    }
};
