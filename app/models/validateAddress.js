// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/validateAddress.js - This is only needed if using the storefront pipeline for address validation.  For exisiting billing,
 * shipping and customer address verification the OCAPI hooks are used for validation so that we don't
 * need to make another server request.
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'validateAddress',
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

            urlRoot : '/EACheckout-AddressValidation'
        });

        return Model;
    }
};
