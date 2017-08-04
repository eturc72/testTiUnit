// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/sizeChart.js - view controller for size chart view
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:components:sizeChart', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.backdrop.addEventListener('click', dismiss);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args - options for the dialog
 * @api public
 */

function init(args) {
    logger.info('init called');
    $.size_chart.setHtml('');
    var head = '<meta name="viewport" content="user-scalable=0,initial-scale=0">' + '<style>' + Alloy.CFG.webViewCssReset + (Alloy.CFG.product.descriptionWebViewCss || '') + '</style>';
    if (args.cssFile) {
        head += '<link rel="stylesheet" type="text/css" href="' + args.cssFile + '" />';
    }
    var html = head + '<div>' + args.body + '</div>';
    $.size_chart.setHtml(html);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.backdrop.removeEventListener('click', dismiss);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - close the dialog
 *
 * @api private
 */
function dismiss() {
    logger.info('dismiss called');
    $.trigger('sizeChart:dismiss');
}
