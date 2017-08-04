// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/enterAddressDynamic.js - Handles entering a new shipping address
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var customId = args.customId;
var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;
var showError = require('EAUtils').showError;
var clearError = require('EAUtils').clearError;
var removeAllViews = require('EAUtils').removeAllViews;
var getUIObjectType = require('EAUtils').getUIObjectType;
var viewLayoutData = require(Alloy.CFG.addressform).getLayout();
var formMgr = require('addressFormManager')({
    viewLayoutData : viewLayoutData,
    $ : $,
    initializeCountryPicker : initializeCountryPicker,
    initializeStatePicker : initializeStatePicker,
    getterFunctionsForCustomFields : {
        getCountry : getCountry
    }
});
var EAUtils = require('EAUtils');

if (Alloy.CFG.enable_address_autocomplete) {
    var googleAddressDetails = Alloy.createModel('googleAddressDetails');
    var addressAutocompleteController = Alloy.createController('components/addressAutocomplete', googleAddressDetails);
    var googlePlaces = require('googlePlaces')(addressAutocompleteController.returnAddressCollection());
    // flag to check whether the address is picked from suggestions or enetred manually
    var addressPickedFromSuggestion = false;
    // flag to check that user dismissed address suggestions
    var addressSuggestionsDismissed = false;
    // timer between two successive calls for fetching address suggestions
    var googlePlacesApiTimer = 0;
}

var errorMsgs = viewLayoutData.addressForm.error_messages;
var logger = require('logging')('components:enterAddressDynamic', getFullControllerPath($.__controllerPath));
var countryInited = false,
    stateInited = false;
var country_code,
    old_country_code;
var readOnlyFields = [];
// for prepending accessibility labels
var al_prepend = '';
var globalCountries;
var globalStates;
var state_code = null;
var country_code = null;
var enableStatePicker = false;
var previousValues = '';

//  Form Manager Functions

var closeKeyboard = formMgr.closeKeyboard;
var getPhone = formMgr.getPhone;
var getPostalCode = formMgr.getPostalCode;
var getCity = formMgr.getCity;
var getAddress2 = formMgr.getAddress2;
var getAddress1 = formMgr.getAddress1;
var getLastName = formMgr.getLastName;
var getFirstName = formMgr.getFirstName;
var validatePhoneField = formMgr.validatePhoneField;
var validatePostalCodeField = formMgr.validatePostalCodeField;
var isPostalCodeValid = formMgr.isPostalCodeValid;
var isPhoneValid = formMgr.isPhoneValid;
var setAllTextFieldsValues = formMgr.setAllTextFieldsValues;
//---------------------------------------------------
// ## UI EVENT LISTENERS
if (addressAutocompleteController) {
    $.listenTo(googleAddressDetails, 'change', fillAddressCountry);

    // if user dismisses the address suggestions
    $.listenTo(addressAutocompleteController, 'addressSuggestionsCancelBtnClick', function() {
        if (addressAutocompleteController) {
            addressSuggestionsDismissed = true;
        }
    });
}

// hideAuxillaryViews event listener
$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', function() {
    if (addressAutocompleteController) {
        addressAutocompleteController.hideView();
    }
    closeKeyboard();
});

