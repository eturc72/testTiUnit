// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/buildInfo.js - Admin Dashboard Config tab
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.hideActionColumn = hideActionColumn;
exports.showActionColumn = showActionColumn;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    // defined in view xml file
    $.clear_cache.removeEventListener('click', clearCache);
    $.change_store_password.removeEventListener('click', changeStorePassword);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * hideActionColumn - hides the action column
 *
 * @api public
 */
function hideActionColumn() {
    $.action_column.setVisible(false);
}

/**
 * showActionColumn - shows the action column
 *
 * @api public
 */
function showActionColumn() {
    $.action_column.setHeight('100%');
    $.action_column.setWidth('28%');
    $.action_column.setLayout('vertical');
    $.action_column.setVisible(true);
}

//----------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * clearCache - clears the cache
 *
 * @api private
 */
function clearCache() {
    Alloy.eventDispatcher.trigger('cache:flush');
}

/**
 * changeStorePassword - change the store password
 *
 * @api private
 */
function changeStorePassword() {
    Alloy.Router.presentChangeStorePasswordDrawer({
        isManager : true
    });
}
