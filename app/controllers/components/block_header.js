// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/block_header.js - Controller for block_header component
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var customLabel = args.customLabel || {};

//---------------------------------------------------
// ## PUBLIC API

exports.setCustomLabel = setCustomLabel;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * setCustomLabel - set the label for the header
 *
 * @param {String} label
 *
 * @api public
 */
function setCustomLabel(label) {
    $.block_header.setText(label);
}

//---------------------------------------------------
// ## CONSTRUCTOR
$.block_header.setText(customLabel);

