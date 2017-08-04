// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/productId.js - controller for productId
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:components:productId', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.setId = setId;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * setId - Set the price field
 *
 * @api public
 */
function setId(id) {
    logger.info('setId called');
    if (id) {
        $.product_id.setText(id);
    }
}

