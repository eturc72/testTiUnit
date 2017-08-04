// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/category.js - Model definitions for category
 *
 * @api public
 */

var ShopAPI = require('dw/shop/index');

var CategoryModel = ShopAPI.Category;

exports.definition = {
    // **config**
    config : {
        model_name : 'category',
        adapter : {
            type : 'ocapi',
            collection_name : 'category'
        },
        superClass : CategoryModel,
        cache : true
    },

    // **extendModel**
    extendModel : function(Model) {
        // Including the Model at start AND end ensures that sync is overridden AND ends up with all methods of CategoryModel
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getParentCategoryId - get the category id
             * @return {String} category id
             */
            getParentCategoryId : function() {
                return this._get('parent_category_id');
            },

            /**
             * fetchCategory - fetch category
             * @return {Deferred} promise
             */
            fetchCategory : function() {
                return this.fetch();
            }
        });
        return Model;
    },

    // **extendCollection**
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * url - obtain the url for this collection
             * @return {String} url
             */
            url : function() {
                // Loop through Models and gather IDs
                var ids = this.ids || this.get('ids') || _.pluck(this.models, 'id') || [];

                return '/categories/(' + ids.join(',') + ')';
            },

            /**
             * fetchCategories - fetch the categories
             * @return {Deferred} promise
             */
            fetchCategories : function() {
                return this.fetch();
            },

            /**
             * queryParams - query params for the url
             * @return {Object} params
             */
            queryParams : function() {
                return {
                    levels : 2
                };
            }
        });
        return Collection;
    }
};

var mixinImageServiceMethods = require('imageServiceMethods');
mixinImageServiceMethods(CategoryModel);
