// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/avsPopover.js - Builds a view to display address verification results
 */

//---------------------------------------------------
// ## VARIABLES

// Handles the AVS popover
var logger = require('logging')('components:avsPopover', getFullControllerPath($.__controllerPath));
var selectedAddress = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.cancel_button.addEventListener('click', dismiss);

$.continue_button.addEventListener('click', continueCheckout);

$.suggested_addresses_table.addEventListener('click', selectSuggestedAddress);

$.entered_address_tile.addEventListener('click', selectEnteredAddress);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('init called');
    var givenAddress = args.givenAddress;
    var pickListDisplay = args.pickListDisplay;
    // display entered address data
    $.givenAddress.clear();
    if (givenAddress) {
        $.givenAddress.set(givenAddress);
    }

    if ($.givenAddress.getAddress2()) {
        $.entered_address_tile.setHeight(60);
        $.entered_address_column.setHeight(60);
        $.given_address2.setHeight(20);
    } else {
        $.entered_address_tile.setHeight(40);
        $.entered_address_column.setHeight(40);
        $.given_address2.setHeight(0);
    }
    removeAllChildren($.suggested_addresses_table);
    $.radio_button.setImage(Alloy.Styles.radioButtonOffImage);
    // display suggested addresses
    if (pickListDisplay) {
        $.addresses.reset(pickListDisplay);
        $.suggested_addresses_column_container.show();
        $.suggested_addresses_column_container.setWidth('50%');
        $.entered_address_column_container.setWidth('50%');
        $.subtitle.setText(_L('According to the USPS database...'));
        $.radio_button.show();

        if ($.suggested_addresses_table.getSections().length > 0) {
            var children = $.suggested_addresses_table.getSections()[0].getRows();
            if (children) {
                var rowSelected = children[0];
                rowSelected.select.call(this, true);
                selectedAddress = rowSelected.getAddress.call(this);
                $.continue_button.setEnabled(true);
            }
        }
    } else {
        $.addresses.reset();
        $.suggested_addresses_column_container.hide();
        $.suggested_addresses_column_container.setWidth(0);
        $.entered_address_column_container.setWidth('100%');
        $.subtitle.setText(_L('We were unable to validate your address...'));
        selectedAddress = null;
        $.radio_button.hide();
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.cancel_button.removeEventListener('click', dismiss);
    $.continue_button.removeEventListener('click', continueCheckout);
    $.suggested_addresses_table.removeEventListener('click', selectSuggestedAddress);
    removeAllChildren($.suggested_addresses_table);
    $.entered_address_tile.removeEventListener('click', selectEnteredAddress);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * transformAddress
 *
 * @param {Object} model - model to transform
 * @return {Object} transformed model data for view
 *
 * @api private
 */
function transformAddress(model) {
    return {
        address1 : model.getAddress1(),
        address2 : model.getAddress2(),
        city_state_zip : model.getCityStateZip()
    };
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('avsPopover:dismiss');
}

/**
 * continueCheckout - continue the checkout process
 *
 * @api private
 */
function continueCheckout() {
    var data = {};
    if (selectedAddress) {
        data = {
            address1 : selectedAddress.get('Address1'),
            address2 : selectedAddress.get('Address2'),
            city : selectedAddress.get('city'),
            state : selectedAddress.get('stateCode'),
            postalCode : selectedAddress.get('postalCode')
        };
    }
    $.trigger('avsPopover:continue', {
        selectedAddress : data
    });
}

/**
 * selectSuggestedAddress - listener for the address container with the address book address
 *
 * @param {Object} event
 * @api private
 */
function selectSuggestedAddress(event) {
    var address = event.row.getAddress.call(this);
    if ($.suggested_addresses_table.getSections().length > 0) {
        var children = $.suggested_addresses_table.getSections()[0].getRows();
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            child.select.call(this, child.getAddress.call(this) === address);
        }
    }
    selectedAddress = address;
    $.radio_button.setImage(Alloy.Styles.radioButtonOffImage);
    $.continue_button.setEnabled(true);
}

/**
 * selectEnteredAddress - listener for the address container with the address book address
 *
 * @api private
 */
function selectEnteredAddress() {
    if ($.suggested_addresses_table.getSections().length > 0) {
        var children = $.suggested_addresses_table.getSections()[0].getRows();
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            child.select.call(this, false);
        }
    }
    selectedAddress = null;
    $.radio_button.setImage(Alloy.Styles.radioButtonOnImage);
    $.continue_button.setEnabled(true);
}
