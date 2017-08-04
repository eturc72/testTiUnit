// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/megaMenuPage.js - mega menu page controller
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};

$.subCategories.reset($model.getVisibleCategories());

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(Alloy.Models.productSearch, 'change:selected_refinements', function() {
    var selRefs = Alloy.Models.productSearch.getSelectedRefinements();
    var category_id = selRefs.cgid;
    _.each($.menu_category_container.children, function(el) {
        var child = el.children[0].children[0];
        if (child.categoryid == category_id) {
            child.setBackgroundImage(Alloy.Styles.megaMenuCategoryUnderline);
        } else {
            child.setBackgroundImage('');
        }
    });
});