$.listenTo($.address, 'change', setAllTextFieldsValues);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.setAddress = setAddress;
exports.isValid = isValid;
exports.validate = validate;
exports.clearAllErrors = clearAllErrors;
exports.getAddress = getAddress;
exports.getAllTextFieldsInOrder = getAllTextFieldsInOrder;
exports.getAllFormFieldsInOrder = getAllFormFieldsInOrder;
exports.closeKeyboard = closeKeyboard;
exports.makeFieldsReadOnly = makeFieldsReadOnly;
exports.hasAnythingChanged = hasAnythingChanged;
exports.resetAddressSuggestionDismissedFlag = resetAddressSuggestionDismissedFlag;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(prepend, type) {
    logger.info('init called with prepend: ' + prepend + ' type: ' + type);
    addressPickedFromSuggestion = false;
    customId = type ? type : customId;
    clearAllErrors();
    countryInited = false;
    stateInited = false;
    // set all the accessibility labels as desired
    if (prepend) {
        al_prepend = prepend;
    }

    $.first_name_error.setAccessibilityLabel(al_prepend + 'first_name_error');
    $.last_name_error.setAccessibilityLabel(al_prepend + 'last_name_error');
    $.address1_error.setAccessibilityLabel(al_prepend + 'address1_error');
    $.phone_error.setAccessibilityLabel(al_prepend + 'phone_error');
    $.city_error.setAccessibilityLabel(al_prepend + 'city_error');
    if (viewLayoutData.hasState) {
        $.state_error.setAccessibilityLabel(al_prepend + 'state_error');
    }
    $.postal_code_error.setAccessibilityLabel(al_prepend + 'postal_code_error');
    if (addressAutocompleteController) {
        addressAutocompleteController.init();
        $.address1.addEventListener('change', displayAdrressAutocomplete);
        $.address1.addEventListener('blur', addressAutocompleteController.hideView);
        addressSuggestionsDismissed = false;
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    formMgr.deinit();
    $.countrySelectList.deinit();
    if ($.stateSelectList) {
        $.stateSelectList.deinit();
    }
    removeAllChildren($.address_window);

    _.each(formMgr.getAllTextFieldNames(), function(currentTextField) {
        if ($[currentTextField].required) {
            $[currentTextField].removeEventListener('change', validateAndFireEvent);
        }
    });

    if ($.state_picker_container) {
        $.state_picker_container.removeEventListener('autoFocus', onStatePickerAutoFocus);
        $.state_picker_container.removeEventListener('click', onStatePickerClick);
    }

    $.country_picker_container && $.country_picker_container.removeEventListener('autoFocus', onCountryPickerAutoFocus);

    if (addressAutocompleteController) {
        $.address1.removeEventListener('change', displayAdrressAutocomplete);
        $.address1.removeEventListener('blur', addressAutocompleteController.hideView);
        addressAutocompleteController.deinit();
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * onStatePickerAutoFocus - state picker gained focus
 *
 * @api private
 */
function onStatePickerAutoFocus() {
    if (enableStatePicker) {
        closeKeyboard();
        $.stateSelectList.continueAfterClick();
    } else {
        showStateErrorOnDisable(enableStatePicker);
    }
}

/**
 * onStatePickerClick - state picker clicked
 *
 * @api private
 */
function onStatePickerClick() {
    if (!enableStatePicker) {
        showStateErrorOnDisable(enableStatePicker);
    }
}

/**
 * onCountryPickerAutoFocus - country picker gained focus
 *
 * @api private
 */
function onCountryPickerAutoFocus() {
    closeKeyboard();
    $.countrySelectList.continueAfterClick();
}

/**
 * renderAddressView - renders the address form
 *
 * @api private
 */
function renderAddressView() {
    formMgr.renderAddressViewInContainer('address_window');

    if (EAUtils.isSymbolBasedLanguage()) {
        if ($.state_error) {
            $.state_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        }
        $.postal_code_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        $.city_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        $.phone_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        $.first_name_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        $.last_name_error.setFont(Alloy.Styles.smallestErrorMessageFont);
        $.address1_error.setFont(Alloy.Styles.smallestErrorMessageFont);
    }
    if (EAUtils.isLatinBasedLanguage()) {
        if ($.state_error) {
            $.state_error.setFont(Alloy.Styles.lineItemLabelFont);
        }
        $.postal_code_error.setFont(Alloy.Styles.lineItemLabelFont);
        $.city_error.setFont(Alloy.Styles.lineItemLabelFont);
        $.phone_error.setFont(Alloy.Styles.lineItemLabelFont);
        $.first_name_error.setFont(Alloy.Styles.lineItemLabelFont);
        $.last_name_error.setFont(Alloy.Styles.lineItemLabelFont);
        $.address1_error.setFont(Alloy.Styles.lineItemLabelFont);
    }
}

/**
 * setTextFieldsChangeEventHandlers - set change event for form textfields
 *
 * @api private
 */
function setTextFieldsChangeEventHandlers() {
    _.each(formMgr.getAllTextFieldNames(), function(currentTextField) {
        if ($[currentTextField].required) {
            $[currentTextField].addEventListener('change', validateAndFireEvent);
        }
    });
}

/**
 * setCountryPickerEventHandlers - country event listener
 *
 * @api private
 */
function setCountryPickerEventHandlers() {
    $.country_picker_container.addEventListener('autoFocus', onCountryPickerAutoFocus);
}

/**
 * showStateErrorOnDisable - shows an error when the state is disabled.
 *
 * @api private
 */
function showStateErrorOnDisable(isValid) {
    if (!isValid) {
        showError($.state_picker_container, $.state_error, errorMsgs.state_error, true);
    } else {
        clearError($.state_picker_container, $.state_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    }
}

/**
 * showStateNotSelectedError - shows an error when the state is not selected.
 *
 * @api private
 */
function showStateNotSelectedError(stateCode) {
    if (stateCode == null) {
        showError($.state_picker_container, $.state_error, errorMsgs.required_field_error, true);
    } else {
        clearError($.state_picker_container, $.state_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    }
}

/**
 * setStatePickerEventHandlers - state event listener
 *
 * @api private
 */
function setStatePickerEventHandlers() {
    $.state_picker_container.addEventListener('autoFocus', onStatePickerAutoFocus);
    $.state_picker_container.addEventListener('click', onStatePickerClick);
}

/**
 * isValid - make sure required fields are filled in and some sanity checking on format for certain
 * fields is done
 *
 * @api public
 */
function isValid() {
    if (getCountry() != null) {
        if (viewLayoutData.hasState) {
            var currentStateCode = getState();
            if (currentStateCode == null) {
                return false;
            }

        }

        var zip = getPostalCode();
        if (zip != null && zip != '') {
            return getFirstName() != '' && getLastName() != '' && getAddress1() != '' && getCity() != '' && isPostalCodeValid() && isPhoneValid();
        } else {
            return false;
        }
    } else {
        return false;
    }
}

/**
 * getState - get the state from the form
 *
 * @api private
 */
function getState() {
    return state_code;
}

/**
 * getCountry - get the country from the form
 *
 * @api private
 */
function getCountry() {
    return country_code;
}

/**
 * initializeCountryPicker - initialize the country picker
 *
 * @param setEventHandler {Boolean} flag indicating whether state picker event handlers should be added
 * @api private
 */
function initializeCountryPicker(setEventHandler) {
    var index = -1;
    if (customId == 'customer') {
        globalCountries = Alloy.Globals.customerGlobalCountries;
    } else if (customId == 'billing') {
        globalCountries = Alloy.Globals.billingGlobalCountries;
    } else {
        globalCountries = Alloy.Globals.shippingGlobalCountries;
    }
    if ($.address.getCountryCode()) {
        country_code = $.address.getCountryCode();
        index = _.indexOf(_.pluck(globalCountries, 'countryCode'), country_code);
    }

    if (!countryInited) {
        $.countrySelectList = Alloy.createController('components/selectWidget', {
            valueField : 'countryCode',
            textField : 'countryName',
            values : globalCountries,
            needsCallbackAfterClick : true,
            messageWhenSelection : '',
            messageWhenNoSelection : _L('Country*'),
            selectListTitleStyle : {
                accessibilityValue : 'input_country_picker',
                backgroundColor : Alloy.Styles.color.background.medium,
                font : Alloy.Styles.textFieldFont,
                color : Alloy.Styles.color.text.darkest,
                disabledColor : Alloy.Styles.color.text.light,
                disabledBackgroundColor : Alloy.Styles.color.background.light,
                width : 257,
                height : 50
            },
            selectListStyle : {
                width : 257,
                height : 50,
                top : 0,
                font : Alloy.Styles.textFieldFont,
                selectedFont : Alloy.Styles.textFieldFont,
                unselectedFont : Alloy.Styles.textFieldFont,
                color : Alloy.Styles.color.text.darkest,
                selectedOptionColor : Alloy.Styles.color.text.darkest,
                disabledColor : Alloy.Styles.color.text.light,
                backgroundColor : Alloy.Styles.color.background.medium,
                selectedOptionBackgroundColor : Alloy.Styles.color.background.light,
                disabledBackgroundColor : Alloy.Styles.color.background.light,
                border_color : Alloy.Styles.color.border.darker
            }
        });

        $.countrySelectList.setEnabled(true);
        removeAllViews($.country_picker_container);
        $.country_picker_container.add($.countrySelectList.getView());
        $.listenTo($.countrySelectList, 'itemSelected', function(event) {
            if (event.item) {
                countrySelected(event.item.countryCode);
            }
        });
        $.listenTo($.countrySelectList, 'dropdownSelected', function() {
            closeKeyboard();
            $.countrySelectList.continueAfterClick();
        });
        if (index >= 0) {
            $.countrySelectList.updateSelectedItem(globalCountries[index].countryCode);
            countrySelected(globalCountries[index].countryCode);
        }
        countryInited = true;
    } else {
        $.countrySelectList.updateSelectedItem(index > -1 ? globalCountries[index].countryCode : null);
        countrySelected(country_code);
    }
    if (setEventHandler) {
        setCountryPickerEventHandlers();
    }
}

/**
 * initializeStatePicker - initialize the state picker
 *
 * @param setEventHandler {Boolean} flag indicating whether state picker event handlers should be added
 * @api private
 */
function initializeStatePicker(setEventHandler) {
    if (customId == 'customer') {
        globalStates = Alloy.Globals.customerGlobalStates;
    } else if (customId == 'billing') {
        globalStates = Alloy.Globals.billingGlobalStates;
    } else {
        globalStates = Alloy.Globals.shippingGlobalStates;
    }
    var index = -1;
    var orig_country_code = country_code;
    country_code = country_code ? country_code : 'US';
    if ($.address.getStateCode()) {
        index = _.indexOf(_.pluck(globalStates[country_code], 'stateCode'), $.address.getStateCode());
        state_code = $.address.getStateCode();
    }
    var items = globalStates ? globalStates[country_code] : '';
    if (items && items.length == 1) {
        index = 0;
        state_code = items[0].stateCode;
    }

    if (!stateInited || old_country_code !== country_code) {
        $.stateSelectList = Alloy.createController('components/selectWidget', {
            valueField : 'stateCode',
            textField : 'stateName',
            values : items,
            messageWhenSelection : '',
            messageWhenNoSelection : _L('State*'),
            selectListTitleStyle : {
                accessibilityValue : 'input_state_picker',
                backgroundColor : Alloy.Styles.color.background.medium,
                font : Alloy.Styles.textFieldFont,
                color : Alloy.Styles.color.text.darkest,
                disabledColor : Alloy.Styles.color.text.light,
                width : 170,
                height : 50,
                top : 0,
                disabledBackgroundColor : Alloy.Styles.color.background.light
            },
            selectListStyle : {
                width : 170,
                height : 50,
                top : 0,
                font : Alloy.Styles.textFieldFont,
                selectedFont : Alloy.Styles.textFieldFont,
                unselectedFont : Alloy.Styles.textFieldFont,
                color : Alloy.Styles.color.text.darkest,
                selectedOptionColor : Alloy.Styles.color.text.darkest,
                disabledColor : Alloy.Styles.color.text.light,
                backgroundColor : Alloy.Styles.color.background.medium,
                selectedOptionBackgroundColor : Alloy.Styles.color.background.light,
                disabledBackgroundColor : Alloy.Styles.color.background.light,
                border_color : Alloy.Styles.color.border.darker
            },
            needsCallbackAfterClick : true,
        });

        $.stateSelectList.updateItems(items);
        $.stateSelectList.setEnabled(orig_country_code !== null && orig_country_code !== undefined && $.countrySelectList.getEnabled());
        removeAllViews($.state_picker_container);
        $.state_picker_container.add($.stateSelectList.getView());

        $.listenTo($.stateSelectList, 'itemSelected', function(event) {
            if (event.item) {
                stateSelected(event.item.stateCode);
            }
        });

        $.listenTo($.stateSelectList, 'dropdownSelected', function() {
            closeKeyboard();
            $.stateSelectList.continueAfterClick();
        });

        if (index >= 0) {
            $.stateSelectList.updateSelectedItem(items[index].stateCode);
        } else {
            state_code = null;
        }
        stateInited = true;
        old_country_code = country_code;
    } else {
        $.stateSelectList.updateSelectedItem(index > -1 ? items[index].stateCode : null);
        $.stateSelectList.setEnabled(country_code !== null && country_code !== undefined && $.countrySelectList.getEnabled());
        stateSelected(state_code);
    }
    if (setEventHandler) {
        setStatePickerEventHandlers();
    }
}

/**
 * validateAndFireEvent - fires a validation event
 *
 * @api private
 */
function validateAndFireEvent() {
    $.address_window.fireEvent('validation');
}

/**
 * countrySelected - enables the state and zip fields in the form once the country is selected
 *
 * @api private
 */
function countrySelected(countryCode) {
    country_code = countryCode;
    if (viewLayoutData.hasState) {
        initializeStatePicker();
        $.stateSelectList.setEnabled($.countrySelectList.getEnabled());
        enableStatePicker = true;
    }
    var currentZip = getPostalCode();
    if (currentZip && currentZip != '') {
        validatePostalCodeField();
    } else {
        clearError($.postal_code, $.postal_code_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    }
    validateAndFireEvent();
    if (addressPickedFromSuggestion) {
        fillFormAfterCountrySelection();
    }

}

/**
 * stateSelected - clears the error and fire a validation event on the form
 *
 * @api private
 */
function stateSelected(stateCode) {
    clearError($.state_picker_container, $.state_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    state_code = stateCode;
    validateAndFireEvent();
}

/**
 * setAddress - set the address layout
 *
 * @api public
 */
function setAddress(address) {
    previousValues = '';
    old_country_code = country_code;
    country_code = null;
    state_code = null;
    $.address.clear();
    clearAllErrors();
    if (address) {
        $.address.set(address.toJSON ? address.toJSON() : address);
    } else {
        $.address.trigger('change', $.address);
    }
    if (viewLayoutData.hasState) {
        if ($.address.getCountryCode()) {
            enableStatePicker = true;
        } else {
            enableStatePicker = false;
        }
    }

    initializeCountryPicker();
    if (!$.address.getCountryCode() && viewLayoutData.hasState) {
        initializeStatePicker();
    }

    if (!address && $.stateSelectList) {
        $.stateSelectList.setEnabled(false);
    }
    previousValues = formMgr.getAllFieldValues(null, [getCountry(), (viewLayoutData.hasState ? getState() : '')]);
}

/**
 * validate - validates if all the fields in the form are valid
 *
 * @api public
 */
function validate() {
    validatePostalCodeField();
    if (getFirstName() == '') {
        showError($.first_name, $.first_name_error, errorMsgs.required_field_error, true);
    }
    if (getLastName() == '') {
        showError($.last_name, $.last_name_error, errorMsgs.required_field_error, true);
    }
    if (getAddress1() == '') {
        showError($.address1, $.address1_error, errorMsgs.required_field_error, true);
    }
    if (getCity() == '') {
        showError($.city, $.city_error, errorMsgs.required_field_error, true);
    }
    if (viewLayoutData.hasState && getState() == null) {
        showError($.state_picker_container, $.state_error, errorMsgs.required_field_error, true);
    }
    validatePhoneField();
}

/**
 * clearAllErrors - clear all the errors in the form
 *
 * @api public
 */
function clearAllErrors() {
    formMgr.clearAllErrors();
    if (viewLayoutData.hasState) {
        clearError($.state_picker_container, $.state_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    }
}

/**
 * clearAddressError - clear errors (if any) on address autofill
 *
 * @api private
 */
function clearAddressError() {
    if (viewLayoutData.hasState) {
        clearError($.state_picker_container, $.state_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    }
    clearError($.address1, $.address1_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    clearError($.postal_code, $.postal_code_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
    clearError($.city, $.city_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
}

/**
 * hasAnythingChanged - check if anything has changed in the address form
 *
 * @return {Boolean} true if anything in the form changed by the user
 * @api public
 */
function hasAnythingChanged() {
    return formMgr.hasAnythingChanged(null, previousValues, [getCountry(), (viewLayoutData.hasState ? getState() : '')]);
}

/**
 * getAddress - get the address
 *
 * @api public
 */
function getAddress() {
    return {
        first_name : getFirstName(),
        last_name : getLastName(),
        postal_code : getPostalCode(),
        address1 : getAddress1(),
        address2 : getAddress2(),
        city : getCity(),
        country_code : getCountry(),
        state_code : (viewLayoutData.hasState ? getState() : undefined),
        phone : getPhone()
    };
}

/**
 * getAllTextFieldsInOrder - get all the text fields in order
 *
 * @api public
 */
function getAllTextFieldsInOrder() {
    return formMgr.getAllTextFields();
}

/**
 * getAllFormFieldsInOrder - get all the enabled fields in order
 *
 * @api public
 */
function getAllFormFieldsInOrder() {
    var fields = [];
    // go through all the field names. Those that are not in the read only list should be returned
    _.each(formMgr.getAllFormFieldNames(), function(name) {
        if (readOnlyFields.indexOf(name) < 0) {
            fields.push($[name]);
        }
    });
    return fields;
}

/**
 * makeFieldsReadOnly - set the read only status of the supplied fields
 *
 * @param {Array} fields - the field names of the fields to change
 * @param {Boolean} readOnly - the read only state to set for the fields
 *
 * @api public
 */
function makeFieldsReadOnly(fields, readOnly) {
    _.each(fields, function(fieldName) {
        if ($[fieldName]) {
            var field = $[fieldName];
            if (!readOnly) {
                // remove the field name from the list of read only fields
                readOnlyFields = _.without(readOnlyFields, fieldName);
            } else {
                // add the field name to the list of read only fields
                if (readOnlyFields.indexOf(fieldName) < 0) {
                    readOnlyFields.push(fieldName);
                }
            }
            var type = getUIObjectType(field);
            if (type === 'TextField') {
                field.setEditable(!readOnly);
                var color = readOnly ? viewLayoutData.addressForm.styles.class.text_field.disabledColor : viewLayoutData.addressForm.styles.class.text_field.color;
                var backgroundColor = readOnly ? viewLayoutData.addressForm.styles.class.text_field.disabledBackgroundColor : viewLayoutData.addressForm.styles.class.text_field.backgroundColor;
                field.setColor(color);
                field.setBackgroundColor(backgroundColor);
            } else {
                field.setEnabled(!readOnly);
            }
            // make the state field not enabled if it's supposed to be read only
            if (fieldName.indexOf('state') >= 0 && readOnly) {
                enableStatePicker = false;
            }
        }
    });
}

/**
 * TRANSFORM
 *
 * @api private
 */
function transform() {
    return {
        first_name : $.address.getFirstName() || '',
        last_name : $.address.getLastName() || '',
        postal_code : $.address.getPostalCode() || '',
        address1 : $.address.getAddress1() || '',
        address2 : $.address.getAddress2() || '',
        city : $.address.getCity() || '',
        country_code : $.address.getCountryCode() || '',
        state_code : (viewLayoutData.hasState ? $.address.getStateCode() || '' : undefined),
        phone : $.address.getPhone() || ''
    };
}

/**
 * displayAdrressAutocomplete - displays the view with address suggestion
 *
 * @api private
 */
function displayAdrressAutocomplete() {
    if (!addressAutocompleteController) {
        return;
    }
    if (addressSuggestionsDismissed) {
        return;
    }
    if ($.address1.getValue().length == 0) {
        addressAutocompleteController.hideView();
    }
    if ($.address1.getValue().length > 2 || addressAutocompleteController.isVisible()) {
        clearTimeout(googlePlacesApiTimer);
        googlePlacesApiTimer = setTimeout(function() {
            googlePlaces.autoComplete({
                input : $.address1.getValue(),
                language : Alloy.CFG.languageSelected
            }, globalCountries).done(function() {
                addressAutocompleteController.showView(customId);
                clearTimeout(googlePlacesApiTimer);
            });
        }, 500);
    } else {
        addressAutocompleteController.hideView();
    }
}

/**
 * fillAddressCountry - fills the address form with the country of address picked from suggestions
 *
 * @api private
 */
function fillAddressCountry() {
    addressPickedFromSuggestion = true;
    if ($.countrySelectList) {
        $.countrySelectList.updateSelectedItem(googleAddressDetails.getCountryCode());
    }
}

/**
 * fillFormAfterCountrySelection - fills remaining address form after country selection with address picked from suggestions
 *
 * @api private
 */
function fillFormAfterCountrySelection() {
    $.address1.setValue(googleAddressDetails.getName());
    if ($.city) {
        $.city.setValue(googleAddressDetails.getVicinity());
    }
    if ($.postal_code) {
        $.postal_code.setValue(googleAddressDetails.getPostalCode());
    }
    if ($.stateSelectList) {
        $.stateSelectList.updateSelectedItem(googleAddressDetails.getStateCode());
    }
    addressPickedFromSuggestion = false;
    clearAddressError();
}

/**
 * resetAddressSuggestionDismissedFlag - reset the flag that check user dismissed suggestions
 *
 * @api public
 */
function resetAddressSuggestionDismissedFlag() {
    addressSuggestionsDismissed = false;
}

//---------------------------------------------------
// ## CONSTRUCTOR

renderAddressView();
setAllTextFieldsValues($.address);
setTextFieldsChangeEventHandlers();
