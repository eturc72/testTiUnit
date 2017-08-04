// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/storeCountriesStates.js - model definition for countries and states
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'storeCountriesStates',
        secure : false,
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

            urlRoot : '/EAStore-GetCountriesStates',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getStoreCountriesStates - fetches the countries and states for the site
             * @param {Object} options
             * @return {Deferred} promise
             */
            getStoreCountriesStates : function(options) {
                return this.fetch(options);
            },
        });

        return Model;
    }
};
