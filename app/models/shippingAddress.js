// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/shippingAddress.js - model definition for shipping address
 *
 * @api public
 */

var Address = require('dw/instore/Address');

exports.definition = {
    // **config**
    config : {
        model_name : 'shippingAddress',
        adapter : {
            type : 'ocapi'
        },
        superClass : Address,
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getEmail - get email for shipping address
             * @return {String} email
             */
            getEmail : function() {
                return this.get('email');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });

        return Collection;
    },
};
