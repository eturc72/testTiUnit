// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/index.js - Index page for the customer
 */

//------------------------------------------------------------
// ## VARIABLES

var currentCustomer = Alloy.Models.customer;
var currentAssociate = Alloy.Models.associate;
var returnToShopping = require('EAUtils').returnToShopping;
var customerAddress = Alloy.Models.customerAddress;
var currentPage;
var warningMessage;
var warningTitle;
var showCustomerAddressAlert = require('EAUtils').showCustomerAddressAlert;
var analytics = require('analyticsBase');
var logger = require('logging')('customer:index', getFullControllerPath($.__controllerPath));
var tabSequence = ['addresses', 'profile', 'history', 'address', 'editProfile'];

//---------------------------------------------------
// ## UI EVENT LISTENERS

// Listen for page change events
$.index.addEventListener('changeCustomerPage', handlePageSelection);

$.shop_label.addEventListener('click', onShopClick);

$.addresses_tab_button.addEventListener('click', onAddressTabClick);

$.newProfile_tab_button.addEventListener('click', onProfileTabClick);

$.history_tab_button.addEventListener('click', onHistoryTabClick);

$.customer_addresses.getView().addEventListener('route', route);
$.customer_profile.getView().addEventListener('route', route);
$.customer_history.getView().addEventListener('route', route);
$.customer_address.getView().addEventListener('route', route);
$.edit_customer_profile.getView().addEventListener('route', route);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentAssociate, 'change', render);

$.listenTo(currentCustomer, 'change', render);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.render = render;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} options
 * @api public
 */
function init(options) {
    logger.info('Calling INIT');
    options = options || {};
    var defaultPage = options.page || Alloy.CFG.defaultCustomerPage;

    $.index.fireEvent('changeCustomerPage', {
        page : defaultPage
    });
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('Calling RENDER:\n');
    logger.secureLog(JSON.stringify(currentCustomer));

    var customer_no = currentCustomer.getCustomerNumber();

    if (customer_no) {
        logger.info('customer already logged in, showing profile');
        var customer_full_name;
        var addressForm = require(Alloy.CFG.addressform);
        var isLastNameFirst = _.isFunction(addressForm.isLastNameFirst) ? addressForm.isLastNameFirst() : false;
        if (isLastNameFirst === true) {
            customer_full_name = currentCustomer.getLastName() + ' ' + currentCustomer.getFirstName();
        } else {
            customer_full_name = currentCustomer.getFirstName() + ' ' + currentCustomer.getLastName();
        }
        $.profile_fullname.setText(customer_full_name);
    } else {
        $.profile_last_visit.setText('');
        $.profile_last_login.setText('');
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.shop_label.removeEventListener('click', onShopClick);
    $.index.removeEventListener('changeCustomerPage', handlePageSelection);
    $.addresses_tab_button.removeEventListener('click', onAddressTabClick);
    $.newProfile_tab_button.removeEventListener('click', onProfileTabClick);
    $.history_tab_button.removeEventListener('click', onHistoryTabClick);
    $.customer_addresses.getView().removeEventListener('route', route);
    $.customer_profile.getView().removeEventListener('route', route);
    $.customer_history.getView().removeEventListener('route', route);
    $.customer_address.getView().removeEventListener('route', route);
    $.edit_customer_profile.getView().removeEventListener('route', route);
    $.customer_addresses.deinit();
    $.customer_profile.deinit();
    $.customer_history.deinit();
    $.customer_address.deinit();
    $.edit_customer_profile.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * disableAllTabs - disable all the tabs
 * @api private
 */
function disableAllTabs() {

    $.history_tab_button.setBackgroundImage(Alloy.Styles.customerTabImage);
    $.addresses_tab_button.setBackgroundImage(Alloy.Styles.customerTabImage);
    $.newProfile_tab_button.setBackgroundImage(Alloy.Styles.customerTabImage);
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * route - rotute event handler
 *
 * @param {Object} args
 * @api private
 */
function route(args) {
    logger.info('handling customer route event: ' + args);
    args.cancelBubble = true;

    if (args.page == 'order') {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'customer/components/order',
            continueEvent : 'order_history:dismiss'
        });
    } else {
        handlePageSelection(args);
    }
}

/**
 * handlePageSelection - add page selection event handler
 *
 * @param {Object} event - including page, isCancel, address_id
 * @api private
 */
function handlePageSelection(event) {
    logger.info('Handle Page Selection ' + event);
    // if the current page is shipping address and we're leaving it, try to set the shipping address

    disableAllTabs();
    currentPage = customerAddress.getCurrentPage();
    if (!currentPage) {
        for (var i = 0,
            ii = $.customer_tab_group.children.length; i < ii; i++) {
            $.customer_tab_group.children[i].hide();
        }
    }

    switch (event.page) {
    case 'addresses':
        $.addresses_tab_button.setBackgroundImage('');
        if (!event.isCancel) {
            var deferredIndicator = new _.Deferred();
            Alloy.Router.showActivityIndicator(deferredIndicator);
            $.customer_addresses.init().always(function() {
                deferredIndicator.resolve();
            });
        }
        if (currentPage) {
            $.customer_tab_group.children[_.indexOf(tabSequence, currentPage)].hide();
        }
        $.customer_tab_group.children[0].show();
        customerAddress.setCurrentPage(event.page);
        analytics.fireScreenEvent({
            screen : _L('Customer Addresses')
        });
        break;
    case 'profile':
        $.newProfile_tab_button.setBackgroundImage('');
        $.customer_profile.init();
        if (currentPage) {
            $.customer_tab_group.children[_.indexOf(tabSequence, currentPage)].hide();
        }
        $.customer_tab_group.children[1].show();
        customerAddress.setCurrentPage(event.page);
        analytics.fireScreenEvent({
            screen : _L('Customer Profile')
        });
        break;
    case 'history':
        $.history_tab_button.setBackgroundImage('');

        var deferredIndicator = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferredIndicator);
        $.customer_history.init().always(function() {
            deferredIndicator.resolve();
        });
        if (currentPage) {
            $.customer_tab_group.children[_.indexOf(tabSequence, currentPage)].hide();
        }
        $.customer_tab_group.children[2].show();
        customerAddress.setCurrentPage(event.page);
        analytics.fireScreenEvent({
            screen : _L('Customer History')
        });
        break;
    case 'address':
        $.addresses_tab_button.setBackgroundImage('');
        var address_id = event.address_id;
        var promise = $.customer_address.init({
            address_id : address_id
        });
        Alloy.Router.showActivityIndicator(promise);
        promise.done(function() {
            if (currentPage) {
                $.customer_tab_group.children[_.indexOf(tabSequence, currentPage)].hide();
            }
            $.customer_tab_group.children[3].show();
            customerAddress.setCurrentPage(event.page);
        });
        analytics.fireScreenEvent({
            screen : _L('Customer Address')
        });
        customerAddress.setCurrentPage(event.page);
        break;
    case 'editProfile':
        $.newProfile_tab_button.setBackgroundImage('');
        $.customer_profile.init();
        if (currentPage) {
            $.customer_tab_group.children[_.indexOf(tabSequence, currentPage)].hide();
        }
        $.customer_tab_group.children[4].show();
        customerAddress.setCurrentPage(event.page);
        analytics.fireScreenEvent({
            screen : _L('Customer Edit Profile')
        });
        break;
    }
}

