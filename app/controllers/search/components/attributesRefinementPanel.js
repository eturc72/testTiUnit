// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/attributesRefinementPanel.js - attributes refinement panel for search header
 */

//---------------------------------------------------
// ## VARIABLES

// Localization constant
var headerTextLabel = 15;
var symbolHeaderTextLabel = 8;

var eaUtils = require('EAUtils');
var logger = require('logging')('search:components:attributesRefinementPanel', getFullControllerPath($.__controllerPath));
var currentSearch = Alloy.Models.productSearch;
var refinementControllers = [];

//---------------------------------------------------
// ##  UI EVENT LISTENERS

$.refinementsTable.addEventListener('refinement:toggle', onRefinementToggle);

$.appliedFiltersTable.addEventListener('click', onFilterClick);

$.appliedFiltersTableHeaderButton.addEventListener('click', onFilterHeaderClick);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentSearch, 'change:refinements', initRefinementsUI);

$.listenTo(currentSearch, 'change:selected_refinements', initSelectedRefinementsUI);

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api private
 */
function init() {
    logger.info('init');

    initRefinementsUI();
    initSelectedRefinementsUI();
    if (eaUtils.isSymbolBasedLanguage() && $.appliedFiltersTableHeaderLabel.getText().length > symbolHeaderTextLabel) {
        $.appliedFiltersTableHeaderLabel.setFont(Alloy.Styles.smallestAccentFont);
    } else {
        if ($.appliedFiltersTableHeaderLabel.getText().length > headerTextLabel) {
            $.appliedFiltersTableHeaderLabel.setFont(Alloy.Styles.smallerAccentCalloutFont);
        } else {
            $.appliedFiltersTableHeaderLabel.setFont(Alloy.Styles.smallAccentFont);
        }
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.refinementsTable.removeEventListener('refinement:toggle', onRefinementToggle);
    $.appliedFiltersTable.removeEventListener('click', onFilterClick);
    $.appliedFiltersTableHeaderButton.removeEventListener('click', onFilterHeaderClick);
    $.stopListening();
    deinitRefinementControllers();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * templateForRefinementAttribute - Return value for a refinement attribute
 *
 * @param {String} attributeId
 * @return {String}
 *
 * @api private
 */
function templateForRefinementAttribute(attributeId) {
    return Alloy.CFG.product_search.refinements.refinement_component[attributeId] || Alloy.CFG.product_search.refinements.refinement_component['default'];
}

/**
 * deinitRefinementControllers - Call deinit on all refinement controllers
 *
 * @api private
 */
function deinitRefinementControllers() {
    _.each(refinementControllers, function(refinementController) {
        refinementController.deinit && refinementController.deinit();
    });
    refinementControllers = [];
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onRefinementToggle - Handle refinement toggle event
 *
 * @param {Object} event
 *
 * @api private
 */
function onRefinementToggle(event) {
    event.cancelBubble = true;

    var attribute_id = event.attribute_id;
    var value_id = event.value_id;

    currentSearch.toggleRefinementValue(attribute_id, value_id, {
        silent : true
    });
    eaUtils.doProductSearch({
        force : true
    });
}

/**
 * onFilterClick - Handle filter click
 *
 * @param {Object} event
 *
 * @api private
 */
function onFilterClick(event) {
    event.cancelBubble = true;

    var attribute_id = event.rowData.attribute_id;
    var value_id = event.rowData.value_id;

    currentSearch.toggleRefinementValue(attribute_id, value_id, {
        silent : true
    });
    eaUtils.doProductSearch();
}

/**
 * onFilterClick - Handle filter header click
 *
 * @param {Object} event
 *
 * @api private
 */
function onFilterHeaderClick(event) {
    event.cancelBubble = true;

    currentSearch.clearAllRefinementValues({
        silent : true
    });
    eaUtils.doProductSearch();
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * initRefinementsUI - Init refinements UIs
 *
 * @api private
 */
function initRefinementsUI() {
    logger.info('initRefinementsUI');
    var refinementSections = [];
    deinitRefinementControllers();

    var refinements = currentSearch.getRefinements(),
        attribute_id,
        template,
        controller,
        view,
        refinement;

    for (var i = 0,
        ii = refinements.length; i < ii; i++) {
        refinement = refinements[i];
        attribute_id = refinement.getAttributeId();

        // Don't display category refinements
        if (attribute_id == 'cgid') {
            continue;
        }

        // Lookup appropriate template for refinement
        template = templateForRefinementAttribute(attribute_id);
        controller = Alloy.createController(template, {
            $model : refinement
        });
        refinementControllers.push(controller);
        view = controller.getView();

        if (view && controller.shouldBeVisible()) {
            refinementSections.push(view);
        }
    }

    // populate refinements
    $.refinementsTable.setData(refinementSections);
}

/**
 * initSelectedRefinementsUI - Init selected refinements UIs
 *
 * @api private
 */
function initSelectedRefinementsUI() {
    logger.info('initSelectedRefinementsUI');
    var selectedRefinementsRows = [];

    var selectedRefinements = currentSearch.getSelectedRefinements();
    var keys = _.keys(selectedRefinements),
        key,
        value;
    var refinements = currentSearch.getRefinementsCollection();
    var refinement,
        values,
        value,
        value_id,
        value_ids,
        hit_count,
        row,
        label,
        view;

    var refinementValue = null;

    for (var k = 0,
        kk = keys.length; k < kk; k++) {
        key = keys[k];
        // Don't display selected categories
        if (key == 'cgid') {
            continue;
        }

        value_id = selectedRefinements[key];
        refinement = refinements.where({attribute_id:key})[0];
        if (!refinement) {
            return;
        }

        values = refinement.getValuesCollection();
        value_ids = value_id.split('|');

        for (var l = 0,
            ll = value_ids.length; l < ll; l++) {
            value_id = value_ids[l];
            value = values.where({value:value_id})[0];
            if (!value) {
                logger.info('Could not find expected value! ' + value_id + ' in ' + JSON.stringify(values.toJSON()));
                continue;
            }
            hit_count = value.getHitCount();
            if (hit_count == 0) {
                continue;
            }

            refinementValue = currentSearch.getRefinementValue(key, value_id);

            row = Ti.UI.createTableViewRow({
                attribute_id : refinement.getAttributeId(),
                value_id : value_id,
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
                text : String.format(_L('%s: %s'), refinement.getLabel(), refinementValue.getLabel()),
                left : 26,
                font : Alloy.Styles.detailLabelFont,
                color : Alloy.Styles.color.text.dark,
                highlightedColor : Alloy.Styles.color.text.dark
            });
            view.add(label);
            row.add(view);
            view = Ti.UI.createView({
                backgroundImage : Alloy.Styles.refinementClearImage,
                right : 12,
                top : 18,
                height : 16,
                width : 16,
                accessibilityLabel : 'clear_' + refinementValue.getLabel()
            });
            row.add(view);

            selectedRefinementsRows.push(row);
        }
    }

    // populate selected refinements
    $.appliedFiltersTable.setData(selectedRefinementsRows);
}

//----------------------------------------------
// ## CONSTRUCTOR

init();
