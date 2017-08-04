// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/productListItems.js - model definition for product list items
 *
 * @api public
 */

exports.definition = {
    config : {
        model_name : 'productListItem',
        adapter : {
            type : 'ocapi'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getProductId - return product item id
             * @return {String}
             */
            getProductId : function() {
                return this.get('product_id');
            },

            /**
             * getProductName - return product item name
             * @return {String}
             */
            getProductName : function() {
                return this.get('product_name');
            },

            /**
             * getProductTitle - return product item title
             * @return {String}
             */
            getProductTitle : function() {
                return this.get('product_details_link').title;
            },

            /**
             * getItemText - return the item itext
             * @return {String}
             */
            getItemText : function() {
                return this.get('product_details_link').title;
            },

            /**
             * getItemId - return item id
             * @return {String}
             */
            getItemId : function() {
                return this.get('id');
            },

            /**
             * getPurchasedQuantity - return purchased quantity
             * @return {String}
             */
            getPurchasedQuantity : function() {
                return this.get('purchased_quantity');
            },

            /**
             * getQuantity -  get quantity
             * @return {Number}
             */
            getQuantity : function() {
                return this.get('quantity');
            },

            /**
             * getPriority  - return priority
             * @return {Number}
             */
            getPriority : function() {
                return this.get('priority');
            },

            /**
             * geType - return item type
             * @return {String}
             */
            geType : function() {
                return this.get('type');
            },

            /**
             * getLink - return link to item
             * @return {String}
             */
            getLink : function() {
                return this.get('link');
            },

            /**
             * isPublic -  return true if item is public, false otherwise
             * @return {Boolean}
             */
            isPublic : function() {
                return this.get('public');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getCount - return total number getTotalQuantity
             * @return {Number}
             */
            getCount : function() {
                return this.length;
            },

            /**
             * getTotal - return total number of items in the collection
             * @return {Number}
             */
            getTotal : function() {
                return this.length;
            },

            /**
             * getTotalQuantity - return total quantity of items in the colection
             * @return {Number}
             */
            getTotalQuantity : function() {
                var total = 0;
                this.each(function(model) {
                    total += model.getQuantity();
                });
                return total;
            },

            /**
             * getModelObjects -  return all models objects instead of raw objects
             * @return {Array}
             */
            getModelObjects : function() {
                var obj = [];
                this.each(function(model) {
                    obj.push(model);
                });
                return obj;
            },

            /**
             * findItemByProductId -  return one product list item model that has the passed product id
             * @param {String} productId
             * @return {Object}
             */
            findItemByProductId : function(productId) {
                var models = this.filter(function(model) {
                    return productId == model.getProductId();
                });
                if (models.length > 0) {

                    return models[0];
                } else {
                    return null;
                }
            }
        });

        return Collection;
    }
};
