// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 * controllers/search/components/categoryRefinementPanel.js - category refinement panel to select a new category from search header
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('search:components:categoryRefinementPanel', getFullControllerPath($.__controllerPath));
var currentSearch = Alloy.Models.productSearch;

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.selectedCategoriesTable.addEventListener('click', onCategoryClick);
$.subcategoriesTable.addEventListener('click', onSubCategoryClick);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentSearch, 'change:selected_refinements', render);
$.listenTo(currentSearch, 'change:refinements', render);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.selectedCategoriesTable.removeEventListener('click', onCategoryClick);
    $.subcategoriesTable.removeEventListener('click', onSubCategoryClick);
    $.stopListening();
    $.destroy();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.trace('rendering refinements ');

    var path = currentSearch.getCategoryPath(false);
    logger.info('Path: ' + JSON.stringify(path));
    var row,
        view,
        label,
        backgroundImage,
        fontColor,
        categoryTitle;
    var cats = [];
    row = Ti.UI.createTableViewRow({
        category_id : Alloy.CFG.root_category_id,
        height : 65,
        layout : 'absolute'
    });
    var isSearching = !(currentSearch.getQuery() == '');

    if (path && path.length > 0) {
        backgroundImage = Alloy.Styles.categoryRootImage;
        fontColor = Alloy.Styles.color.text.dark;
    } else {
        backgroundImage = Alloy.Styles.categoryRootEndImage;
        fontColor = Alloy.Styles.color.text.white;
        categoryTitle = (isSearching) ? _L('Search Results') : _L('All Departments');
    }
    label = Ti.UI.createLabel({
        text : (isSearching) ? _L('Search Results') : _L('All Departments'),
        font : Alloy.Styles.categoryRefinementLabelLarge,
        color : fontColor,
        left : 22
    });
    view = Ti.UI.createView({
        backgroundImage : backgroundImage,
        top : 0,
        left : 0,
        height : '100%',
        width : '100%',
        layout : 'absolute'
    });
    view.add(label);
    row.add(view);
    cats.push(row);
    for (var i = 0,
        ii = path.length; i < ii; i++) {
        row = Ti.UI.createTableViewRow({
            category_id : path[i].getValue(),
            height : 65,
            layout : 'absolute'
        });
        if (i == (ii - 1)) {
            backgroundImage = Alloy.Styles.categoryPathEndImage;
            fontColor = Alloy.Styles.color.text.white;
        } else {
            backgroundImage = Alloy.Styles.categoryPathMiddleImage;
            fontColor = Alloy.Styles.color.text.dark;
        }
        view = Ti.UI.createView({
            backgroundImage : backgroundImage,
            top : 0,
            left : 0,
            height : '100%',
            width : '100%'
        });
        label = Ti.UI.createLabel({
            text : path[i].getLabel(),
            font : Alloy.Styles.categoryRefinementLabelLarge,
            color : fontColor,
            left : 22
        });
        row.add(view);
        row.add(label);
        cats.push(row);
    }
    $.selectedCategoriesTable.setData(cats);

    cats = [];
    var lowest = currentSearch.getSubcategoriesContext();
    var lowestParent = lowest.parent;
    if (lowestParent) {
        $.subcategoriesTableHeaderCalloutLabel.setText(lowestParent.getLabel());
        $.subcategoriesTableHeaderLabel.setText(_L('Subcategories of'));
    } else {
        $.subcategoriesTableHeaderCalloutLabel.setText(categoryTitle);
        $.subcategoriesTableHeaderLabel.setText('');
    }

    var lowestSubcats = lowest.subcategories;

    var selectedCategoryID = currentSearch.getCategoryID();
    var fontColor,
        categoryRefinement,
        categoryID,
        hitCount;

    if (!_.isEmpty(lowestSubcats)) {
        for (var i = 0,
            ii = lowestSubcats.length; i < ii; i++) {
            fontColor = Alloy.Styles.color.text.dark;
            categoryRefinement = lowestSubcats[i];
            categoryID = categoryRefinement.getValue();
            hitCount = categoryRefinement.getHitCount();
            // Sibling categories shouldn't be disabled
            if (isSearching && hitCount == 0) {
                fontColor = Alloy.Styles.color.text.light;
            } else if (selectedCategoryID == categoryID) {
                fontColor = Alloy.Styles.accentColor;
            }

            row = Ti.UI.createTableViewRow({
                category_id : categoryID,
                enable_click : (isSearching && hitCount == 0 ) ? false : true,
                accessibilityLabel : 'catg_' + categoryID,
                height : 50,
                layout : 'absolute',
                opacity : '1.0',
                selectedBackgroundColor : Alloy.Styles.accentColor
            });
            view = Ti.UI.createView({
                backgroundImage : Alloy.Styles.categoryOptionImage,
                opacity : '0.9',
                top : 0,
                left : 0,
                height : '100%',
                width : '100%'
            });
            label = Ti.UI.createLabel({
                text : categoryRefinement.getLabel(),
                left : 26,
                font : Alloy.Styles.categoryRefinementLabelSmall,
                color : fontColor,
                highlightedColor : Alloy.Styles.color.text.dark
            });

            view.add(label);
            row.add(view);
            cats.push(row);
        }
    } else {
        logger.error('Unable to obtain categories from search response.  Verify product_search.cgid_select_params config is setup properly.');
    }

    $.subcategoriesTable.setData(cats);
    logger.trace('rendering refinements end');
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCategoryClick - handles click event on category
 * @param {Object} event
 * @api private
 */
function onCategoryClick(event) {
    var category_id = event.rowData.category_id;
    var selRefs = currentSearch.getSelectedRefinements();

    if (category_id) {
        selRefs = {
            cgid : category_id
        };

        currentSearch.setSelectedRefinements(selRefs, {
            silent : true
        });
        eaUtils.doProductSearch({
            force : true
        });
    }
}

/**
 * onSubCategoryClick - handles click event on subcategory
 * @param {Object} event
 * @api private
 */
function onSubCategoryClick(event) {
    var category_id = event.rowData.category_id;
    var enable_click = event.rowData.enable_click;
    var selRefs = currentSearch.getSelectedRefinements();

    if (category_id && enable_click) {
        selRefs = {
            cgid : category_id
        };

        currentSearch.setSelectedRefinements(selRefs, {
            silent : true
        });
        eaUtils.doProductSearch({
            force : true
        });
    }
}