/**
 * onShopClick - shop for button click
 * @param {Object} event
 * @api private
 */
function onShopClick(event) {
    logger.info('shop_label click listener');
    if (customerAddress.isCustomerAddressPage()) {
        showCustomerAddressAlert(true).done(function() {
            returnToShopping();
        });

    } else {
        event.cancelBubble = true;
        customerAddress.setCurrentPage(null);
        // Return to the last place you visited before coming here
        returnToShopping();
    }
}

/**
 * onAddressTabClick - address tab clicked
 * @param {Object} event
 * @api private
 */
function onAddressTabClick(event) {
    logger.info('addresses_tab_button click listener');
    event.cancelBubble = true;
    handlePageSelection({
        page : 'addresses'
    });
}

/**
 * onProfileTabClick - profile tab click
 * @param {Object} event
 * @api private
 */
function onProfileTabClick(event) {
    logger.info('newProfile_tab_button click listener');
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    if (customerAddress.isCustomerAddressPage()) {
        showCustomerAddressAlert(true).done(function() {
            event.cancelBubble = true;
            handlePageSelection({
                page : 'profile'
            });
        });
    } else {
        event.cancelBubble = true;
        handlePageSelection({
            page : 'profile'
        });
    }
}

/**
 * onHistoryTabClick - history tab click
 * @param {Object} event
 * @api private
 */
function onHistoryTabClick(event) {
    logger.info('history_tab_button click listener');
    if (customerAddress.isCustomerAddressPage()) {
        showCustomerAddressAlert(true).done(function() {
            event.cancelBubble = true;
            handlePageSelection({
                page : 'history'
            });
        });
    } else {
        event.cancelBubble = true;
        handlePageSelection({
            page : 'history'
        });
    }
}