// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/productSearch.js - model definition for product search
 *
 * @api public
 */

var ShopAPI = require('dw/shop/index');

var ProductSearchModel = ShopAPI.ProductSearch;

exports.definition = {
    config : {
        model_name : 'productSearch',
        adapter : {
            type : 'ocapi',
            collection_name : 'productSearch'
        },
        superClass : ProductSearchModel,
        cache : true
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * simpleClone - clone the product search model
             * @return {Object}
             */
            simpleClone : function() {
                var clone = Alloy.createModel('productSearch');
                clone.set({
                    selected_refinements : this.getSelectedRefinements(),
                    selected_sorting_option : this.getSelectedSortingOption() ? this.getSelectedSortingOption().get('id') : null,
                    sorting_options : this.getSortingOptions(),
                    query : this.getQuery()
                }, {
                    silent : true
                });
                return clone;
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
mixinImageServiceMethods(ProductSearchModel);

mixinImageServiceMethods(ProductSearchModel.prototype.modelHash['product_search_hit']);
mixinImageServiceMethods(ProductSearchModel.prototype.modelHash['product_search_hit'].prototype.modelHash["variation_attribute"].prototype.modelHash['variation_attribute_value']);
