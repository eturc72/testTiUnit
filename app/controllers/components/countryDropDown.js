// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/countryDropDown.js - Builds a view to display country dropdown
 */

//---------------------------------------------------
// ## VARIABLES

var appSettings = require('appSettings');
var logger = require('logging')('components:countryDropDown', getFullControllerPath($.__controllerPath));
var countryConfig = require('config/countries').countryConfig;

//localizing the display names
_.each(countryConfig, function(country) {
    country.localizedDisplayName = _L(country.displayName);
});


//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(Alloy.eventDispatcher, 'countryChange:selected', function() {
    _.each(countryConfig, function(country) {
        country.localizedDisplayName = _L(country.displayName);
    });
    initializeCountries();
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.updateCountrySelectedItem = updateCountrySelectedItem;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    initializeCountries();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.country_select.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateCountrySelectedItem - Used to select the item in the country dropdown
 * @param {Object} selectedItem
 *
 * @api public
 */
function updateCountrySelectedItem(selectedItem) {
    logger.info('updateCountrySelectedItem called');
    $.country_select.updateSelectedItem(selectedItem);
}

/**
 * initializeCountries - create a view for country selector dropdown
 *
 * @api private
 */
function initializeCountries() {
    logger.info('initializeCountries called');
    $.country_select = Alloy.createController('components/selectWidget', {
        valueField : 'value',
        textField : 'localizedDisplayName',
        values : countryConfig,
        messageWhenNoSelection : _L('Select Country'),
        selectListTitleStyle : {
            accessibilityValue : 'country_select_dropdown',
            width : Ti.UI.FILL,
            left : 10,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont
        },
        selectListStyle : {
            width : Ti.UI.FILL,
            top : 0,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont,
            selectedFont : Alloy.Styles.detailValueFont,
            unselectedFont : Alloy.Styles.detailValueFont,

        },
    });
    $.countrySelectionDropDown.add($.country_select.getView());
    $.listenTo($.country_select, 'itemSelected', onCountrySelected);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCountrySelected - handle event when selected a value in country dropdown
 * @param {Object} event
 *
 * @api private
 */
function onCountrySelected(event) {
    $.trigger('country:change', {
        selectedCountry : event.item.value
    });
}
