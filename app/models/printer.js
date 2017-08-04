// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/printer.js - Model definition of printer
 *
 * @api public
 */
exports.definition = {

    config : {
        model_name : 'printer',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getIP - return the ip of the printer
             * @return {String} ip
             */
            getIP : function() {
                return this.get('ip');
            }
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

