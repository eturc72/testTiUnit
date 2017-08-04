// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/profile.js - Functions for viewing customer profile
 */

//---------------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var logger = require('logging')('customer:components:profile', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.edit_button.addEventListener('click', onEditClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
    Alloy.Models.customer.trigger('fetch', {});
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.edit_button.removeEventListener('click', onEditClick);
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onEditClick - edit button has been clicked
 * @param {Object} event
 * @api private
 */
function onEditClick(event) {
    logger.info('edit_button click event listener');
    event.cancelBubble = true;
    $.customer_profile.fireEvent('route', {
        page : 'editProfile'
    });
}

