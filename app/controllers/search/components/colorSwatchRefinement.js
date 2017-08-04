// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/colorSwatchRefinement.js - refinement tile for a color swatch on attribute refinement panel
 */

//---------------------------------------------------
// ## VARIABLES

var listenerViews = [];
var logger = require('logging')('search:components:colorSwatchRefinement', getFullControllerPath($.__controllerPath));

var psr = Alloy.Models.productSearch;
var refinement = $model;

var visibleValues = 0;
var onViewClick;

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
    var values,
        rows = [],
        row,
        view,
        label;

    values = refinement.getValues();
    $.colorSwatchRefinementHeaderLabel.setText(refinement.getLabel());

    // Remove existing rows, if necessary
    while ($.colorSwatchRefinement.rowCount > 0) {
        $.colorSwatchRefinement.remove($.colorSwatchRefinement.rows[0]);
    }

    row = Ti.UI.createTableViewRow({
        layout : 'horizontal',
        touchEnabled : false,
        allowsSelection : false,
        opacity : 0.95,
        selectionStyle : Ti.UI.iOS.TableViewCellSelectionStyle.NONE
    });

    // Populate one row per option
    visibleValues = 0;
    _.each(values, function(value) {
        // Use local scope variables to make closure binding work right ...
        var attribute_id = refinement.getAttributeId();
        var value_id = value.getValue();
        var hit_count = value.getHitCount();
        var value_key = value.getPresentationId() || 'default';
        var swatchProperty = Alloy.CFG.product_search.refinements.colorForPresentationID[value_key];
        if (!swatchProperty) {
            logger.error('Missing colorForPresentationID for value \'' + value_key.toLowerCase() + '\' skipping color refinement.');
            return;
        }
        var isRefinedBy = psr.isRefinedBy(attribute_id, value_id);

        if (hit_count == 0) {
            return;
        }
        visibleValues++;
        var outerView = Ti.UI.createView({
            width : 50,
            height : 45,
            borderWidth : 1,
            borderColor : isRefinedBy ? Alloy.Styles.color.border.darkest : Alloy.Styles.color.border.lighter,
            left : 10,
            top : 10,
            bottom : 10,
            layout : 'absolute',
            bubbleParent : false,
            opacity : 0.95,
            accessibilityLabel : 'border_' + value_id + '_' + isRefinedBy,
            backgroundColor : Alloy.Styles.color.background.light
        });
        view = Ti.UI.createView({
            width : 44,
            height : 39,
            left : 3,
            top : 3,
            bottom : 10,
            layout : 'absolute',
            bubbleParent : false,
            opacity : 0.95,
            accessibilityLabel : 'select_' + value_id
        });
        outerView.add(view);
        view[swatchProperty.key] = swatchProperty.value;
        row.add(outerView);

        onViewClick = function(event) {
            event.cancelBubble = true;
            handleSwatchClick({
                attribute_id : attribute_id,
                value_id : value_id
            });
        };
        view.addEventListener('click', onViewClick);
        listenerViews.push(view);

    });
    $.colorSwatchRefinement.add(row);
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
 * deinitExistingRows - Deinits all the views for $.colorSwatchRefinement
 * and remove the event listener
 * @api private
 **/

function deinitExistingRows() {
    var view = null;
    removeAllChildren($.colorSwatchRefinement);
    _.each(listenerViews, function(view) {
        view.removeEventListener('click', onViewClick);
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleSwatchClick - handles the swatch click
 * @param {Object} event
 * @api private
 */
function handleSwatchClick(event) {
    event.cancelBubble = true;
    logger.info('triggering refinement:select: ' + JSON.stringify(event));
    $.colorSwatchRefinement.fireEvent('refinement:toggle', event);
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();
