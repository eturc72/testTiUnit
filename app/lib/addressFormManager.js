// ©2017 salesforce.com, inc. All rights reserved.
/**
 * lib/addressFormManager.js - a collection of useful funtionalities to build address forms in
 * the Endless Aisle application
 */

var showError = require('EAUtils').showError;
var clearError = require('EAUtils').clearError;
var removeAllViews = require('EAUtils').removeAllViews;
var getUIObjectType = require('EAUtils').getUIObjectType;
var logger = require('logging')('addressFormManager', 'app/lib/addressFormManager');

//---------------------------------------------------
// ## FUNCTIONS

/**
 * addressFormManager - Constructor of class address form manager (addressFormManager)
 * @param  {Object} args - all required objects
 *
 */
function addressFormManager(args) {
    if (!args || !args.viewLayoutData || !args.$) {
        logger.error('Invalid arguments passed to form builder');
        return;
    }

    //---------------------------------------------------
    // ## VARIABLES

    var getCountry;
    var getState;
    var $ = args.$;
    var viewLayoutData = args.viewLayoutData;
    var errorMsgs = viewLayoutData.addressForm.error_messages;
    var initializeCountryPicker = args.initializeCountryPicker;
    var initializeStatePicker = args.initializeStatePicker;
    var textFields = [];
    var textFieldNames = [];
    var formFields = [];
    var formFieldNames = [];

    // Set custom functions if they are passed
    if (args.getterFunctionsForCustomFields) {
        if (_.isFunction(args.getterFunctionsForCustomFields.getCountry)) {
            getCountry = args.getterFunctionsForCustomFields.getCountry;
        }
        if (_.isFunction(args.getterFunctionsForCustomFields.getState)) {
            getState = args.getterFunctionsForCustomFields.getState;
        }
    }

    //---------------------------------------------------
    // ## PUBLIC API

    this.renderAddressViewInContainer = renderAddressViewInContainer;
    this.deinit = deinit;
    this.closeKeyboard = closeKeyboard;
    this.getPhone = getPhone;
    this.getPostalCode = getPostalCode;
    this.getAddress2 = getAddress2;
    this.getAddress1 = getAddress1;
    this.getLastName = getLastName;
    this.getFirstName = getFirstName;
    this.getCity = getCity;
    this.validatePhoneField = validatePhoneField;
    this.validatePostalCodeField = validatePostalCodeField;
    this.validateEmailAddressField = validateEmailAddressField;
    this.getAllTextFields = getAllTextFields;
    this.getAllTextFieldNames = getAllTextFieldNames;
    this.getAllFormFields = getAllFormFields;
    this.getAllFormFieldNames = getAllFormFieldNames;
    this.clearAllErrors = clearAllErrors;
    this.setAllTextFieldsValues = setAllTextFieldsValues;
    this.isPostalCodeValid = isPostalCodeValid;
    this.isPhoneValid = isPhoneValid;
    this.showHideError = showHideError;
    this.isEmailAddressValid = isEmailAddressValid;
    this.getEmailAddress = getEmailAddress;
    this.getAllFieldValues = getAllFieldValues;
    this.hasAnythingChanged = hasAnythingChanged;

    /**
     * DEINIT
     *
     * @api public
     */
    function deinit() {
        unsetTextFieldsBlurEventHandlers();
        unsetOnReturnEventsHandlers();
        viewLayoutData = null;
        errorMsgs = null;
        $ = null;
        initializeCountryPicker = null;
        initializeStatePicker = null;
        textFields = null;
        textFieldNames = null;
        formFields = null;
        formFieldNames = null;
        getCountry = null;
        getState = null;
    }

    /**
     * setAllTextFieldsValues - set value of all form textfields
     * @param {Object} addressModel
     *
     * @api public
     */
    function setAllTextFieldsValues(addressModel) {
        if ( addressModel instanceof Backbone.Model) {
            _.each(textFieldNames, function(name) {
                if (addressModel.get(name)) {
                    $[name].setValue(addressModel.get(name));
                } else {
                    $[name].setValue('');
                }
            });
        }
    }

    /**
     * clearAllErrors - Clear error labels from form
     *
     * @api public
     */
    function clearAllErrors() {
        _.each(formFieldNames, function(currentfield) {
            if ($[currentfield + '_error']) {
                clearError($[currentfield], $[currentfield + '_error'], ($[currentfield].originalBorderColor || Alloy.Styles.color.text.lightest), ($[currentfield].originalBackgroundColor || Alloy.Styles.color.text.lightest), true);
            }
        });
    }

    /**
     * getAllTextFields - return all text field in the form
     * @return {Array} textFields - array of text fields
     *
     * @api public
     */
    function getAllTextFields() {
        return textFields;
    }

    /**
     * getAllTextFieldNames - return all text field names in the form
     * @return {Array} textFieldNames - array of strings
     *
     * @api public
     */
    function getAllTextFieldNames() {
        return textFieldNames;
    }

    /**
     * getAllFormFields - return all form field in the form
     * @return {Array} formFields - array of form fields
     *
     * @api public
     */
    function getAllFormFields() {
        return formFields;
    }

    /**
     * getAllFormFieldNames - return all form field names in the form
     * @return {Array} textFields - array of strings
     *
     * @api public
     */
    function getAllFormFieldNames() {
        return formFieldNames;
    }

    /**
     * saveFormElement - keeps track  of all textfields and other form elements in the address form
     * @param {String} elementName
     * @param {String} elementType
     *
     * @api private
     */
    function saveFormElement(elementName, elementType) {
        if (elementType == 'TextField') {
            textFields.push($[elementName]);
            textFieldNames.push(elementName);
        }
        if (elementType == 'TextField' || elementType == 'View') {
            formFields.push($[elementName]);
            formFieldNames.push(elementName);
        }
    }

    /**
     * applyClass - apply class to UI object
     * @param {String} UIObjectName - UI object name
     * @param {Array} classArray - Array of classes
     *
     * @api private
     */
    function applyClass(UIObjectName, classArray) {
        if (Object.prototype.toString.apply(classArray) === '[object Array]') {
            _.each(classArray, function(className, index, list) {
                if (viewLayoutData.addressForm.styles.class[className]) {
                    _.extend($[UIObjectName], viewLayoutData.addressForm.styles.class[className]);
                }
            });
        }
    }

    /**
     * applySingleStyle - apply single style to UI object
     * @param {String} UIObjectName - UI object name
     *
     * @api private
     */
    function applySingleStyle(UIObjectName) {
        if (viewLayoutData.addressForm.styles.id[UIObjectName]) {
            _.extend($[UIObjectName], viewLayoutData.addressForm.styles.id[UIObjectName]);
        }
    }

    /**
     * createAddressLineContainerView - render a  line in the address field
     * @param {Object} viewObj - View object
     *
     * @api private
     */
    function createAddressLineContainerView(viewObj) {
        $[viewObj.name] = Ti.UI['create' + viewObj.type]();
        applyClass(viewObj.name, viewObj.class);
        applySingleStyle(viewObj.name);
        if (Object.prototype.toString.apply(viewObj.content) === '[object Array]') {
            _.each(viewObj.content, function(currentContent, index, list) {
                switch (currentContent.type) {
                case 'View':
                    createAddressLineContainerView(currentContent);
                    $[viewObj.name].add($[currentContent.name]);
                    break;
                case 'CountryPicker':
                    if (_.isFunction(initializeCountryPicker)) {
                        initializeCountryPicker(true);
                        saveFormElement(viewObj.name, viewObj.type);
                    }

                    break;
                case 'StatePicker':
                    if (_.isFunction(initializeStatePicker)) {
                        initializeStatePicker(true);
                        saveFormElement(viewObj.name, viewObj.type);
                    }
                    break;
                default:
                    $[currentContent.name] = Ti.UI['create' + currentContent.type]();
                    saveFormElement(currentContent.name, currentContent.type);
                    applyClass(currentContent.name, currentContent.class);
                    applySingleStyle(currentContent.name);
                    $[currentContent.name].name = currentContent.name;
                    $[viewObj.name].add($[currentContent.name]);
                    break;
                }
            });
        }
    }

    /**
     * renderAddressViewInContainer - renders the address form
     * @param {String} containerViewId - form container view id
     *
     * @api public
     */
    function renderAddressViewInContainer(containerViewId) {
        if (containerViewId) {
            _.each(viewLayoutData.addressForm.lines, function(currentLine, index, list) {
                createAddressLineContainerView(currentLine);
                $[containerViewId].add($[currentLine.name]);
            });
            setTextFieldsBlurEventHandlers();
            setOnReturnEventsHandlers();
        }
    }

    /**
     * setTextFieldsBlurEventHandlers - set blur event for form textfields
     *
     * @api private
     */
    function setTextFieldsBlurEventHandlers() {
        _.each(textFieldNames, function(currentTextField) {
            if ($[currentTextField].required && !$[currentTextField].hasSpecificOnBlurValidationFunction) {
                $[currentTextField].addEventListener('blur', onTextFieldBlurEvent);
            }
        });
        // set specific validations on blur
        if ($.postal_code) {
            $.postal_code.addEventListener('blur', onPostalCodeBlur);
        }
        if ($.phone) {
            $.phone.addEventListener('blur', onPhoneBlur);
        }
        if ($.email_address) {
            $.email_address.addEventListener('blur', onEmailAddressBlur);
        }
    }

    /**
     * unsetTextFieldsBlurEventHandlers - remove blur event for form text fields
     *
     * @api private
     */
    function unsetTextFieldsBlurEventHandlers() {
        _.each(textFieldNames, function(currentTextField) {
            if ($[currentTextField].required && !$[currentTextField].hasSpecificOnBlurValidationFunction) {
                $[currentTextField].removeEventListener('blur', onTextFieldBlurEvent);
            }
        });
        // set specific validations on blur
        if ($.postal_code) {
            $.postal_code.removeEventListener('blur', onPostalCodeBlur);
        }
        if ($.phone) {
            $.phone.removeEventListener('blur', onPhoneBlur);
        }
        if ($.email_address) {
            $.email_address.removeEventListener('blur', onEmailAddressBlur);
        }
    }

    /**
     * onTextFieldBlurEvent - Adding or removing errors based on the value of the textfield.
     *
     * @param {Object} evt the event
     * @api private
     */
    function onTextFieldBlurEvent(evt) {
        var currentTextField = evt.source.name;

        if (!$[currentTextField] || !$[currentTextField + '_error']) {
            return;
        }
        if (evt.source.getValue().trim() === '') {
            showError($[currentTextField], $[currentTextField + '_error'], (errorMsgs[currentTextField + '_error'] ? errorMsgs[currentTextField + '_error'] : errorMsgs.required_field_error), true);
        } else {
            clearError($[currentTextField], $[currentTextField + '_error'], Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, true);
        }
    }

    /**
     * onPostalCodeBlur - postal code loses focus
     *
     * @api private
     */
    function onPostalCodeBlur() {
        validatePostalCodeField();
    }

    /**
     * onEmailAddressBlur - Email address loses focus
     *
     * @api private
     */
    function onEmailAddressBlur() {
        validateEmailAddressField();
    }

    /**
     * onPhoneBlur - phone field loses focus
     *
     * @api private
     */
    function onPhoneBlur() {
        validatePhoneField();
    }

    /**
     * isPostalCodeValid - checks if the postal code is valid
     *
     * @api private
     */
    function isPostalCodeValid() {
        if (!_.isFunction(getCountry)) {
            return;
        }
        // Enhanced Postal code validation
        var zip = getPostalCode();

        var country_code = getCountry();
        var regex = Alloy.CFG.regexes.postal_code[country_code];
        var postal_regex = new RegExp(regex, 'i');

        if ((postal_regex && zip && zip !== '' && postal_regex.test(zip)) || !postal_regex) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * showHideZipError - shows or hide the zip code error based on if its valid
     *
     * @api private
     */
    function showHideZipError(isValid) {
        if (!$.postal_code || !$.postal_code_error) {
            return;
        }
        if (isValid) {
            clearError($.postal_code, $.postal_code_error, ($.postal_code.originalBorderColor || Alloy.Styles.color.text.lightest), ($.postal_code.originalBackgroundColor || Alloy.Styles.color.text.lightest), true);
        } else {
            showError($.postal_code, $.postal_code_error, (errorMsgs.postal_code_error || errorMsgs.required_field_error), true);
        }
    }

    /**
     * showHideEmailError - shows or hide the eamil address error based on if its valid
     *
     * @api private
     */
    function showHideEmailError(isValid) {
        if (!$.email_address || !$.email_address_error) {
            return;
        }
        if (isValid) {
            clearError($.email_address, $.email_address_error, ($.email_address.originalBorderColor || Alloy.Styles.color.text.lightest), ($.email_address.originalBackgroundColor || Alloy.Styles.color.text.lightest), true);
        } else {
            showError($.email_address, $.email_address_error, (errorMsgs.email_address_error || errorMsgs.required_field_error), true);
        }
    }

    /**
     * isPhoneValid - checks if the phone is valid
     *
     * @api public
     */
    function isPhoneValid() {
        if (!_.isFunction(getCountry)) {
            return false;
        }
        var phoneRegex = new RegExp(Alloy.CFG.regexes.phone[getCountry()], 'i');
        var phoneNumber = getPhone();
        if (phoneNumber && phoneRegex && phoneNumber !== '' && phoneRegex.test(phoneNumber)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * isEmailAddressValid - validate the email address
     *
     * @api public
     */
    function isEmailAddressValid() {
        var emailRegex = new RegExp(Alloy.CFG.regexes.email, 'i');
        var email = getEmailAddress();
        if (email && emailRegex && email !== '' && emailRegex.test(email)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * validateEmailAddressField - Validate email address text field and show error label when email text is invalid
     *
     * @api public
     */
    function validateEmailAddressField() {
        var isValid = isEmailAddressValid();
        showHideEmailError(isValid);
        return isValid;
    }

    /**
     * validatePostalCodeField - Validate poatal code text field and show error label when email text is invalid
     *
     * @api public
     */
    function validatePostalCodeField() {
        var isValid = isPostalCodeValid();
        showHideZipError(isValid);
        return isValid;
    }

    /**
     * validatePhoneField - Validate phone text field and show error label when email text is invalid
     *
     * @api public
     */
    function validatePhoneField() {
        var isValid = isPhoneValid();
        showHidePhoneError(isValid);
        return isValid;
    }

    /**
     * showHidePhoneError - shows or hide the phone error based on if its valid
     *
     * @api private
     */
    function showHidePhoneError(isValid) {
        if (!$.phone || !$.phone_error) {
            return;
        }
        if (isValid) {
            clearError($.phone, $.phone_error, ($.phone_error.originalBorderColor || Alloy.Styles.color.text.lightest), ($.phone_error.originalBackgroundColor || Alloy.Styles.color.text.lightest), true);
        } else {
            showError($.phone, $.phone_error, (errorMsgs.phone_error || errorMsgs.required_field_error), true);
        }
    }

    /**
     * showHideError - shows or hide the error field based on if isValid is true or false
     *
     * @api private
     */
    function showHideError(fieldId, isValid, message) {
        if (!fieldId || !_.isString(fieldId) || !$[fieldId] || !$[fieldId + '_error']) {
            return false;
        }
        if (isValid) {
            clearError($[fieldId], $[fieldId + '_error'], ($[fieldId].originalBorderColor || Alloy.Styles.color.text.lightest), ($[fieldId].originalBackgroundColor || Alloy.Styles.color.text.lightest), true);
        } else {
            showError($[fieldId], $[fieldId + '_error'], (message || errorMsgs[fieldId + '_error'] || errorMsgs.required_field_error), true);
        }
        return isValid;
    }

    /**
     * getFirstName - get the first name from the form
     *
     * @api public
     */
    function getFirstName() {
        if ($.first_name) {
            return $.first_name.getValue().trim();
        }
    }

    /**
     * getLastName - get the last name from the form
     *
     * @api public
     */
    function getLastName() {
        if ($.last_name) {
            return $.last_name.getValue().trim();
        }

    }

    /**
     * getAddress1 - get the address1 from the form
     *
     * @api public
     */
    function getAddress1() {
        if ($.address1) {
            return $.address1.getValue().trim();
        }
    }

    /**
     * getAddress2 - get the address2 from the form
     *
     * @api public
     */
    function getAddress2() {
        if ($.address2) {
            return $.address2.getValue().trim();
        }

    }

    /**
     * getCity - get the city from the form
     *
     * @api public
     */
    function getCity() {
        if ($.city) {
            return $.city.getValue().trim();
        }
    }

    /**
     * getPostalCode - get the postal code from the form
     *
     * @api public
     */
    function getPostalCode() {
        if ($.postal_code) {
            return $.postal_code.getValue().trim();
        }
    }

    /**
     * getPhone - get the phone from the form
     *
     * @api public
     */
    function getPhone() {
        if ($.phone) {
            return $.phone.getValue().trim();
        }
    }

    /**
     * getEmailAddress - get the email address from the form
     *
     * @api public
     */
    function getEmailAddress() {
        if ($.email_address) {
            return $.email_address.getValue().trim();
        }
    }

    /**
     * closeKeyboard - close the keyboard
     *
     * @api public
     */
    function closeKeyboard() {
        _.each(textFields, function(textField) {
            textField.blur();
        });
    }

    /**
     * handleReturn - Handle return event for text field
     * @param  {Object} event
     *
     * @api private
     */
    function handleReturn(event) {
        if (event.source.name) {
            var index = _.indexOf(formFieldNames, event.source.name);
            index++;
            if (index <= (formFields.length - 1)) {
                if (getUIObjectType(formFields[index]) === 'TextField') {
                    formFields[index].focus();
                } else {
                    formFields[index].fireEvent('autoFocus');
                }

            }
        }

    }

    /**
     * setOnReturnEventsHandlers - set form fields blur event listener
     *
     * @api private
     */
    function setOnReturnEventsHandlers() {
        _.each(formFields, function(field, index) {
            var nextIdx = index + 1;
            if (nextIdx <= (formFields.length - 1) && !field.noGenericReturnEvent && (getUIObjectType(field) === 'TextField')) {
                field.addEventListener('return', handleReturn);
            }
        });
    }

    /**
     * unsetOnReturnEventsHandlers - remove form fields blur event listener
     *
     * @api private
     */
    function unsetOnReturnEventsHandlers() {
        _.each(formFields, function(field, index) {
            var nextIdx = index + 1;
            if (nextIdx <= (formFields.length - 1) && !field.noGenericReturnEvent && (getUIObjectType(field) === 'TextField')) {
                field.removeEventListener('return', handleReturn);
            }
        });
    }

    /**
     * hasAnythingChanged - to check if the address has been changed
     *
     * @param tfields the fields to check
     * @param previousValues the values before any changes
     * @param params additional parameters
     * @return {Boolean} true if anything in the form changed by the user
     *
     * @api public
     */
    function hasAnythingChanged(tfields, previousValues, params) {
        var currentValues = getAllFieldValues(tfields, params);
        return (previousValues.trim() !== currentValues.trim());
    }

    /**
     * getAllFieldValues - get the values of all the fields
     *
     * @param {Array} tfields
     * @param {Array} params
     * @api public
     */
    function getAllFieldValues(tfields, params) {
        var currentValues = '';
        _.each(tfields != null ? tfields : getAllTextFields(), function(field) {
            if (tfields != null) {
                currentValues = currentValues + $[field].getValue();
            } else {
                currentValues = currentValues + field.getValue();
            }

        });
        _.each(params, function(parameter) {
            currentValues = currentValues + parameter;
        });
        return currentValues;
    }

}

//---------------------------------------------------
// ## CONSTRUCTOR

/**
 * exports - Instantiator of addressFormBuilder
 * @param  {Object} args - all required arguments
 * @return {Object} - New instance of addressFormBuilder
 *
 * @api public
 */
module.exports = function(args) {
    return (new addressFormManager(args));
};
