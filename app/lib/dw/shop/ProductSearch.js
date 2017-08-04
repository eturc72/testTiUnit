// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/ProductSearch.js - Functions for ProductSearch model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * ProductSearch - Model for shopapi product search
 *
 * @api public
 */
var ProductSearch = AssociatedModel.extend(
/* instance methods */
{
    /**
     * initialize - for initialization of model
     *
     * @param {Object} options
     */
    initialize : function(options) {
        // Just resets the 'next' pages
        options = options || {};
        this.batches = [];
        this.force = !!options.force;
    },

    /**
     * fetch - retrieve product search
     *
     * @param {Object} options
     * @return {Deferred} promise
     */
    fetch : function(options) {
        this.initialize(options);
        return AssociatedModel.prototype.fetch.apply(this, arguments);
    },

    /**
     * queryParams - query params for url
     *
     * @return {Object} params
     */
    queryParams : function() {
        var params = {
            q : this.getQuery() || '',
            start : this.getStart() || '0',
            count : Alloy.CFG.product_search.search_products_returned
        };

        if (params.start != 0 && !_.isEmpty(Alloy.CFG.product_search.hits_select_params)) {
            params['select'] = Alloy.CFG.product_search.hits_select_params;
        }

        params.expand = this.expand || Alloy.CFG.product_search.default_expand || 'images,prices,variations';

        var selectedRefinements = this.getSelectedRefinements() || {
            cgid : Alloy.CFG.root_category_id
        };
        var count = 0,
            x;
        for (x in selectedRefinements ) {
            count++;
            params['refine_' + count] = '' + x + '=' + selectedRefinements[x];
        }

        var selectedSortingOption = this.getSelectedSortingOption();
        if (selectedSortingOption) {
            params['sort'] = selectedSortingOption.get('id');
        }

        if (this.isEmptySearch()) {
            // we don't need a lot of extra data for the home view, just the cgid refinements, total count and the minimum for the hits
            if (!_.isEmpty(Alloy.CFG.product_search.hits_select_params)) {
                params['select'] = Alloy.CFG.product_search.cgid_select_params;
            }
            // We don't need to expand anything on the hits, because we aren't using the hits for the home screen/empty search
            params.expand = '';
            // For an empty search (home screen) we don't actually need any hits and don't need to get back the products that are in the root
            // 1 is the minimun count we can provide
            // We use the cgid refinements for the home page
            params.count = 1;
        }

        return params;
    },
    urlRoot : '/product_search',

    /**
     * getCategoryID - get the category id
     *
     * @return {Object} category id
     */
    getCategoryID : function() {
        return this.getSelectedRefinements().cgid;
    },

    /**
     * getCategoryPath - obtains category path
     *
     * @param {Object} category path
     * @return {Array} path
     */
    getCategoryPath : function(returnLeaves) {
        var leaves = false;
        if (returnLeaves) {
            leaves = true;
        }
        var path = [];
        var currentCatID = this.getSelectedRefinements().cgid;
        var categoryRefinement = this.getRefinement('cgid');
        if (!categoryRefinement) {
            // empty search will return nothing here
            return [];
        }
        var values = categoryRefinement.getValues();
        var cats = _.filter(values, function(n) {
            var value = n.getValue();
            var hasChildren = n.hasValues();
            return (value == currentCatID) || hasChildren;
        });
        var cat = _.first(cats);
        var subcats = null;
        while (!_.isEmpty(cat)) {
            path.push(cat);

            if (cat.get('value') == currentCatID) {
                break;
            }

            subcats = cat.get('values');
            cat = _.first(subcats.filter(function(n) {
                return n.hasValues() || (leaves && n.get('value') == currentCatID);
            }));
        }

        return path;
    },

    /**
     * batchSearch - setup batch search
     *
     * @param {Object} batch
     * @return {Object} batch search
     */
    batchSearch : function(batch) {
        // Technically speaking, the first batch is the 'global singleton' model itself
        if (batch == 0) {
            return this;
        }

        var total = this.getTotal();
        var batchStart = batch * Alloy.CFG.product_search.search_products_returned;

        // If you ask for something past the end ... no
        if (batchStart >= total) {
            return null;
        }

        // Create a cacheable reference so that we return the same one next time
        var _batchSearch = this.batches[batch] || this.simpleClone();
        this.batches[batch] = _batchSearch;

        // The only difference between the batchSearch and the 'global singleton' one is the 'start' param and removing extra data on refinements/sort
        _batchSearch.setStart(batchStart, {
            silent : true
        });

        return _batchSearch;
    },

    /**
     * simpleClone - clone model
     *
     * @return {Object} clone
     */
    simpleClone : function() {
        // Doing a 'real' clone is WAAAY to expensive with the backbone nested objects thing going on
        //  but this is the necessary info to produce an exact match when fetched from the server.
        var clone = new ProductSearch();
        clone.set({
            selected_refinements : this.getSelectedRefinements(),
            selected_sorting_option : this.getSelectedSortingOption(),
            query : this.getQuery()
        }, {
            silent : true
        });

        return clone;
    },

    /**
     * emptySearch - perform empty search
     *
     * @return {Deferred} promise
     */
    emptySearch : function() {
        this.set({
            query : '',
            selected_refinements : {
                cgid : Alloy.CFG.root_category_id
            }
        }, {
            silent : true
        });
        return this.fetch();
    },

    /**
     * isEmptySearch - test if empty search
     *
     * @return {Boolean} is empty
     */
    isEmptySearch : function() {
        var isEmpty = false;
        var query = this.getQuery();
        var refinements = this.getSelectedRefinements();
        if (query == '' && refinements && _.keys(refinements).length == 1 && refinements['cgid'] == Alloy.CFG.root_category_id) {
            isEmpty = true;
        }
        return isEmpty;
    },

    /**
     * getSubcategoriesContext - get subcategories context
     *
     * @return {Object} subcategories context
     */
    getSubcategoriesContext : function() {
        var lowestSubcategories = null,
            lowestParent = null;
        var currentCatID = this.getSelectedRefinements().cgid;
        var refinements = this.getRefinementsCollection(),
            categoryRefinement;
        if (refinements && this.getRefinement('cgid')) {
            categoryRefinement = this.getRefinement('cgid');
            // This filters to top-level department
            var cat = _.first(_.filter(categoryRefinement.getValues(), function(n) {
                return n.getValue() == currentCatID || n.hasValues();
            }));
            // This traverses down to the currentCategory
            var subcats = null,
                last_cat;
            while (!_.isEmpty(cat)) {
                subcats = cat.getValues();
                // When we traverse down to the currentCategory
                if (cat.getValue() == currentCatID) {
                    // Category is a leaf category?
                    if (subcats.length < 1 && last_cat) {
                        lowestParent = last_cat;
                        lowestSubcategories = last_cat.getValues();
                    } else {
                        // Category has children
                        lowestParent = cat;
                        lowestSubcategories = subcats;
                    }
                    break;
                }
                last_cat = cat;

                cat = _.first(_.filter(subcats, function(n) {
                    return n.getValue() == currentCatID || n.hasValues();
                }));
            }
        }

        return {
            subcategories : lowestSubcategories || (categoryRefinement && categoryRefinement.getValues()),
            parent : lowestParent
        };
    },

    /**
     * isRefinedBy - is refined by
     *
     * @param {String} attribute_id
     * @param {String} value_id
     * @return {Boolean} is refined
     */
    isRefinedBy : function(attribute_id, value_id) {
        var isRefinedBy = false;

        var selectedRefinements = this.getSelectedRefinements();
        var existingRefinements = selectedRefinements[attribute_id];
        if (existingRefinements) {
            var values = existingRefinements.split('|');
            if (values.indexOf(value_id) > -1) {
                isRefinedBy = true;
            }
        }
        return isRefinedBy;
    },

    /**
     * getRefinement - get refinement
     *
     * @param {String} attribute_id
     * @return {Object} refinement
     */
    getRefinement : function(attribute_id) {
        var refinements = this.getRefinementsCollection();
        var refinement = refinements.filter(function(refinement) {
            return refinement.get('attribute_id') == attribute_id;
        });
        return refinement && refinement[0] ? refinement[0] : null;
    },

    /**
     * getRefinementValue - get refinement value
     *
     * @param {String} attribute_id
     * @param {String} value_id
     * @return {Object} refinement value
     */
    getRefinementValue : function(attribute_id, value_id) {
        var refinement = this.getRefinement(attribute_id);
        if (!refinement) {
            return null;
        }
        var values = refinement.get('values');
        if (!values) {
            return null;
        }
        var value = values.filter(function(value) {
            return value.get('value') == value_id;
        });
        return value && value[0] ? value[0] : null;
    },

    /**
     * toggleRefinementValue - toggle refinement value
     *
     * @param {String} attribute_id
     * @param {String} value_id
     * @param {Object} options
     */
    toggleRefinementValue : function(attribute_id, value_id, options) {
        var selectedRefinements = this.getSelectedRefinements();
        var existingRefinements = selectedRefinements[attribute_id];
        if (existingRefinements) {
            if (attribute_id == 'price') {
                if (existingRefinements == value_id) {
                    delete selectedRefinements[attribute_id];
                } else {
                    selectedRefinements[attribute_id] = value_id;
                }
            } else {
                existingRefinements = existingRefinements.split('|');
                var existingIndex = existingRefinements.indexOf(value_id);
                if (existingIndex > -1) {
                    // Remove it
                    existingRefinements.splice(existingIndex, 1);
                } else {
                    // Add it
                    existingRefinements.push(value_id);
                }
                existingRefinements = existingRefinements.join('|');
                selectedRefinements[attribute_id] = existingRefinements;
            }
        } else {
            // First refinement value ... just add it
            selectedRefinements[attribute_id] = value_id;
        }

        this.setSelectedRefinements(selectedRefinements, options);
    },

    /**
     * clearRefinementValue - clears refinement value
     *
     * @param {String} attribute_id
     * @param {Object} options
     */
    clearRefinementValue : function(attribute_id, options) {
        var selectedRefinements = this.getSelectedRefinements();
        if (attribute_id == 'cgid') {
            selectedRefinements = _.extend(selectedRefinements, this.defaultRefinements());
        } else if (selectedRefinements[attribute_id]) {
            delete selectedRefinements[attribute_id];
        }
        this.setSelectedRefinements(selectedRefinements, options);
    },

    /**
     * clearAllRefinementValues - clear all refinement values
     *
     * @parma {Object} options
     */
    clearAllRefinementValues : function(options) {
        var cgid = this._get('selected_refinements').cgid;
        var clearedRefinements = _.extend(this.defaultRefinements(), {
            cgid : cgid
        });
        this.set({
            selected_refinements : clearedRefinements
        }, options);
    },

    /**
     * defaultRefinements - get default refinements
     *
     * @return {Object}
     */
    defaultRefinements : function() {
        return {
            cgid : Alloy.CFG.root_category_id
        };
    },

    /**
     * getSelectedSortingOption - get selected sorting option
     * We override this API method to return the option object instead of the option object id
     *
     * @return {Object} selected sorting option
     */
    getSelectedSortingOption : function() {
        /* horrible recursion would result unless we use _get, which does a 'raw' get() */
        var selectedOptionID = this._get('selected_sorting_option');
        var sortingOptions = this.getSortingOptionsCollection();
        var selectedOptions = sortingOptions.filter(function(opt) {
            return opt.get('id') == selectedOptionID;
        });
        return _.first(selectedOptions);
    },

    /**
     * isSelectedSortingOption - if selelcted sorting option
     *
     * @param {String} option_id
     * @return {Boolean} selected
     */
    isSelectedSortingOption : function(option_id) {
        var selectedOptionID = this.getSelectedSortingOption();
        return option_id && option_id == selectedOptionID;
    }
},
/* class methods */
{

});

var mixinApiMethods = require('ocapi_methods');

/* init API schema from metadata dump */
mixinApiMethods(ProductSearch, require('dw/shop/metadata/product_search_result'));

module.exports = ProductSearch;
