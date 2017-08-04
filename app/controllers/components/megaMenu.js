// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/megaMenu.js - main mega menu controller
 */

//---------------------------------------------------
// ## VARIABLES
var logger = require('logging')('components:megaMenu', getFullControllerPath($.__controllerPath));

var current_category_id = null;
Alloy.Globals.megaMenu = {
    current_dept_id : null
};

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');

    // Listeners are being added in init, because megaMenu is not always used and we don't want listeners when mega menu is off

    // Model listener, detects when a new PSR has been returned from the server
    $.listenTo(Alloy.Models.productSearch, 'change:selected_refinements', onChangeRefinements);

    // Listens for clicks on a department button
    $.top_nav_area.addEventListener('click', onTopNavClick);

    // Listens for clicks on a leaf category
    $.menu_pages.addEventListener('click', onMenuPagesClick);

    // Listens for ScrollableView changes and updates nav UI
    $.menu_pages.addEventListener('scrollend', onMenuPagesScrollEnd);

    // Exposes method to show/hide self,
    $.listenTo(Alloy.eventDispatcher, 'site_map:show', onSiteMapShow);

    $.listenTo(Alloy.eventDispatcher, 'site_map:hide', hideView);

    $.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', hideView);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.top_nav_area.removeEventListener('click', onTopNavClick);
    $.menu_pages.removeEventListener('click', onMenuPagesClick);
    $.menu_pages.removeEventListener('scrollend', onMenuPagesScrollEnd);
    removeAllChildren($.menu_pages);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getDepartmentLabelByID - get the department label by id
 *
 * @param cat_id - category id
 * @return category match
 *
 * @api private
 */
function getDepartmentLabelByID(cat_id) {
    var matches = _.filter($.top_nav_area.children, function(el) {
        return el.category_id == cat_id;
    });

    return matches ? matches[0] : null;
}

/**
 * getLeafCategoryLabelByID - get category label for id
 *
 * @api private
 */
function getLeafCategoryLabelByID(cat_id) {
    // get department page root
    // for each one, look at all leaf labels
}

/**
 * selectDepartment - select department passed in
 *
 * @param dept_id - id of department to select
 *
 * @api private
 */
function selectDepartment(dept_id) {
    if (dept_id && dept_id != Alloy.Globals.megaMenu.current_dept_id) {
        var deptLabel;
        var newDeptLabel = getDepartmentLabelByID(dept_id);
        if (Alloy.Globals.megaMenu.current_dept_id && newDeptLabel) {
            deptLabel = getDepartmentLabelByID(Alloy.Globals.megaMenu.current_dept_id);
            if (deptLabel) {
                deptLabel.backgroundImage = '';
            }
        }

        deptLabel = newDeptLabel;
        if (deptLabel) {
            deptLabel.backgroundImage = Alloy.Styles.megaMenuDepartmentUnderline;
            Alloy.Globals.megaMenu.current_dept_id = dept_id;
        } else {
            Alloy.Router.navigateToCategory({
                category_id : decodeID(dept_id.substring(1))
            }).always(function() {
                $.megaMenu.hide();
            });
        }

    }
}

/**
 * getTopLevelIDs - obtain top level category ids
 *
 * @return map of category ids
 *
 * @api private
 */
function getTopLevelIDs() {
    return _.map($.top_nav_area.children, function(el) {
        return el.category_id;
    });
}

/**
 * handleDepartmentSelection - selection of department
 *
 * @param dept_id
 *
 * @api private
 */
function handleDepartmentSelection(dept_id) {
    dept_id = encodeID(dept_id);

    // Root-level search defaults to first tab
    if (dept_id == 'root') {
        dept_id = $.top_nav_area.children[0].id;
    }

    // Update UI selection
    selectDepartment(dept_id);

    // Transition directly to associated page in ScrollableView
    var ids = getTopLevelIDs();
    var newIndex = _.indexOf(ids, dept_id);

    if (newIndex > -1) {
        $.menu_pages.setCurrentPage(newIndex);
    }
}

