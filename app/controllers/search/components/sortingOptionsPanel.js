// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/sortingOptionsPanel.js - panel for sorting options on search results
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var currentSearch = Alloy.Models.productSearch;
var logger = require('logging')('search:components:sortingOptionsPanel', getFullControllerPath($.__controllerPath));

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.sortingOptionsTable.addEventListener('click', onSortClick);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentSearch, 'change:sorting_options', render);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.sortingOptionsTable.removeEventListener('click', onSortClick);
    $.stopListening();
    $.destroy();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');
    var sortingOptions = currentSearch.getSortingOptionsCollection(),
        sortingOption,
        sortingOptionID,
        rows = [],
        row,
        view,
        label;
    var selectedSortOption = currentSearch.getSelectedSortingOption();
    var selectedSortOptionID = selectedSortOption ? selectedSortOption.getId() : null;
    for (var i = 0,
        ii = sortingOptions.length; i < ii; i++) {
        sortingOption = sortingOptions.at(i);
        sortingOptionID = sortingOption.getId();

        row = Ti.UI.createTableViewRow({
            option_id : sortingOptionID,
            height : 50,
            layout : 'absolute',
            selectedBackgroundColor : Alloy.Styles.accentColor
        });
        view = Ti.UI.createView({
            backgroundImage : Alloy.Styles.categoryOptionImage,
            opacity : '0.9',
            top : 0,
            left : 0,
            height : '100%',
            width : '100%',
            accessibilityLabel : 'sort_' + sortingOptionID,

        });
        label = Ti.UI.createLabel({
            text : sortingOption.getLabel(),
            left : 26,
            font : Alloy.Styles.detailLabelFont,
            color : (selectedSortOptionID == sortingOptionID) ? Alloy.Styles.accentColor : Alloy.Styles.color.text.dark,
            highlightedColor : Alloy.Styles.color.text.dark
        });
        view.add(label);
        row.add(view);

        rows.push(row);
    }
    // populate refinements
    $.sortingOptionsTable.setData(rows);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onSortClick - set the sorting option on the
 * current product search
 *
 * @param {Object} event
 * @api private
 */
function onSortClick(event) {
    event.cancelBubble = true;
    var option_id = event.rowData.option_id;

    currentSearch.setSelectedSortingOption(option_id, {
        silent : true
    });
    eaUtils.doProductSearch();
}

//---------------------------------------------------
// ## CONSTRUCTOR

render();
