// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/listItemRefinement.js - refinement tile for a list item on attribute refinement panel
 */

//---------------------------------------------------
// ## VARIABLES

var listenerViews = [];
var logger = require('logging')('search:components:listItemRefinement', getFullControllerPath($.__controllerPath));

var psr = Alloy.Models.productSearch;
var refinement = $model;

var visibleValues = 0;
var onRowClick;

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.init = init;
exports.shouldBeVisible = shouldBeVisible;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
    var values,
        rows = [],
        row,
        hit_count,
        view,
        label;

    values = refinement.getValues();

    $.listItemRefinementHeaderLabel.setText(refinement.getLabel());

    // Remove existing rows, if necessary
    deinitExistingRows();

    visibleValues = 0;
    // Populate one row per option
    if (values) {
        _.each(values, function(value) {
            var attribute_id = refinement.getAttributeId();
            var value_id = value.getValue();
            var hit_count = value.getHitCount();
            var swatchProperty = Alloy.CFG.product_search.refinements.colorForPresentationID[value.getPresentationId() || 'default'];
            var isRefinedBy = psr.isRefinedBy(attribute_id, value_id);

            if (hit_count == 0) {
                return;
            }
            visibleValues++;

            var isSelected = psr.isRefinedBy(attribute_id, value.getValue());
            row = Ti.UI.createTableViewRow({
                hasCheck : isSelected,
                height : 50,
                layout : 'absolute',
                selectedBackgroundColor : Alloy.Styles.accentColor,
                rightImage : isSelected ? 'images/icons/green_checkmark.png' : null,
                accessibilityLabel : 'select_' + value_id,
                isRefinedBy : isRefinedBy
            });
            label = Ti.UI.createLabel({
                text : value.getLabel(),
                font : Alloy.Styles.detailLabelFont,
                left : 42,
                highlightedColor : Alloy.Styles.color.text.white,
                color : Alloy.Styles.color.text.dark
            });
            row.add(label);
            $.listItemRefinement.add(row);

            onRowClick = function(event) {
                event.cancelBubble = true;
                handleRefinementClick({
                    attribute_id : attribute_id,
                    value_id : value_id
                });
            };

            row.addEventListener('click', onRowClick);
            listenerViews.push(row);
        });
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    deinitExistingRows();
    $.stopListening();
    $.destroy();
}


//---------------------------------------------------
// ## FUNCTIONS

/**
 * shouldBeVisible - returns true if component should be visible
 *
 * @api public
 */
function shouldBeVisible() {
    return visibleValues > 1;
}

/**
 * deinitExistingRows - Deinits all the views for $.listItemRefinement
 * and remove the event listener
 * @api private
 **/
function deinitExistingRows() {
    var view = null;
    removeAllChildren($.listItemRefinement);
    _.each(listenerViews, function(view) {
        view.removeEventListener('click', onRowClick);
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleRefinementClick - Handles the event for refinement click
 * @param {Object} event
 * @api private
 */
function handleRefinementClick(event) {
    event.cancelBubble = true;
    logger.info('triggering refinement:select: ' + JSON.stringify(event));
    $.listItemRefinement.fireEvent('refinement:toggle', event);
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();
