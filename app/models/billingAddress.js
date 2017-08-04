// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/billingAddress.js - model definition of billing address
 *
 * @api public
 */

var Address = require('dw/instore/Address');

exports.definition = {
    // **config**
    config : {
        model_name : 'billingAddress',
        adapter : {
            type : 'ocapi'
        },
        superClass : Address,
    },

    //**extendModel**
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
