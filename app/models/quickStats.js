// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * models/quickStats.js - model definition for quick stats for reports
 *
 * @api public
 */

exports.definition = {
    config : {
        model_name : 'quickStats',
        adapter : {
            type : 'properties',
            collection_name : 'quickStats'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {

        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {

        });

        return Collection;
    }
};
