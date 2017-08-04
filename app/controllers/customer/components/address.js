// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/address.js - Controller for handling customer address modification
 */

//---------------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var customerAddress = Alloy.Models.customerAddress;
var EAUtils = require('EAUtils');
var addressVerification = EAUtils.addressVerification;
var getAddressNickname = EAUtils.getAddressNickname;
var logger = require('logging')('customer:components:address', getFullControllerPath($.__controllerPath));

var currentAddress;
var originalAddressName = '';
var modify = false;
var address_id;
var route;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// save_button click event listener
$.save_button.addEventListener('click', onSaveClick);

// cancel_button click event listener
$.cancel_button.addEventListener('click', onCancelClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.isModifyingAddress = isModifyingAddress;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api public
 */
function init(options) {
    logger.info('Calling INIT');
    var deferred = new _.Deferred();

    address_id = options.address_id;
    var customerAddresses = [];
    clearErrors();

    // if there's already an address we're 'modifying' it, otherwise, we're creating a new one
    if (address_id) {
        $.address_title.setCustomLabel(_L('Modify Address'));
        customerAddress.setModifyingCurrentAddress(true);
    } else {
        $.address_title.setCustomLabel(_L('Add Address'));
        originalAddressName = '';
        customerAddress.setModifyingCurrentAddress(false);
    }

    $.address_name.setValue('');

    // get the list of addresses from the server to see if we're modifying an existing one or creating a new one
    Alloy.Models.customer.trigger('fetch', {});
    currentCustomer.addresses.fetchAddresses(currentCustomer.getCustomerId()).done(function() {
        var customerAddresses = currentCustomer.addresses.getAddresses();

        currentAddress = null;
        for (var i = 0; i < customerAddresses.length; i++) {
            var addr = customerAddresses[i];
            if (addr && (address_id == addr.getAddressId())) {
                originalAddressName = address_id ? addr.getAddressId() : '';
                currentAddress = addr;
                break;
            }
        }
        // this is to set accessibility labels on all the components in the enter address component
        $.enter_address.init('profile_');
        if (currentAddress) {
            // modifying an existing address
            $.enter_address.setAddress(currentAddress);
            $.address_name.setValue(currentAddress.getAddressId());

            // set preferred switch
            var preferredId = currentCustomer.addresses.getPreferredID();
            $.preferred_switch.setValue(preferredId == currentAddress.getAddressId());
            deferred.resolve();
        } else {
            var address = {
                first_name : currentCustomer.getFirstName(),
                last_name : currentCustomer.getLastName()
            };
            $.enter_address.setAddress(address);
            deferred.resolve();
        }
    }).fail(function() {
        logger.info('cannot retrieve addresses');
        deferred.reject();
    });
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.toolbar.deinit();
    $.enter_address.deinit();
    $.save_button.removeEventListener('click', onSaveClick);
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * isModifyingAddress
 *
 * @api public
 */
function isModifyingAddress() {
    return modify;
}

/**
 * clearErrors - clear all the errors
 *
 * @api private
 */
function clearErrors() {
    // Hide any previously displayed errors
    $.address_error.setVisible(false);
    $.address_error.setHeight(0);
    $.address_error.setText('');
}

/**
 * updateAddress - updates to the new address
 *
 * @api private
 */
function updateAddress(newAddress) {
    $.enter_address.setAddress(newAddress);
    setCustomerAddress(false);
}

/**
 * continueSave - save the address to customer profile
 *
 * @api private
 */
function continueSave() {
    notify(_L('Address successfully saved.'));
    $.customer_address.fireEvent('route', {
        page : 'addresses'
    });
}

/**
 * showErrorMessage - shows error message
 *
 * @api private
 */
function showErrorMessage(errorMessage) {
    $.address_error.setText(errorMessage);
    $.address_error.setVisible(true);
    $.address_error.setHeight(Ti.UI.SIZE);
}

/**
 * setCustomerAddress - set the customer address
 *
 * @api private
 */
function setCustomerAddress(verify) {
    var deferred = new _.Deferred();
    Alloy.Router.showActivityIndicator(deferred);
    var address = $.enter_address.getAddress();

    // nickname - if there is no nickname, create one by concatenating the city and state. if no state, just use the city
    var nickname_value = $.address_name.getValue().trim();
    var nickname = nickname_value != '' ? nickname_value : getAddressNickname(address.city, address.state_code);
    address.address_id = nickname;
    address.original_id = (nickname != originalAddressName) ? originalAddressName : nickname;

    // handle the preferred address state
    var preferredValue = $.preferred_switch.getValue();
    if (preferredValue == 'off') {
        preferredValue = false;
    }
    address.preferred = preferredValue;

    var funcToApply;

    if (customerAddress.isModifyingCustomerAddress()) {
        funcToApply = currentCustomer.addresses.updateAddress;
    } else {

        if (currentCustomer.addresses.nicknameExists(nickname)) {
            showErrorMessage(_L('Error: ') + String.format(_L('Customer address name \'%s\' is already in use.'), nickname));
            deferred.resolve();
            return;
        }
        funcToApply = currentCustomer.addresses.createAddress;
    }

    verify = verify != null ? verify : true;

    funcToApply.apply(currentCustomer.addresses, [address, currentCustomer.getCustomerId(), {
        c_employee_id : Alloy.Models.associate.getEmployeeId()
    }, modify, verify]).done(function(results) {
        continueSave();
    }).fail(function(model) {
        var fault = model.get('fault');
        var faultHandled = false;
        if (verify) {
            faultHandled = addressVerification(fault, address, updateAddress);
        }
        if (faultHandled === false) {
            var error = null;
            if (fault && fault.arguments && fault.arguments.statusMessage) {
                error = fault.arguments.statusMessage;
            } else if (fault && fault.message) {
                error = fault.message;
            } else {
                error = _L('Cannot save address.');
            }
            showErrorMessage(_L('Error: ') + error);
        }
    }).always(function() {
        deferred.resolve();
    });
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onSaveClick - save button clicked
 * @api private
 */
function onSaveClick() {
    logger.info('save_button click event listener');
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    $.save_button.animate(Alloy.Animations.bounce);

    // Hide any previously displayed errors
    clearErrors();
    $.enter_address.validate();

    // validate the address
    if ($.enter_address.isValid()) {
        setCustomerAddress();
    }
}

/**
 * onCancelClick - cancel button clicked
 * @api private
 */
function onCancelClick() {
    logger.info('cancel_button click event listener');
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    $.cancel_button.animate(Alloy.Animations.bounce);
    clearErrors();
    customerAddress.setModifyingCurrentAddress(false);
    $.customer_address.fireEvent('route', {
        page : 'addresses',
        isCancel : true
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

// set up the addresses toolbar
$.toolbar = Alloy.createController('components/nextPreviousToolbar');
var textFields = $.enter_address.getAllFormFieldsInOrder().slice();
textFields.unshift($.address_name);
$.toolbar.setTextFields(textFields);
