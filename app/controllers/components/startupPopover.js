// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/startupPopover.js - Startup popover message that occurs when store not found and gives
 * user option to pick a new store from list
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:startupPopover', getFullControllerPath($.__controllerPath));

//-----------------------------------------------------
// ## UI EVENT LISTENERS

// confirm button click event listener
$.ok_button.addEventListener('click', dismiss);
$.app_info_button.addEventListener('click', showAppConfigurationDialog);

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
    var title = args.message;
    var fault = args.fault;
    $.startup_message.setText(title);
    $.ok_button.setEnabled(false);
    var message;
    if (fault.stores && fault.stores.stores && fault.stores.stores.length > 0) {
        message = _L('Select Store ID to connect to and then retry.');
        initializeStores(fault.stores.stores);
        // give more room for the store names
        $.popover_container.setWidth('65%');
    } else {
        $.store_input.setHeight(0);
        $.store_input.hide();
        message = _L('No Digital Stores found.');
    }
    $.startup_fault.setText(message);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening($.store_select, 'itemSelected', onStoreSelected);
    $.ok_button.removeEventListener('click', dismiss);
    $.app_info_button.removeEventListener('click', showAppConfigurationDialog);
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * initializeStores creates the dropdown widget for selecting the stores
 *
 * @param {Object} stores options for dropdown
 *
 * @api private
 */
function initializeStores(stores) {
    $.store_select = Alloy.createController('components/selectWidget', {
        valueField : 'value',
        textField : 'label',
        values : stores,
        messageWhenNoSelection : _L('Select Store ID'),
        selectListTitleStyle : {
            accessibilityValue : 'store_id_dropdown',
            width : Ti.UI.FILL,
            left : 10
        },
        selectListStyle : {
            width : Ti.UI.FILL,
            top : 0
        },
        selectedItem : Alloy.CFG.store_id
    });
    $.store_selection.add($.store_select.getView());

    $.listenTo($.store_select, 'itemSelected', onStoreSelected);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - close the dialog and cleanup
 *
 * @api private
 */
function dismiss() {
    $.trigger('startupPopover:dismiss');
}

/**
 * showAppConfigurationDialog - present the application configuration dialog on start up fail
 *
 * @api private
 */
function showAppConfigurationDialog() {
    $.trigger('startupPopover:appConfiguration');
}

/**
 * onStoreSelected is triggered when a store is selected in the dropdown
 *
 * @param {Object} event event associated with the dropdown selection
 *
 * @api private
 */
function onStoreSelected(event) {
    logger.info('before Alloy.CFG.store_id ' + Alloy.CFG.store_id);
    var settings = require('appSettings');
    settings.setSetting('store_id', event.item.value, true);
    logger.info('after Alloy.CFG.store_id ' + Alloy.CFG.store_id);
    $.ok_button.setEnabled(true);
}
