// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/chooseAddress.js - choose an address from the address book
 */

//----------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var currentBasket = Alloy.Models.basket;
var currentAddresses = currentCustomer.addresses;
var logger = require('logging')('checkout:address:chooseAddress', getFullControllerPath($.__controllerPath));
var addressType = '';

var _controllersToAddresses = {};
var selectedAddress = null;
var _controllersById = {};
var _addressesById = {};
var preferred_address_id = null;
var addressesToRows = {};
var usingTemporaryAddress = false;
var tempAddressIndex = -1;
var oldShipToStore = false;
var differentStorePickup = false;

var toCountryName = require('EAUtils').countryCodeToCountryName;
var EAUtils = require('EAUtils');

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToCurrentStore', handleShipToStore);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:shipToAddress', handleShipToAddress);
$.listenTo(Alloy.eventDispatcher, 'shippingOption:differentStorePickupAddress', handleDifferentStorePickupAddress);

//---------------------------------------------------
// ## UI EVENT LISTENERS

// listener for the address container with the address book address
$.address_container.addEventListener('click', onAddressContainerClick);

$.next_button.addEventListener('click', onNextButtonClick);

$.add_address_button.addEventListener('click', onAddAddressButtonClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {String} type (either 'billing' or 'shipping')
 * @api public
 */
function init(type) {
    logger.info(type + ' init called ');
    addressType = type;
    // this is to set accessibility labels on the components in the choose address component
    $.next_button.setAccessibilityValue(addressType + '_choose_address_next_btn');
}

/**
 * RENDER
 *
 * @return {Deferred} promise
 * @api public
 */
function render() {
    logger.info(addressType + ' render called');
    var deferred = new _.Deferred();

    if (addressType === 'shipping') {
        oldShipToStore = currentBasket.getShipToStore() || false;
        logger.info(addressType + ' oldShipToStore ' + oldShipToStore);
    }
    currentAddresses.fetchAddresses(currentCustomer.getCustomerId()).done(function() {
        if (currentCustomer.isLoggedIn()) {
            var addresses = currentAddresses.getAddressesOfType(addressType);
            if ((addresses.length == 0 && !currentBasket.getAddress(addressType)) || (addresses.length == 0 && oldShipToStore)) {
                $.next_button.setEnabled(false);
                $.address_container.hide();
                $.address_container.setHeight(0);
                $.addresses_msg.setHeight(Ti.UI.SIZE);
                $.addresses_msg.setText(_L('There are no saved addresses.'));
                $.addresses_msg.show();
                deferred.resolve();
            } else {
                $.addresses_msg.hide();
                $.addresses_msg.setHeight(0);
                preferred_address_id = currentAddresses.getPreferredID();
                // once the addresses have been rendered, one may have to be selected
                $.addresses.once('reset', function() {
                    selectAddress(addresses).done(function() {
                        deferred.resolve();
                    });
                });
                $.addresses.reset(addresses);
                $.address_container.setHeight(Ti.UI.FILL);
                $.address_container.show();
            }
        } else {
            deferred.resolve();
        }
    }).fail(function() {
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
    logger.info(addressType + ' deinit called');
    $.stopListening();
    $.address_container.removeEventListener('click', onAddressContainerClick);
    $.next_button.removeEventListener('click', onNextButtonClick);
    $.add_address_button.removeEventListener('click', onAddAddressButtonClick);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * selectAddress - updates the table with addresses and selects the correct one
 *
 * @param {Object} addresses
 * @return {Deferred} promise
 *
 * @api private
 */
function selectAddress(addresses) {
    logger.info(addressType + ' selectAddress called');
    var deferred = new _.Deferred();
    usingTemporaryAddress = false;
    tempAddressIndex = -1;
    var differentStorePickup = currentBasket.getDifferentStorePickup();
    // get the address from the basket
    var chosenAddress = currentBasket.getAddress(addressType);
    $.next_button.setEnabled(false);

    addressesToRows = {};

    // keep track of which rows represent which address
    if ($.address_container.getSections().length > 0) {
        var children = $.address_container.getSections()[0].getRows();
        if (children) {
            _.each(children, function(child) {
                addressesToRows[child.address_name] = child;
            });
        }
    }

    var foundChosenAddress = false;
    _.each(addresses, function(address) {
        // determine if the address in the basket matches any of the addresses being displayed and pickup method is not ship to store or pick up elsewhere.
        if (chosenAddress && !(oldShipToStore || differentStorePickup)) {
            if (isAddressEqual(address, chosenAddress)) {
                addressesToRows[address.getAddressId()].select.call(this, true);
                selectedAddress = chosenAddress;
                $.next_button.setEnabled(true);
                foundChosenAddress = true;
            }
        } else if (preferred_address_id && address.getAddressId() === preferred_address_id) {
            // if there isn't an address in the basket but there's a preferred address, select that
            addressesToRows[address.getAddressId()].select.call(this, true);
            selectedAddress = address;
            $.next_button.setEnabled(true);
            foundChosenAddress = true;
        }
    });

    var addedNewRow = false;

    // didn't find an address to select but there is an address in the cart, so we're going to create another table row
    // (if shipping to store, the store's address will be created later)
    if (!foundChosenAddress && chosenAddress && !(oldShipToStore || differentStorePickup)) {
        preferred_address_id = null;

        var address = _.extend({}, chosenAddress);
        var address1 = getValue(address.getAddress1());
        var address2 = getValue(address.getAddress2());
        var full_name = getValue(address.getFullName());
        address.__transform = {
            address_name : '',
            address1 : address1 ? address1 : '',
            address2 : address2 ? address2 : '',
            full_name : full_name ? full_name : '',
            city_state_zip : address.getStateCode() ? address.getCity() + ', ' + address.getStateCode() + ' ' + address.getPostalCode() : address.getCity() + ' ' + address.getPostalCode()
        };
        var controller = createNewRow(address, addresses.length > 0);
        $.address_container.scrollToTop();
        controller.getView().select.call(this, true);
        selectedAddress = chosenAddress;
        $.next_button.setEnabled(true);
        usingTemporaryAddress = true;
        addedNewRow = true;
        tempAddressIndex = 0;
    }
    // added an extra row to the table, this seems to take a little time to draw, so don't resolve the deferred until
    // that is done
    setTimeout(function() {
        deferred.resolve();
    }, addedNewRow ? 300 : 0);
    return deferred.promise();
}

/**
 * createNewRow - create a new row in the table
 *
 * @param {Address} address - The address to add
 * @param {Boolean} anyAddresses - if any addresses, add this new one before, else add at the end
 * @api private
 */
function createNewRow(address, anyAddresses) {
    var row = Titanium.UI.createTableViewRow({
        selectionStyle : Titanium.UI.iOS.TableViewCellSelectionStyle.NONE
    });
    var controller = Alloy.createController('checkout/address/customerAddress', {
        $model : address,
        addressType : addressType
    });
    row.add(controller.getView().getChildren()[0]);
    row.setBackgroundImage(Alloy.Styles.customerBorderImage);
    row.setHeight('auto');
    anyAddresses ? $.address_container.insertRowBefore(0, row) : $.address_container.appendRow(row);
    row.select = function(selected) {
        controller.getView().select.call(this, selected);
    };
    return controller;
}

/**
 * isAddressEqual - compares addresses to see if it needs selection
 *
 * @param {Object} customerAddress
 * @param {Object} address
 * @api private
 */
function isAddressEqual(customerAddress, address) {
    logger.info(addressType + ' isAddressEqual called, compare customerAddress ' + JSON.stringify(customerAddress, null, 4) + ' with address ' + JSON.stringify(address, null, 4));
    if (customerAddress.getAddressId() && address.getAddressId() && customerAddress.getAddressId() === address.getAddressId()) {
        return true;
    }
    return customerAddress.getFirstName() === (address.getFirstName()) && customerAddress.getLastName() === (address.getLastName()) && customerAddress.getAddress1() === (address.getAddress1()) && customerAddress.getAddress2() === (address.getAddress2()) && customerAddress.getPostalCode() === (address.getPostalCode()) && customerAddress.getStateCode() === (address.getStateCode()) && customerAddress.getCity() === (address.getCity()) && customerAddress.getCountryCode() === (address.getCountryCode());
}

/**
 * getValue - returns the value or null if undefined
 *
 * @param {Object} value
 * @api private
 */
function getValue(value) {
    if (value === null) {
        return null;
    } else if (value === 'undefined') {
        return null;
    } else if (value === undefined) {
        return null;
    } else if (value === 'null') {
        return null;
    }
    return value;
}

/**
 * transformAddress - convert the given address into display format
 *
 * @param {Address} address
 * @api private
 */
function transformAddress(address) {
    var country_code = getValue(address.getCountryCode()).toUpperCase();
    var country_name = toCountryName(country_code);
    var address1 = getValue(address.getAddress1());
    var address2 = getValue(address.getAddress2());
    var full_name = getValue(address.getFullName());
    return {
        address_name : address.getAddressId(),
        address1 : address1 ? address1 : '',
        address2 : address2 ? address2 : '',
        full_name : full_name ? full_name : '',
        city_state_zip : address.getStateCode() ? address.getCity() + ', ' + address.getStateCode() + ' ' + address.getPostalCode() : address.getCity() + ' ' + address.getPostalCode(),
        country : country_name
    };
}

/**
 * onAddressContainerClick - address container has been clicked
 *
 * @param {Object} event
 * @api private
 */
function onAddressContainerClick(event) {
    var address;
    var editAddress;

    // if currently using an address not in the address book
    if (event.index == tempAddressIndex) {
        address = currentBasket.getAddress(addressType);
        editAddress = address.toJSON();
    } else {
        // regular customer address
        address = event.row.getAddress.call(this);
        editAddress = address.toJSON();
    }
    if (event.source.id === 'edit_button') {
        // editing the address from the list
        $.trigger('customer:address', editAddress);
    } else {
        // choosing an address from the list, make sure the other addresses are unselected
        var children = $.address_container.getSections()[0].getRows();
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            child.select.call(this, event.index == i);
        }
        $.next_button.setEnabled(true);
        selectedAddress = address;
    }
}

/**
 * onNextButtonClick - next button has been clicked on choosing address
 *
 * @api private
 */
function onNextButtonClick() {
    var address = selectedAddress.toJSON();
    logger.info(addressType + ' onNextButtonClick');
    logger.secureLog('selectedAddress ' + JSON.stringify(address, null, 4));
    $.trigger('addressEntered', {
        address : address,
        email : currentCustomer.getEmail(),
        isDifferentStorePickup : differentStorePickup
    });

}

/**
 * onAddAddressButtonClick - Add Address button has been clicked
 *
 * @api private
 */
function onAddAddressButtonClick() {
    $.trigger('customer:address', {
        newAddress : true
    });
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

//----------------------------------------------
// ## CONSTRUCTOR

// code to be called when controller is created

if (EAUtils.isLatinBasedLanguage()) {
    $.add_address_button.setWidth(250);
    $.next_button.setWidth(250);
}