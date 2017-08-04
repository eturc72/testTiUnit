// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/instore/StorefrontHelperSecure.js - Functions for Address model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

/**
 * StorefrontHelperSecure - base model for storefront type models
 *
 * @api public
 */
var StorefrontHelperSecure = Backbone.Model.extend({
    sync : require('alloy/sync/storefront').sync,

    /**
     * config - configuration for the model
     */
    config : {
        secure : true,
        model_name : 'storefrontHelper'
    },

    /**
     * setModelName - set the model name for debugging info on model
     * @param {Object} modelName
     */
    setModelName : function(modelName) {
        this.config.model_name = modelName;
    }
});

module.exports = StorefrontHelperSecure;
