// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/behaveLoggerExt.js - behave logger functions
 */

//---------------------------------------------------
// ## VARIABLES

var loggerFunction = null;

//---------------------------------------------------
// ## PUBLIC API

exports.setLoggerFunction = setLoggerFunction;
exports.getLoggerFunction = getLoggerFunction;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * setLoggerFunction - sets logger function
 *
 * @param {Object} logFunc
 * @api public
 */
function setLoggerFunction(logFunc) {
    loggerFunction = logFunc;
}

/**
 * getLoggerFunction - get logger function
 *
 * @return {Object} logFunc
 * @api public
 */
function getLoggerFunction() {
    return loggerFunction;
}
