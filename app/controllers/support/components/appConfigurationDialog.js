// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/appConfigurationDialog.js - App configuration dialog
 *
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:appConfigurationDialog', getFullControllerPath($.__controllerPath));

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.retry_button.addEventListener('click', dismiss);

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
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.retry_button.removeEventListener('click', dismiss);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - close the dialog and cleanup
 *
 * @api private
 */
function dismiss() {
    $.trigger('appConfigurationDialog:dismiss');
}
