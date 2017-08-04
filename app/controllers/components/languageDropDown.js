// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/languageDropDown.js - Builds a view to display language dropdown
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:languageDropDown', getFullControllerPath($.__controllerPath));
var countryConfig = require('config/countries').countryConfig;
var filteredLanguages;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'countryChange:selected', function() {
    removeAllChildren($.languageSelectionDropDown);
    $.stopListening($.language_select, 'itemSelected', onLanguageSelected);
    initializeLanguages();
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.populateLanguages = populateLanguages;
exports.updateLanguageSelectedItem = updateLanguageSelectedItem;
exports.updateLanguageSelectedValue = updateLanguageSelectedValue;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    initializeLanguages();
    $.language_select.setEnabled(false);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    removeAllChildren($.languageSelectionDropDown);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * populateLanguages - Populates the languages values based on the languages
 * supported for that storefront.
 *
 * @api public
 */

function populateLanguages(selectedCountry) {
    logger.info('populateLanguages called');
    if (selectedCountry) {
        var languagesSupported = countryConfig[selectedCountry].languagesSupported;
        if (languagesSupported == null) {
            logger.error('Missing languagesSupported for country ' + selectedCountry + ' in countries.js/user.js');
        }
        var languageConfig = require('config/countries').languageConfig;
        filteredLanguages = languageConfig.filter(function(model) {
            var filter = false;
            if (_.contains(languagesSupported, model.value)) {
                filter = true;
            }
            if (filter == true) {
                return true;
            }
        });
        if (filteredLanguages == '') {
            Alloy.Dialog.showConfirmationDialog({
                messageString : String.format(_L('There is no corresponding language definition for the value \'%s\' in languageConfig'), languagesSupported[0]),
                titleString : _L('Configuration Error'),
                okButtonString : _L('OK'),
                hideCancel : true,
                okFunction : function() {
                    return false;
                }
            });
        } else {
            //localizing the display names
            _.each(filteredLanguages, function(language1) {
                language1.localizedDisplayName = _L(language1.displayName);
            });
            if ($.language_select) {
                $.language_select.updateItems(filteredLanguages);
                $.language_select.setEnabled(true);
            }
        }
    } else {
        $.language_select.setEnabled(false);
    }
}

/**
 * updateLanguageSelectedItem - Used to select the item in the language dropdown
 *
 * @api public
 */
function updateLanguageSelectedItem() {
    logger.info('updateLanguageSelectedItem called');
    $.language_select.updateSelectedItem(Alloy.CFG.languageSelected);
    $.language_select.setEnabled(true);
}

/**
 * updateLanguageSelectedValue - Used to select the item in the language dropdown
 *
 * @api public
 */
function updateLanguageSelectedValue(tempLanguageSelected) {
    logger.info('Filtered Languages' + JSON.stringify(filteredLanguages));
    if ($.language_select && filteredLanguages != '') {
        var defaultLanguages = filteredLanguages.filter(function(model) {
            if (model.value == tempLanguageSelected) {
                return true;
            }
        });
        logger.info('Default Languages' + JSON.stringify(defaultLanguages));
        if (defaultLanguages.length == 0) {
            if (!tempLanguageSelected) {
                $.language_select.updateSelectedItem(filteredLanguages[0].value);
            } else {
                $.language_select.updateSelectedItem('');
                $.language_select.setEnabled(true);
            }
        } else {
            $.language_select.updateSelectedItem(defaultLanguages[0].value);
        }
    }
}

/**
 * initializeLanguages - create a view for language selector dropdown
 *
 * @api private
 */
function initializeLanguages() {
    logger.info('initializeLanguages called');
    $.language_select = Alloy.createController('components/selectWidget', {
        valueField : 'value',
        textField : 'localizedDisplayName',
        values : null,
        messageWhenNoSelection : _L('Select Language'),
        selectListTitleStyle : {
            width : Ti.UI.FILL,
            left : 10,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont,
            accessibilityValue : 'site_language_selector',
        },
        selectListStyle : {
            width : Ti.UI.FILL,
            top : 0,
            color : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            font : Alloy.Styles.detailValueFont,
            selectedFont : Alloy.Styles.detailValueFont,
            unselectedFont : Alloy.Styles.detailValueFont
        },
    });
    $.languageSelectionDropDown.add($.language_select.getView());
    $.listenTo($.language_select, 'itemSelected', onLanguageSelected);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onLanguageSelected - handle event when selected a value in language dropdown
 *
 * @param {Object} event
 *
 * @api private
 */
function onLanguageSelected(event) {
    if (event.item) {
        $.trigger('language:change', {
            selectedLanguage : event.item.value,
            ocapiLocale : event.item.ocapi_locale,
            storefrontLocale : event.item.storefront_locale
        });
    } else {
        $.trigger('language:change');
    }
}
