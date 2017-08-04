// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Category.js - Functions for Category model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Category - Model for shopapi categories
 *
 * @api public
 */
var Category = AssociatedModel.extend(
/* instance methods */
{
    /**
     * initialize - for initialization of model
     */
    initialize : function() {
    },

    /**
     * url - url for model
     * @return {String} url
     */
    url : function() {
        return '/categories/' + this.getId();
    },

    /**
     * queryParams - the params for the request
     * @return {Object} params
     */
    queryParams : function() {
        return {
            levels : 2
        };
    },

    /**
     * parse - parse the response and set model data
     * @param {Object} response - response from request
     * @param {Object} options
     * @return {Object} parsed response
     */
    parse : function(response, options) {
        // if response includes data collection, the category query included multiple ids
        if (response.data && response.data.length) {
            var pcatId = response.data[0].parent_category_id || 'root';
            var cat = {
                id : pcatId,
                name : pcatId,
                categories : response.data
            };

            return cat;
        }

        // standard category query with single id
        return response;

    },

    /**
     * getAllLevels - obtain all category levels
     * @return {Deferred} promise
     */
    getAllLevels : function() {
        var deferred = new _.Deferred();
        var menuCategories = this.getCategories();
        var ocapiMax = 50,
            count = Math.floor(menuCategories.length / ocapiMax);
        for (var i = 0; i < menuCategories.length; i += ocapiMax) {
            var sizedCategories = menuCategories.slice(i, i + ocapiMax);
            this.getMenuCategories(sizedCategories).always(function() {
                if (count == 0) {
                    deferred.resolve();
                }
                count--;
            });
        }
        return deferred.promise();
    },

    /**
     * getMenuCategories - fetch the menu categories
     * @param {Object} menuCategories
     * return {Deferred} promise
     */
    getMenuCategories : function(menuCategories) {
        var deferred = new _.Deferred(),
            m = Alloy.createModel('category'),
            parent = this,
            ids = _.pluck(menuCategories, 'id');
        ids = _.map(ids, function(id) {
            // get rid of the / from the category ids, but leave the comma
            return encodeURIComponent(id);
        });
        m.id = '(' + ids.join(',') + ')';
        m.set('id', m.id);
        return m.fetch().always(function() {
            var parentCategories = parent.getCategories();
            parentCategories.push(m.getCategories());
            parent.setCategories(parentCategories);
            deferred.resolve();
        });
    },

    /**
     * getVisibleCategories - obtain the visible categories
     * @return {Array} categories
     */
    getVisibleCategories : function() {
        var attribute = Alloy.CFG.category.attribute_show_in_endless_aisle;

        return this.getCategories().filter(function(category) {
            return category.get(attribute) === true;
        });
    }
},
/* class methods */
{

});

var mixinApiMethods = require('ocapi_methods');

/* init API schema from metadata dump */
mixinApiMethods(Category, require('dw/shop/metadata/category'));

module.exports = Category;
