// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/enterAddress.js - Form to enter an address
 */

//----------------------------------------------
// ## VARIABLES

var EAUtils = require('EAUtils');
var showError = EAUtils.showError;
var clearError = EAUtils.clearError;
var getAddressNickname = EAUtils.getAddressNickname;
var logger = require('logging')('checkout:address:enterAddress', getFullControllerPath($.__controllerPath));

var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;
var shoppingAsCustomer = false;
var originalAddressName = null;
var addressType = '';
var differentStorePickup = false;

var email_regex = new RegExp(Alloy.CFG.regexes.email, 'i');
var textFields = [];
var isShipToStore = false;
var editingAddress = false;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToCurrentStore', handleShipToStore);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToAddress', handleShipToAddress);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:differentStorePickupAddress', handleDifferentStorePickupAddress);
$.listenTo(Alloy.eventDispatcher, 'cart_cleared', clearPreviousSelections);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.next_button.addEventListener('click', onNextButtonClick);

$.email_address.addEventListener('return', nextButtonValidation);

$.enter_address_dynamic.getView().addEventListener('validation', nextButtonValidation);

$.email_address.addEventListener('blur', nextButtonValidation);

$.email_address.addEventListener('change', onEmailAddressChange);

$.nickname_text_field.addEventListener('change', nextButtonValidation);

$.address_book_switch.addEventListener('change', nextButtonValidation);

