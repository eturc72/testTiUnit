// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/productItem.js - model definition for product line item
 *
 * @api public
 */

/* nested relationships */
var option_item = Backbone.Model.extend({

    /**
     * getItemText - returns the text of the line item
     * @return {String}
     */
    getItemText : function() {
        return this.get('item_text');
    },

    /**
     * getPrice - returns the price of the product
     * @return {String}
     */
    getPrice : function() {
        return this.get('price');
    }
});
var price_adjustment = Backbone.Model.extend({

    /**
     * getItemText - returns the text of the line item
     * @return {String}
     */
    getItemText : function() {
        return this.get('item_text');
    }
});

var bundled_product_item = Backbone.Model.extend({
});

exports.definition = {
    // **config**
    config : {
        model_name : 'product_item',
        adapter : {
            type : 'ocapi'
        }
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            relations : [{
                type : Backbone.Many,
                key : 'bundled_product_items',
                relatedModel : bundled_product_item
            }, {
                type : Backbone.Many,
                key : 'option_items',
                relatedModel : option_item
            }, {
                type : Backbone.Many,
                key : 'price_adjustments',
                relatedModel : price_adjustment
            }],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getItemId - returns the id of the line item
             * @return {String}
             */
            getItemId : function() {
                return this.get('item_id');
            },

            /**
             * getCurrencyCode - returns the currency code of the line item
             * @return {String}
             */
            getCurrencyCode : function() {
                return this.get('currency');
            },

            /**
             * getProductId - returns the id of the product
             * @return {String}
             */
            getProductId : function() {
                return this.get('product_id');
            },

            /**
             * getItemText - returns the text of the line item
             * @return {String}
             */
            getItemText : function() {
                return this.get('item_text');
            },

            /**
             * getProductName - returns the name of the product
             * @return {String}
             */
            getProductName : function() {
                return this.get('product_name');
            },

            /**
             * getQuantity - returns the quantity of the product
             * @return {String}
             */
            getQuantity : function() {
                return this.get('quantity');
            },

            /**
             * getOptionItems - returns the option items for the product
             * @return {Object}
             */
            getOptionItems : function() {
                return this.has('option_items') ? this.get('option_items').models : [];
            },

            /**
             * getOptionItemsCollection - returns the option item collections for the product
             * @return {Object}
             */
            getOptionItemsCollection : function() {
                return this.get('option_items') || new Backbone.Collection();
            },

            /**
             * setPriceOverride - set the product price override
             * @param {Object} override
             * @param {Object} options
             */
            setPriceOverride : function(override, options) {
                this.set('price_override', override, options);
            },

            /**
             * setPriceOverrideType - set the product price override type
             * @param {String} overrideType
             * @param {Object} options
             */
            setPriceOverrideType : function(overrideType, options) {
                this.set('price_override_type', overrideType, options);
            },

            /**
             * setMessage - set the message of the product
             * @param {String} message
             * @param {Object} options
             */
            setMessage : function(message, options) {
                this.set('message', message, options);
            },

            /**
             * getBasePrice - returns the base price of the product
             * @return {String}
             */
            getBasePrice : function() {
                return this.get('base_price');
            },

            /**
             * getPrice - returns the price of the product
             * @return {String}
             */
            getPrice : function() {
                return this.get('price');
            },

            /**
             * getBasePriceOverride - returns the base price override
             * @return {String}
             */
            getBasePriceOverride : function() {
                return this.get('base_price_override');
            },

            /**
             * getPriceOverride - returns the price override
             * @return {String}
             */
            getPriceOverride : function() {
                return this.get('price_override');
            },

            /**
             * getManagerEmployeeId - returns the manager id used for the override
             * @return {String}
             */
            getManagerEmployeeId : function() {
                return this.get('manager_employee_id');
            },

            /**
             * getPriceOverrideType - returns the price override type
             * @return {String}
             */
            getPriceOverrideType : function() {
                return this.get('price_override_type');
            },

            /**
             * getPriceOverrideReasonCode - returns the price override reason code
             * @return {String}
             */
            getPriceOverrideReasonCode : function() {
                return this.get('price_override_reason_code');
            },

            /**
             * getPriceOverrideValue - returns the price override value
             * @return {String}
             */
            getPriceOverrideValue : function() {
                return this.get('price_override_value');
            },

            /**
             * getMessage - returns the message of the product
             * @return {String}
             */
            getMessage : function() {
                return this.get('message');
            },

            /**
             * hasMessage - checks if the product has the message
             * @return {Boolean}
             */
            hasMessage : function() {
                return this.has('message');
            },

            /**
             * getPriceAdjustments - returns the product price adjustments if any
             * @return {Object}
             */
            getPriceAdjustments : function() {
                return this.has('price_adjustments') ? this.get('price_adjustments').models : [];
            },

            /**
             * getThumbnailUrl - returns the url of the image of the product
             * @return {String}
             */
            getThumbnailUrl : function() {
                return this.get('thumbnailUrl');
            },

            /**
             * getProductIdAndQuantity - returns the id of the product and it quantity
             * @return {String}
             */
            getProductIdAndQuantity : function() {
                return {
                    id : this.getProductId(),
                    quantity : this.getQuantity()
                };
            },

            /**
             * getCurrentStockLevel - returns the current_stock_level of the product. (The current_stock_level property does not come from OCAPI. we add set it in the model when needed.) 
             * @return {Number}
             */
            getCurrentStockLevel : function() {
                return this.get('current_stock_level');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });

        return Collection;
    }
};

var mixinImageServiceMethods = require('imageServiceMethods');
mixinImageServiceMethods(bundled_product_item);

