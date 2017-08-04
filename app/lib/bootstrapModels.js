// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/bootstrapModels.js - Functions for loading categories for mega menu
 */

//---------------------------------------------------
// ## VARIABLES

var deferred = _.Deferred();

var rootCategory = Alloy.createModel('category', {
    id : 'root'
});

var hash = Alloy.Globals.categoryHash = {};

rootCategory.fetchCategory().done(function() {
    rootCategory.getAllLevels().done(function() {
        // Loop through all categories and build the hash lookup
        hash['root'] = rootCategory;
        var ids = [];
        rootCategory.getCategoriesCollection().each(function(cat) {
            // Departments: Mens
            hash[cat.id] = cat;
            ids = ids.concat(_.pluck(cat.getCategories(), 'id'));
        });
        // can only get 2 levels at once so need to make another request for sub groups
        var collection = Alloy.createCollection('category');
        collection.ids = ids;
        collection.fetchCategories().done(function() {
            var cats = {};
            _.each(collection.models, function(subcat) {
                var parentId = subcat.getParentCategoryId();
                var categories = cats[parentId] || Alloy.createCollection('category');
                categories.add(subcat);
                cats[parentId] = categories;

                // Sub department: Mens > Clothing
                hash[subcat.id] = subcat;
                subcat.getCategoriesCollection().each(function(subsubcat) {
                    // Sub sub department: Mens > Clothing > Suits
                    hash[subsubcat.id] = subsubcat;
                    subsubcat.getCategoriesCollection().each(function(leafcat) {
                        // LeafCat
                        hash[leafcat.id] = leafcat;
                    });
                });
            });
            for (var c in cats) {
                hash[c].setCategories(cats[c].toJSON(), {
                    silent : true
                });

            }
        });
        deferred.resolve();
    }).fail(function(model) {
        deferred.reject(model);
    });
}).fail(function(model) {
    deferred.reject(model);
});

Alloy.Globals.categoryTree = rootCategory;

module.exports = deferred.promise();