$.back_to_address_button.addEventListener('click', onBackClick);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentCustomer, 'change', function() {
    var customer_no = currentCustomer.getCustomerNumber();
    // if there is no customer, there cannot be an address book to get and store saved addresses, so hide
    // certain UI elements (the nickname field and the save to address book switch)
    initView(customer_no);
    if (!customer_no) {
        // clear out the old data that may be hanging around
        setEmailValue('');
        $.enter_address_dynamic.setAddress(null);
    }
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.emailError = emailError;
exports.updateAddress = updateAddress;
exports.saveNewAddress = saveNewAddress;
exports.closeKeyboard = closeKeyboard;
exports.hasAnythingChanged = hasAnythingChanged;
var emailValue = '';
//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {String} type (either 'billing' or 'shipping')
 * @api public
 */
function init(type) {
    logger.info(type + ' init called');
    addressType = type;
    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    // this is to set accessibility labels on all the components in the enter address component
    $.enter_address_dynamic.init(addressType + '_address_', addressType);
    $.next_button.setAccessibilityValue(addressType + '_enter_address_next_btn');
    // if billing address type then hide the email address
    if (addressType === 'billing') {
        $.email_address.setHeight(0);
        $.email_address.hide();
        $.email_error.setHeight(0);
        $.email_error.hide();
    }
}

/**
 * RENDER
 *
 * @param {Object} address - what to fill in the fields with
 * @param {String} email - fill in the email address with this
 * @param {Boolean} isShipToStoreSelected -  flag indicating if ship to store is selected
 * @api public
 */
function render(address, email, isShipToStoreSelected) {
    logger.info(addressType + ' render called');
    clearErrors();
    initView(currentCustomer.getCustomerNumber());

    // if an address is passed in, fill in the form with that data
    if (address) {
        initWithAddress(address, email);
    } else {
        initWithoutAddress(isShipToStoreSelected);
    }
    resetToolbar();
    $.next_button.setEnabled(isValid());
    $.enter_address_dynamic.resetAddressSuggestionDismissedFlag();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info(addressType + ' deinit called');
    $.toolbar && $.toolbar.deinit();
    $.enter_address_dynamic.deinit();
    $.next_button.removeEventListener('click', onNextButtonClick);
    $.email_address.removeEventListener('return', nextButtonValidation);
    $.email_address.removeEventListener('blur', nextButtonValidation);
    $.enter_address_dynamic.getView().removeEventListener('validation', nextButtonValidation);
    $.email_address.removeEventListener('change', onEmailAddressChange);
    $.nickname_text_field.removeEventListener('change', nextButtonValidation);
    $.address_book_switch.removeEventListener('change', nextButtonValidation);
    $.back_to_address_button.removeEventListener('click', onBackClick);
    textFields = [];
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * emailError - shows email error label
 *
 * @api public
 */
function emailError() {
    showError($.email_address, $.email_error, _L('Invalid email address.'), false);
}

/**
 * updateAddress - updates the address on the form
 *
 * @param {Object} newAddress
 * @api public
 */
function updateAddress(newAddress) {
    logger.info(addressType + ' updateAddress called address: ' + JSON.stringify(newAddress));
    $.enter_address_dynamic.setAddress(newAddress);
}

/**
 * saveNewAddress - saves the address to the customer
 *
 * @param {Object} newAddress
 * @api public
 */
function saveNewAddress(newAddress) {
    if ($.customer_action_container.getVisible() && $.address_book_switch.getValue()) {
        logger.info(addressType + ' saving customer address');
        var currentAddress = currentCustomer.addresses;
        var nickname = getNickname(newAddress.city, newAddress.state_code);
        newAddress.address_id = nickname;
        newAddress.original_id = (nickname != originalAddressName) ? originalAddressName : nickname;
        if (editingAddress) {
            currentAddress.updateAddress(newAddress, currentCustomer.getCustomerId(), {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }, {}, false).fail(function() {
                notify(_L('Could not save customer address data!'), {
                    preventAutoClose : true
                });
            });
        } else {
            currentAddress.createAddress(newAddress, currentCustomer.getCustomerId(), {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }, {}, false).fail(function() {
                notify(_L('Could not save customer address data!'), {
                    preventAutoClose : true
                });
            });
        }
    }
}

/**
 * closeKeyboard - closes the form keyboard
 *
 * @api public
 */
function closeKeyboard() {
    $.enter_address_dynamic.closeKeyboard();
    $.email_address.blur();
    $.nickname_text_field.blur();
}

/**
 * initView - init the view based on if the customer is logged in or not
 *
 * @param {Boolean} isCustomer
 * @api private
 */
function initView(isCustomer) {
    logger.info(addressType + ' initView');
    if (isCustomer) {
        showSaveCustomerAddress();
        shoppingAsCustomer = true;
    } else {
        hideSaveCustomerAddress(true);
        shoppingAsCustomer = false;
    }
}

/**
 * initWithoutAddress - initialize the form without an address
 *
 * @param {Boolean} isShipToStoreSelected - flag indicating if ship to store is selected
 * @api private
 */
function initWithoutAddress(isShipToStoreSelected) {
    logger.info(addressType + ' Entered initWithoutAddress()');
    isShipToStore = isShipToStoreSelected;
    var address = currentBasket.getAddress(addressType);

    if (!isShipToStoreSelected && address) {
        if (addressType === 'shipping' && (currentBasket.getShipToStore() || currentBasket.getDifferentStorePickup())) {
            // If ship here or pick up elsewhere we only want to fill the first, last, phone as the address will come from the store
            $.enter_address_dynamic.setAddress({
                first_name : address.getFirstName(),
                last_name : address.getLastName(),
                phone : address.getPhone()
            });
        } else {
            $.enter_address_dynamic.setAddress(address);
        }
    } else {
        $.enter_address_dynamic.setAddress(address);
    }

    // if there's an address in the basket, use it

    if ($.email_address.getVisible()) {
        if (currentBasket.getCustomerInfo()) {
            setEmailValue(currentBasket.getCustomerEmail());
        } else {
            setEmailValue('');
        }

        // this will reset the error on the email address if it exists
        getEmailAddress();
        emailValue = $.email_address.getValue();
    }

    $.next_button.show();

    if (addressType === 'shipping') {
        if (currentBasket.getShipToStore() && isShipToStoreSelected) {
            $.enter_address_dynamic.makeFieldsReadOnly(['address1', 'address2', 'postal_code', 'city', 'countrySelectList', 'stateSelectList', 'state_picker_container', 'country_picker_container'], true);
        } else {
            $.enter_address_dynamic.makeFieldsReadOnly(['address1', 'address2', 'postal_code', 'city', 'countrySelectList', 'stateSelectList', 'state_picker_container', 'country_picker_container'], false);
            if (!address) {
                // when switching back from ship to store, the state select list still needs to be read only until the country is selected
                $.enter_address_dynamic.makeFieldsReadOnly(['stateSelectList'], true);
            }
        }
    }
}

/**
 * initWithAddress - init the form with a supplied address and email
 *
 * @param {Address} address
 * @param {String} email
 * @api private
 */
function initWithAddress(address, email) {
    logger.info(addressType + ' init with address');
    $.enter_address_dynamic.setAddress(address);
    if ($.email_address.getVisible()) {
        setEmailValue(email);
    }
    // if the address has an address name, this is for a registered customer
    var addressName = address.getAddressId();
    if (addressName) {
        editingAddress = true;
        $.nickname_text_field.setValue(addressName);
        $.save_address_label.setText(_L('Update Address in Profile'));
        originalAddressName = (addressName);
    } else {
        originalAddressName = null;
        editingAddress = false;
        $.nickname_text_field.setValue('');
        $.save_address_label.setText(_L('Save Address to Profile'));
    }
    // if editing the store's address, not everything should be shown and not all fields should be editable
    if (address.isShipToStoreAddress()) {
        hideSaveCustomerAddress(true);
        $.enter_address_dynamic.makeFieldsReadOnly(['address1', 'address2', 'postal_code', 'city', 'countrySelectList', 'stateSelectList', 'state_picker_container', 'country_picker_container'], true);
        isShipToStore = true;
    } else {
        $.enter_address_dynamic.makeFieldsReadOnly(['address1', 'address2', 'postal_code', 'city', 'countrySelectList', 'stateSelectList', 'state_picker_container', 'country_picker_container'], false);
        if (!address || !address.getStateCode()) {
            // when switching back from ship to store, the state select list still needs to be read only until the country is selected
            $.enter_address_dynamic.makeFieldsReadOnly(['stateSelectList'], true);
        }
        isShipToStore = false;
        emailValue = $.email_address.getValue();
    }

}

/**
 * getCurrentAddress - get the current address from the form
 *
 * @api private
 */
function getCurrentAddress() {
    return $.enter_address_dynamic.getAddress();
}

/**
 * isValid - make sure required fields are filled in and some sanity checking on format for certain
 * fields (e.g. email address) is done

 * @api private
 */
function isValid() {
    var addressIsValid = $.enter_address_dynamic.isValid();
    var emailIsValid = true;
    if ($.email_address.getVisible()) {
        emailIsValid = (getEmailAddress() !== null);
    }
    return addressIsValid && emailIsValid;
}

/**
 * getEmailAddress - validate the email address and if valid, return it
 *
 * @api private
 */
function getEmailAddress() {
    if ($.email_address.value) {
        if (email_regex.test($.email_address.value)) {
            clearError($.email_address, $.email_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, false);
            return $.email_address.getValue().trim();
        } else {
            emailError();
            return null;
        }
    }
    clearError($.email_address, $.email_error, Alloy.Styles.color.text.lightest, Alloy.Styles.color.text.lightest, false);
    return null;
}

/**
 * getNickname - get the value entered into the nickname field
 *
 * @param {String} city
 * @param {String} stateCode
 * @api private
 */
function getNickname(city, stateCode) {
    var nickname_value = $.nickname_text_field.getValue().trim();
    return nickname_value != '' ? nickname_value : getAddressNickname(city, stateCode);
}

/**
 * resetToolbar - reset the text field toolbar to defaults
 *
 * @api private
 */
function resetToolbar() {
    textFields = [];
    textFields = $.enter_address_dynamic.getAllFormFieldsInOrder().slice();
    textFields[textFields.length - 1].addEventListener('return', onResetToolbar);
    textFields.push($.email_address);

    if ($.nickname_text_field.visible) {
        textFields.unshift($.nickname_text_field);
    }
    $.toolbar.setTextFields(textFields);
}

/**
 * onResetToolbar - put the focus on the email address textfield
 *
 * @api private
 */
function onResetToolbar() {
    $.email_address.focus();
}

/**
 * hideSaveCustomerAddress - hides the save customer address options to customer profile
 *
 * @param {boolean} hideCancel boolean to hide the cancel button or not, cancel needed for edit form
 * @api private
 */
function hideSaveCustomerAddress(hideCancel) {
    $.nickname_text_field.hide();
    if (hideCancel) {
        $.customer_action_container.hide();
    }
    // get the back to address button top aligned with the next button
    $.customer_action_container.setTop(0);
    $.nickname_text_field.setHeight(0);
    $.save_address_book_container.hide();
    $.save_address_book_container.setHeight(0);
    $.back_to_address_button.setTop(0);
}

/**
 * showSaveCustomerAddress - shows the save customer address options to customer profile
 *
 * @api private
 */
function showSaveCustomerAddress() {
    $.nickname_text_field.show();
    $.customer_action_container.show();
    $.customer_action_container.setTop(5);
    $.nickname_text_field.setHeight(50);
    $.save_address_book_container.show();
    $.save_address_book_container.setHeight(Ti.UI.SIZE);
    $.back_to_address_button.setTop(20);
}

/**
 * onNextButtonClick - when next is tapped, set the address and email into the basket
 *
 * @api private
 */
function onNextButtonClick() {
    logger.info(addressType + ' next button click');
    //Checking if the address with the nickname already exist in customer profile when trying to save address to profile at checkout
    var nickname = getNickname(getCurrentAddress().city, getCurrentAddress().state_code);
    // if setting a nickname that is already in use, indicate that the nickname is in use. But if editing the address and the nickname
    // is the same, don't show the error
    if ($.address_book_switch.getValue() && currentCustomer.addresses.nicknameExists(nickname) && (originalAddressName != nickname)) {
        showErrorMessage(_L('Error: ') + String.format(_L('Customer address name \'%s\' is already in use.'), nickname));
        $.nickname_text_field.focus();
        return;
    }

    if (isValid()) {
        var address = getCurrentAddress();
        closeKeyboard();
        $.trigger('addressEntered', {
            address : address,
            email : getEmailAddress(),
            isShipToStore : isShipToStore,
            isDifferentStorePickup : differentStorePickup
        });
    }
}

/**
 * nextButtonValidation - validates if next button can be enabled
 *
 * @api private
 */
function nextButtonValidation() {
    $.next_button.setEnabled(isValid());
}

/**
 * onEmailAddressChange - validates if next button can be enabled based on email address
 *
 * @api private
 */
function onEmailAddressChange() {
    if ($.email_address.getVisible()) {
        $.next_button.setEnabled($.enter_address_dynamic.isValid() && email_regex.test($.email_address.value));
    }
}

/**
 * setEmailValue - update the email address field and the original value
 *
 * @param newEmailValue - new value to set
 * @api private
 */
function setEmailValue(newEmailValue) {
    emailValue = newEmailValue;
    $.email_address.setValue(emailValue);
}

/**
 * clearErrors - clear the error messages if the nickname does not exist or have left add new address form
 *
 * @api private
 */
function clearErrors() {
    // Hide any previously displayed errors
    $.address_error.hide();
    $.address_error.setHeight(0);
    $.address_error.setText('');
}

/**
 * showErrorMessage - show the error message if the Nickname is already existing in the customer profile
 *
 * @param {String} errorMessage
 * @api private
 */
function showErrorMessage(errorMessage) {
    $.address_error.setText(errorMessage);
    $.address_error.show();
    $.address_error.setHeight(Ti.UI.SIZE);
}

/**
 * onBackClick - going back in checkout tabs
 *
 * @api private
 */
function onBackClick() {
    logger.info(addressType + ' leaving enter address form, going back to choose an address');
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    $.trigger('chooseAddress');
    clearErrors();
}

/**
 * hasAnythingChanged - Check if anything changed in the form
 * @return {Boolean} true if anything in the form changed by the user
 *
 * @api public
 */
function hasAnythingChanged() {
    var result = $.enter_address_dynamic.hasAnythingChanged();
    var emailV = $.email_address.getValue() !== emailValue;
    return (result || emailV);
}

/**
 * handleDifferentStorePickupAddress - called if pickup at different store is selected in shipping address tab
 *
 * @api private
 */
function handleDifferentStorePickupAddress() {
    differentStorePickup = true;
    $.next_button.setTitle(_L('Create Order'));
}

/**
 * handleShipToStore - called if ship to store is selected in shipping address tab
 *
 * @api private
 */
function handleShipToStore() {
    differentStorePickup = false;
    $.next_button.setTitle(_L('Next'));
}

/**
 * handleShipToAddress - called if ship to address is selected in shipping address tab
 *
 * @api private
 */
function handleShipToAddress() {
    differentStorePickup = false;
    $.next_button.setTitle(_L('Next'));
}

/**
 * clearPreviousSelections - clear our previous screen selections
 *
 * @api private
 */
function clearPreviousSelections() {
    logger.info('clearPreviousSelections called');
    handleShipToAddress();
}
