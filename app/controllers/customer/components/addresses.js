// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/addresses.js - Functions for handling Customer addresses
 */

//---------------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var customerAddresses = Alloy.Models.customerAddress;
var toCountryName = require('EAUtils').countryCodeToCountryName;
var logger = require('logging')('customer:components:addresses', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.new_address_button.addEventListener('click', onNewAddressButtonClick);
$.address_list.addEventListener('click', onAddressListClick);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentCustomer, 'customer:clear', function() {
    logger.info('currentCustomer customer:clear event listener');
    $.customerAddresses.reset();
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise
 * @api public
 */
function init() {
    logger.info('Calling INIT');
    var deferred = new _.Deferred();
    currentCustomer.addresses.fetchAddresses(currentCustomer.getCustomerId()).done(function() {
        if (!currentCustomer.hasAddresses()) {
            logger.info('no address');
            $.addresses_contents.setTop(0);
            $.addresses_container.setWidth(0);
            $.addresses_container.setHeight(0);
            $.addresses_container.setVisible(false);
            $.new_address_row.setTop(0);

            $.no_addresses.setWidth('100%');
            $.no_addresses.setTop(70);
            $.no_addresses.setLeft(150);
            $.no_addresses.setHeight(50);
            $.no_addresses.setVisible(true);
            $.no_addresses.setText(_L('There are no saved addresses.'));
        } else {
            $.no_addresses.setWidth(0);
            $.no_addresses.setTop(0);
            $.no_addresses.setHeight(0);
            $.no_addresses.setVisible(false);

            $.new_address_row.setTop(0);
            $.addresses_container.setVisible(true);
            $.addresses_container.setWidth('100%');
            $.addresses_container.setHeight(750);

            $.customerAddresses.reset(currentCustomer.addresses.getAddressesOfType('customer'));
        }
        deferred.resolve();
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
    logger.info('DEINIT Called');
    $.new_address_button.removeEventListener('click', onNewAddressButtonClick);
    $.address_list.removeEventListener('click', onAddressListClick);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showDeleteAddressPopover - show delete address popover
 *
 * @api private
 */
function showDeleteAddressPopover(address_name) {
    Alloy.Dialog.showConfirmationDialog({
        messageString : String.format(_L('Do you really want to delete this address?'), address_name),
        titleString : _L('Delete Address'),
        okButtonString : _L('Delete'),
        okFunction : function() {
            var promise = currentCustomer.addresses.deleteAddress(address_name, currentCustomer.getCustomerId());
            Alloy.Router.showActivityIndicator(promise);
            promise.done(function() {
                notify(String.format(_L('Address \'%s\' successfully deleted.'), address_name));
                $.addresses_contents.fireEvent('route', {
                    page : 'addresses'
                });
            }).fail(function() {
                notify(String.format(_L('Could not delete address \'%s\'.'), address_name), {
                    preventAutoClose : true
                });
            });
        }
    });
}

/**
 * transformAddress - transforms the address
 *
 * @param {Object} model
 * @api private
 */
function transformAddress(model) {
    logger.info('transform address');
    var country_code = model.getCountryCode().toUpperCase();
    var country_name = toCountryName(country_code);

    var city_state_zip = model.getStateCode() ? model.getCity() + ', ' + model.getStateCode() + ' ' + model.getPostalCode() : model.getCity() + ' ' + (model.getPostalCode() ? model.getPostalCode() : '');
    return {
        full_name : model.getFullName(),
        address_name : model.getAddressId(),
        address1 : model.getAddress1(),
        address2 : model.getAddress2(),
        city : model.getCity(),
        state_code : model.getStateCode(),
        postal_code : model.getPostalCode(),
        city_state_zip : model.getStateCode() ? model.getCity() + ', ' + model.getStateCode() + ' ' + model.getPostalCode() : model.getCity() + ' ' + (model.getPostalCode() ? model.getPostalCode() : ''),
        country : country_name
    };
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onNewAddressButtonClick - handles click event when clicked on new address button
 *
 * @param {Object} event
 * @api private
 */
function onNewAddressButtonClick(event) {
    logger.info('new_address_button click event listener');
    event.cancelBubble = true;
    $.addresses_contents.fireEvent('route', {
        page : 'address'
    });
}

/**
 * onAddressListClick - handles events when clicked on the address list edit or delete button
 *
 * @param {Object} event
 * @api private
 */
function onAddressListClick(event) {
    if (event.source.id == 'address_edit_button') {
        $.addresses_contents.fireEvent('route', {
            page : 'address',
            address_id : event.source.address_id
        });
    } else if (event.source.id == 'address_delete_button') {
        showDeleteAddressPopover(event.source.address_name);
    }
}
