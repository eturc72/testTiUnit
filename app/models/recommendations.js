// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/recommendations.js - model definition for product recommendations
 *
 * @api public
 */

var RecommendedItem = Backbone.Model.extend({

    /**
     * getId - return recommended item id
     * @return {String}
     */
    getId : function() {
        return this.get('recommended_item_id');
    },

    /**
     * getType - return item type
     * @return {String}
     */
    getType : function() {
        return this.get('_type');
    },

    /**
     * getRecommendationType - return recommendation type
     * @return {String}
     */
    getRecommendationType : function() {
        return this.get('recommendation_type')._type;
    },

    /**
     * getDisplayValue - return the display value or name of the recommendation
     * @return {String}
     */
    getDisplayValue : function() {
        return this.get('recommendation_type').display_value;
    },

    /**
     * getValue - return the value of the recommendation
     * @return {Number}
     */
    getValue : function() {
        return this.get('recommendation_type').value;
    },

    /**
     * getValue - return link to recommended product
     * @return {String}
     */
    getLink : function() {
        return this.get('recommended_item_link');
    }
});

var RecommendedItems = Backbone.Collection.extend({
    model : RecommendedItem,

    /**
     * getAllProductIds - return all the ids of the recommended items
     * @return {Array}
     */
    getAllProductIds : function() {
        return this.pluck('recommended_item_id');
    }
});

exports.definition = {
    config : {
        model_name : 'recommendations',
        adapter : {
            type : 'ocapi',
            collection_name : 'recommendations'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            relations : [{
                type : Backbone.Many,
                key : 'recommendations',
                collectionType : RecommendedItems,
                relatedModel : RecommendedItem //Optional
            }],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * initialize - attach product collection to model
             */
            initialize : function() {
                this.products = Alloy.createCollection('product');
            },

            /**
             * getRecommendations - fetch recommendations
             * @param {String} productId - product Id
             * @return {Deferred} promise
             */
            getRecommendations : function(productId) {
                var self = this;
                var deferred = new _.Deferred();
                self.clear();
                self.products.reset();
                self.id = productId;
                self.fetch().done(function() {
                    if (self.get('recommendations') && self.get('recommendations').length > 0) {
                        self.products.ids = self.get('recommendations').getAllProductIds();
                        //this fetch is done because the ocapi recommendations API only returns product ids. So a new fetch is required to get the products details
                        self.products.fetch().done(function() {
                            self.products.each(function(cProduct) {
                                cProduct.set({
                                    recommended_item_id : cProduct.get('product_id') || cProduct.getId()
                                });
                            });
                            deferred.resolve();
                        }).fail(function() {
                            deferred.reject();
                        });
                    } else {
                        deferred.resolve();
                    }
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * getRecommendedItems - return recommended product collection
             * @return {Object}
             */
            getRecommendedItems : function() {
                return this.products;
            },

            /**
             * getCount - return total number of recommendations
             * @return {Number}
             */
            getCount : function() {
                return this.get('recommendations').length;
            },

            /**
             * url - returns base url
             * @return {String}
             */
            url : function() {
                return '/products/' + this.id + '/recommendations';
            },

            /**
             * queryParams - returns the params required for the request
             * @return {Object}
             */
            queryParams : function() {
                return {};
            }
        });

        return Model;
    }
};
