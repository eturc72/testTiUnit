// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customerSearch/search.js - Search for a customer
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('customerSearch:search', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.search_textfield.addEventListener('return', handlePerformSearch);

$.search_button.addEventListener('click', handlePerformSearch);

$.backdrop.addEventListener('click', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.focusSearchField = focusSearchField;
exports.showErrorMessage = showErrorMessage;
exports.hideErrorMessage = hideErrorMessage;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called, removing listeners');
    $.search_textfield.removeEventListener('return', handlePerformSearch);
    $.search_button.removeEventListener('click', handlePerformSearch);
    $.backdrop.removeEventListener('click', dismiss);
    $.stopListening();
    $.destroy();
}

/**
 * focusSearchField - focus on the search field
 * @api public
 */
function focusSearchField() {
    logger.info('focus search field');
    $.search_textfield.focus();
}

/**
 * showErrorMessage - displays the error message
 * @param {Object} text
 * @api public
 */
function showErrorMessage(text) {
    //Show error text under text field
    $.results_error.setText(text);
    $.search_results_container.setVisible(true);
}

/**
 * hideErrorMessage - hides the error message
 * @api public
 */
function hideErrorMessage() {
    //Hide error text under text field
    $.results_error.setText('');
    $.search_results_container.setVisible(false);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handlePerformSearch - handles the customer search and query for the text entered
 * @api private
 */
function handlePerformSearch() {
    logger.info('handle perform search');

    var search_text = $.search_textfield.getValue().trim();
    if (!search_text) {
        $.results_error.setText(_L('You must provide either a first/last name or an email for a customer search.'));
        $.search_results_container.setVisible(true);
        return;
    }
    Alloy.Router.navigateToCustomerSearchResult({
        customer_query : search_text
    });
    dismiss();
}

/**
 * dismiss - dismiss the customer search
 * @api private
 */
function dismiss() {
    $.trigger('customer_search:dismiss');
}

