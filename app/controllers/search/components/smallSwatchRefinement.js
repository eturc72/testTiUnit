// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/smallSwatchRefinement.js - refinement tile for a small swatch on attribute refinement panel
 */

//---------------------------------------------------
// ## VARIABLES

var listenerViews = [];
var logger = require('logging')('search:components:smallSwatchRefinement', getFullControllerPath($.__controllerPath));

var psr = Alloy.Models.productSearch;
var refinement = $model;

var visibleValues = 0;
var onViewClick;

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
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
    $.smallSwatchRefinementHeaderLabel.setText(refinement.getLabel());

    // Remove existing rows, if necessary
    while ($.smallSwatchRefinement.rowCount > 0) {
        $.smallSwatchRefinement.remove($.smallSwatchRefinement.rows[0]);
    }

    row = Ti.UI.createTableViewRow({
        layout : 'horizontal',
        touchEnabled : false,
        allowsSelection : false,
        selectionStyle : Ti.UI.iOS.TableViewCellSelectionStyle.NONE
    });
    visibleValues = 0;
    // Populate one row per option
    _.each(values, function(value) {
        var value_id = value.getValue();
        var attribute_id = refinement.getAttributeId();
        var hit_count = value.getHitCount();
        var isRefinedBy = psr.isRefinedBy(attribute_id, value_id);

        if (hit_count == 0) {
            return;
        }
        visibleValues++;

        view = Ti.UI.createView({
            width : 50,
            height : 45,
            backgroundColor : isRefinedBy ? Alloy.Styles.accentColor : Alloy.Styles.color.background.medium,
            left : 10,
            top : 10,
            bottom : 10,
            layout : 'absolute',
            isRefinedBy : isRefinedBy,
            accessibilityLabel : 'select_' + value_id
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
    $.smallSwatchRefinement.add(row);
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
 * deinitExistingRows - deinit all the rows for that view
 *
 * @api private
 */
function deinitExistingRows() {
    var view = null;
    removeAllChildren($.smallSwatchRefinement);
    _.each(listenerViews, function(view) {
        view.removeEventListener('click', onViewClick);
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleSwatchClick - handle the click event on the swatch
 * @param {Object} event
 * @api private
 */
function handleSwatchClick(event) {
    event.cancelBubble = true;
    logger.info('triggering refinement:select: ' + JSON.stringify(event));
    $.smallSwatchRefinement.fireEvent('refinement:toggle', event);
}


//---------------------------------------------------
// ## CONSTRUCTOR

init();
