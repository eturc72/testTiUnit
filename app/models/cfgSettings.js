// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * models/cfgSettings.js - model definition of configuration settings
 *
 * @api public
 */

/**
 * queryParams - returns the the params required for the request
 * @return {Object}
 */
function queryParams() {
    return {
        store_id : this.get('store_id')
    };
}

var StorefrontHelperSecure = require('dw/instore/StorefrontHelperSecure'); 

var KioskCfgSettings = StorefrontHelperSecure.extend({
    urlRoot: '/EAConfigs-GetKioskCFGSettings',
    queryParams : queryParams
});

exports.definition = {
    // **config**
    config : {
        model_name : 'cfgSettings',
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

            urlRoot : '/EAConfigs-GetCFGSettings',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * queryParams - query params for the url
             * @return {Object} params
             */
            queryParams : queryParams,

            /**
             * loadServerConfigs - loads the server configurations
             * @param {Object} storeId
             * @return {Deferred} promise
             */
            loadServerConfigs : function(storeId) {
                this.set('store_id', storeId);
                var deferred = new _.Deferred();
                this.fetch().done(function() {
                    deferred.resolve();
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },
            /**
             * loadKioskServerConfigs - retrieves the kiosk configuration settings from the server
             *
             * @param {Object} storeId
             */
            loadKioskServerConfigs: function(storeId){
                var deferred = new _.Deferred();
                var kioskCfgSettings = new KioskCfgSettings();
                var self = this;
                kioskCfgSettings.set('store_id', storeId);
                kioskCfgSettings.fetch().done(function(model){
                    self.set(model.toJSON(), {silent: true});
                    deferred.resolve(model);
                }).fail(function(){
                    deferred.reject(model);
                });
                return deferred.promise();
            },

            /**
             * getSettings - returns the configuration settings
             * @return {Object}
             */
            getSettings : function() {
                return this.get('CFG');
            }
        });
        return Model;
    }
};