/**
 * encodeID - encode id
 *
 * @param id to encode
 *
 * @api private
 */
function encodeID(id) {
    var encodedID = null;
    if (id) {
        encodedID = id.replace(/-/g, '__');
    }
    return encodedID;
}

/**
 * decodeID - decode id
 *
 * @param id to decode
 *
 * @api private
 */
function decodeID(id) {
    id = '' + id;
    var decodedID = null;
    if (id) {
        decodedID = id.replace(/__/g, '-');
    }
    return decodedID;
}

/**
 * deselectCurrentLeafCategory - deselect the current leaf
 *
 * @api private
 */
function deselectCurrentLeafCategory() {
    if (current_category_id) {
        var associatedLabel = getLeafCategoryLabelByID(category_id);
        if (associatedLabel) {
            associatedLabel.backgroundImage = '';
        }
    }
}

/**
 * selectLeafCategory - select the current leaf
 *
 * @api private
 */
function selectLeafCategory(category_id) {
    if (category_id) {
        var associatedLabel = getLeafCategoryLabelByID(category_id);
        if (associatedLabel) {
            deselectCurrentLeafCategory();
            current_category_id = category_id;
        }
    }
}

/**
 * handleLeafCategorySelection - handle the leaf category selection
 *
 * @param category_id
 *
 * @api private
 */
function handleLeafCategorySelection(category_id) {
    if (category_id) {
        var associatedLabel = getLeafCategoryLabelByID(category_id);
        if (associatedLabel) {
            associatedLabel.animate(Alloy.Animations.bounce);
        }

        Alloy.Router.navigateToCategory({
            category_id : decodeID(category_id)
        }).always(function() {
            $.megaMenu.hide();
        });
    }
}

/**
 * transformCategory - transform the model data
 *
 * @param model
 *
 * @api private
 */
function transformCategory(model) {
    var in_json = model.toJSON();

    in_json.safeID = '_' + in_json.id;
    in_json.safePageID = '_' + in_json.id + 'page';
    in_json.safeSectionID = '_' + in_json.id + 'section';

    return in_json;
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onChangeRefinements - refinements have changed
 *
 * @api private
 */
function onChangeRefinements() {
    var selRefs = Alloy.Models.productSearch.get('selected_refinements');
    var category_id = selRefs.cgid;

    selectLeafCategory(category_id);
}

/**
 * onTopNavClick - top navigation click
 *
 * @param {Object} event
 *
 * @api private
 */
function onTopNavClick(event) {
    handleDepartmentSelection(event.source.category_id);
}

/**
 * onMenuPagesClick - menu pages click
 *
 * @param {Object} event
 *
 * @api private
 */
function onMenuPagesClick(event) {
    event.cancelBubble = true;

    logger.info('event:\n' + JSON.stringify(event));

    handleLeafCategorySelection(event.source.categoryid);
}

/**
 * onMenuPagesScrollEnd - menu page scroll end
 *
 * @param {Object} event
 *
 * @api private
 */
function onMenuPagesScrollEnd(event) {
    // Should update tab headers when scrolling ...
    var dept_id = $.top_nav_area.children[event.currentPage].category_id;
    handleDepartmentSelection(dept_id);
}

/**
 * hideView - site_map:hide global event fired
 *
 * @api private
 */
function hideView() {
    if ($.megaMenu.visible) {
        $.megaMenu.hide();
    }
}

/**
 * onSiteMapShow - site_map:show global event fired
 *
 * @param {Object} event
 *
 * @api private
 */
function onSiteMapShow(event) {
    if ($.megaMenu.visible) {
        $.megaMenu.hide();
        return;
    }
    if ($.topCategories.size() === 0) {
        $.topCategories.reset(Alloy.Globals.categoryTree.getVisibleCategories());
    }
    var dept_id = event.category_id || Alloy.Globals.megaMenu.current_dept_id || $.top_nav_area.children[$.menu_pages.currentPage].category_id;
    if (dept_id) {
        handleDepartmentSelection(dept_id);
    }

    $.megaMenu.show();
}

$.megaMenu.hide();
