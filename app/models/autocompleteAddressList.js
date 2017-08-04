// ©2017 salesforce.com, inc. All rights reserved.
/**
 * models/autocompleteAddressList.js - model definition for list of suggested addresses
 *
 * @api public
 */
exports.definition = {
    config : {

        adapter : {
            type : 'properties',
            collection_name : 'autocompleteAddressList'
        }
    },
    // **extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            
            //----------------------------------------
            // ## FUNCTIONS
            
            /**
             * getDescription - returns the description of suggested address
             * @return {String}
             */
            getDescription : function() {
                return this.get('description');
            },
            /**
             * getReference - returns the unique refference id of suggested address
             * @return {String}
             */
            getReference : function() {
                return this.get('reference');
            }
        });

        return Model;
    }
}; 