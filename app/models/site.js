// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/site.js - model definition for site
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'site',
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

            urlRoot : '/site'
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
