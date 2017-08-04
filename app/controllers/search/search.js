// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 * controllers/search/search.js - dialog for requesting search criteria for product, customer and orders
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || $.args || {};
var logger = require('logging')('search:search', getFullControllerPath($.__controllerPath));
var selectedTabId;
var currentCustomer = Alloy.Models.customer;
var customerAddress = Alloy.Models.customerAddress;
var emptyTextFieldError = _L('You must provide either a search term or UPC code for a product search.');

var selectedStyle = {
    color : Alloy.Styles.color.text.black,
    font : Alloy.Styles.tabFont,
    height : '88%',
};

var unSelectedStyle = {
    color : Alloy.Styles.color.text.searchViewGray,
    font : Alloy.Styles.unselectedTabFont,
    height : '100%',
};

//-----------------------------------------------------
// ## UI EVENT LISTENERS

// Clicking the Search button (or pressing return in the simulator) will perform a search
$.search_button.addEventListener('click', handlePerformSearch);
$.search_field.addEventListener('return', handlePerformSearch);

// Clicking the background will dismiss the dialog
$.backdrop.addEventListener('click', dismiss);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.dismiss = dismiss;
exports.setMessage = setMessage;
exports.focusSearchField = focusSearchField;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} order
 * @api public
 */
function init(args) {
    logger.info('Calling INIT');
    if (args && args.message) {
        $.message.setText(args.message);
    }
    if (args && args.query) {
        $.search_field.setValue(args.query);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('Calling DEINIT');
    $.search_button.removeEventListener('click', handlePerformSearch);
    $.search_field.removeEventListener('return', handlePerformSearch);
    $.backdrop.removeEventListener('click', dismiss);

    if (Alloy.CFG.enable_barcode_scanner) {
        $.bar_code_scanner.removeEventListener('singletap', handleScannerClick);
    }

    if ($.product_search) {
        $.product_search.removeEventListener('click', handleTabSelect);
    }

    if ($.customer_search) {
        $.customer_search.removeEventListener('click', handleTabSelect);
    }

    if ($.order_search) {
        $.order_search.removeEventListener('click', handleTabSelect);
    }

    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * focusSearchField - show keyboard
 *
 * @api public
 */
function focusSearchField() {
    $.search_field.focus();
}

/**
 * setSearchFieldHintText - set the appropriate hint text for the search text field
 * @param {String} tabId - selected search tab id
 * @api private
 */
function setSearchFieldHintText(tabId) {
    switch(tabId) {
    case 'product_search':
        $.search_field.setHintText(_L('Enter Search Term or UPC Code'));
        emptyTextFieldError = _L('You must provide either a search term or UPC code for a product search.');
        break;
    case 'customer_search':
        $.search_field.setHintText(_L('Enter First and Last Name or Email'));
        emptyTextFieldError = _L('You must provide either a first/last name or an email for a customer search.');
        break;
    case 'order_search':
        $.search_field.setHintText(_L('Enter Order ID or Customer Email'));
        emptyTextFieldError = _L('You must provide either an order ID or a customer email for an order search.');
        break;
    }
}

/**
 * hideShowScannerButton - hide or show the bar code scanner button in the search text field
 * @param{String} tabId - selected search tab id
 * @api private
 */
function hideShowScannerButton(tabId) {
    if (Alloy.CFG.enable_barcode_scanner) {
        if (tabId == 'product_search') {
            $.search_field.setWidth('85%');
            $.search_field.setBackgroundImage(Alloy.Styles.magnifierImage);
            $.bar_code_scanner.setWidth('10.9%');
            $.bar_code_scanner.show();
            $.bar_code_scanner.setTouchEnabled(true);
        } else {
            $.bar_code_scanner.hide();
            $.search_field.setBackgroundImage(Alloy.Styles.longMagnifierImage);
            $.bar_code_scanner.setTouchEnabled(false);
            $.bar_code_scanner.setWidth(0);
            $.search_field.setWidth('100%');
        }
    }
}

/**
 * setMessage - set text in search view
 * @param {String} message - text to be displayed
 * @api public
 */
function setMessage(message) {
    $.message.setText(message);
}

/**
 * allowOrderSearchTab - Allow order search tab to be displayed or not
 * @return {Boolean}
 * api private
 */
function allowOrderSearchTab() {
    return (!isKioskMode() || isKioskManagerLoggedIn());
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handlePerformSearch - handle search click or return event on search text field
 * @api private
 */
function handlePerformSearch() {
    var search_phrase = $.search_field.getValue();

    if (search_phrase == '') {
        setMessage(emptyTextFieldError);
        return;
    }
    setMessage('');
    // Release keyboard
    $.search_field.blur();

    switch(selectedTabId) {
    case 'product_search':
        Alloy.Router.navigateToProductSearch({
            query : search_phrase,
            category_id : Alloy.CFG.root_category_id
        });

        break;

    case 'customer_search':
        Alloy.Router.navigateToCustomerSearchResult({
            customer_query : search_phrase
        });

        break;

    case 'order_search':
        Alloy.Router.navigateToOrderSearchResult({
            searchPhrase : search_phrase
        });

        break;
    }

}

/**
 *  handleTabSelect - handle tab selection on click
 *  @param {Object} evt - event
 *  @api private
 */
function handleTabSelect(evt) {
    _.each($.search_tab.getChildren(), function(view) {
        var children = view.getChildren();
        if (children && children.length > 0) {
            if (children[0] !== evt.source) {
                _.extend(children[0], unSelectedStyle);
            }
        }
    });
    _.extend(evt.source, selectedStyle);
    selectedTabId = evt.source.id;
    setSearchFieldHintText(selectedTabId);
    hideShowScannerButton(selectedTabId);
    setMessage('');
    $.search_field.setValue('');
}



/**
 * handleScannerClick - Launch bar code scanner on bar code button click
 * @api private
 *
 */
function handleScannerClick() {
    Alloy.eventDispatcher.trigger('barcode:start_camera');
}

/**
 * dismiss - dismiss search view
 * @api public
 */
function dismiss() {
    $.search_field.blur();
    $.trigger('search:dismiss');
}


//---------------------------------------------------
// ## CONSTRUCTOR

if (Alloy.CFG.enable_barcode_scanner) {
    $.bar_code_scanner = Ti.UI.createButton($.createStyle({
        classes : ['bar_code_scanner'],
        apiName : 'Button'
    }));
    $.bar_code_scanner.addEventListener('singletap', handleScannerClick);
    $.text_field_wrapper.add($.bar_code_scanner);
}

if (args.tabId) {
    _.extend($[args.tabId], selectedStyle);
    selectedTabId = args.tabId || 'product_search';
    setSearchFieldHintText(selectedTabId);
    hideShowScannerButton(selectedTabId);
}

