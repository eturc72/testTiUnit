// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/errorPopover.js - Handles the dialog for JS errors
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:errorPopover', getFullControllerPath($.__controllerPath));

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.ok_button.addEventListener('click', dismiss);
$.details_button.addEventListener('click', onDetailsClick);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args
 *
 * @api public
 */
function init(args) {
    logger.info('init called');
    $.error_text_message.setText(args);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.ok_button.removeEventListener('click', dismiss);
    $.details_button.removeEventListener('click', onDetailsClick);
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - remove the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('errorPopover:dismiss', {
        text : $.describe_text_message.getValue()
    });
}

/**
 * onDetailsClick - click on the details button to display error
 *
 * @api private
 */
function onDetailsClick() {
    if ($.error_details.getVisible()) {
        // hide the details container
        $.error_details.setHeight(0);
        $.error_details.setVisible(false);
        $.details_button.setTitle(_L('Show Details'));
    } else {
        // show the details container
        $.error_details.setHeight(Ti.UI.SIZE);
        $.error_details.setVisible(true);
        $.details_button.setTitle(_L('Hide Details'));
    }
}
