// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/emailProductList.js - model definition of email product list
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'emailProductList',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : 'EAAccount-EmailProductList',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * send - send email
             * @param {Object} args
             * @return {Deferred} promise
             */
            send : function(args) {
                //to avoid post to turn into patch
                this.id = null;
                return this.save(args);
            }
        });

        return Model;
    }
};
