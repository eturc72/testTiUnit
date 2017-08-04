// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/history.js - model definition of history
 *
 * @api public
 */
exports.definition = {
    config : {
        model_name : 'history',
        columns : {
            type : 'TEXT',
            time : 'INTEGER',
            associate_id : 'TEXT',
            customer_id : 'TEXT',
            route : 'TEXT',
            details : 'TEXT'
        },
        adapter : {
            type : 'sql',
            collection_name : 'history'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            // extended functions and properties go here
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            // extended functions and properties go here
        });

        return Collection;
    }
};

