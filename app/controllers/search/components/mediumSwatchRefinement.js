// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/mediumSwatchRefinement.js - refinement tile for a medium sized swatch on attribute refinement panel
 */

//---------------------------------------------------
// ## VARIABLES

var listenerViews = [];
var logger = require('logging')('search:components:mediumSwatchRefinement', getFullControllerPath($.__controllerPath));

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
    $.mediumSwatchRefinementHeaderLabel.setText(refinement.getLabel());

    // Remove existing rows, if necessary
    while ($.mediumSwatchRefinement.rowCount > 0) {
        $.mediumSwatchRefinement.remove($.mediumSwatchRefinement.rows[0]);
    }

    row = Ti.UI.createTableViewRow({
        layout : 'horizontal',
        touchEnabled : false,
        allowsSelection : false,
        selectionStyle : Ti.UI.iOS.TableViewCellSelectionStyle.NONE
    });
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
            view = Ti.UI.createView({
                width : 90,
                height : 45,
                backgroundColor : isRefinedBy ? Alloy.Styles.accentColor : Alloy.Styles.color.background.medium,
                isRefinedBy : isRefinedBy,
                accessibilityLabel : 'select_' + value_id,
                left : 10,
                top : 20,
                bottom : 10,
                layout : 'absolute'
            });
            label = Ti.UI.createLabel({
                text : value.getLabel(),
                font : Alloy.Styles.lineItemLabelFont,
                color : isRefinedBy ? Alloy.Styles.color.text.white : Alloy.Styles.color.text.mediumdark
            });
            view.add(label);
            row.add(view);

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
        $.mediumSwatchRefinement.add(row);
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
 * deinitExistingRows - Deinits all the views for $.mediumSwatchRefinement
 * and remove the event listener
 * @api private
 **/
function deinitExistingRows() {
    var view = null;
    removeAllChildren($.mediumSwatchRefinement);
    _.each(listenerViews, function(view) {
        view.removeEventListener('click', onViewClick);
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleSwatchClick - Handles the event for Swatch click
 * @param {Object} event
 * @api private
 */
function handleSwatchClick(event) {
    event.cancelBubble = true;
    logger.info('triggering refinement:select: ' + JSON.stringify(event));
    $.mediumSwatchRefinement.fireEvent('refinement:toggle', event);
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();
