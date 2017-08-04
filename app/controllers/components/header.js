// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/header.js - handles the main application header
 */

//---------------------------------------------------
// ## VARIABLES

var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var logger = require('logging')('components:header', getFullControllerPath($.__controllerPath));

var storeInfo = Alloy.Models.storeInfo;
var currentCustomer = Alloy.Models.customer;
var currentAssociate = Alloy.Models.associate;
var currentBasket = Alloy.Models.basket;
var customerAddress = Alloy.Models.customerAddress;
var currentProductSearch = Alloy.Models.productSearch;
var toCurrency = require('EAUtils').toCurrency;
var storePasswordHelpers = require('storePasswordHelpers');
var paymentDeviceInterval = null;
var verifyAddressEditBeforeNavigation = require('EAUtils').verifyAddressEditBeforeNavigation;
var exitButton = null;
var associateLogoutButtonKiosk = null;

// Localization constant
var labelTextLength = 8;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', renderCart);
$.listenTo(Alloy.eventDispatcher, 'shipping_method:selected', renderCart);
$.listenTo(Alloy.eventDispatcher, 'payments_active', function(event) {
    if (event.payments_active) {
        $.backdrop.show();
        $.backdrop.setBubbleParent(false);
    } else {
        $.backdrop.hide();
        $.backdrop.setBubbleParent(true);
    }
});

$.listenTo(Alloy.eventDispatcher, 'order_just_created', function() {
    $.backdrop.hide();
    $.backdrop.setBubbleParent(true);
});

$.listenTo(Alloy.eventDispatcher, 'customer_replace_basket', function() {
    $.listenTo(currentBasket, 'basket_sync', renderCart);
});

$.listenTo(Alloy.eventDispatcher, 'associate_logout', function() {
    $.navigation_container.setBorderWidth(1);
    $.navigation_container.setBorderColor('transparent');
    if (paymentDeviceInterval) {
        logger.info('clearing payment device interval');
        clearInterval(paymentDeviceInterval);
        paymentDeviceInterval = null;
    }
    // change to connected so that on next login it will update the status to not connected
    $.payment_device_icon.setImage(Alloy.Styles.paymentDeviceConnectedImage);

    if (isKioskMode()) {
        $.stopListening(Alloy.eventDispatcher, 'kiosk:manager_login_change', handleKioskManagerLoginChange);
    }
    cleanupComponentsOnExit();
});

$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', function() {
    if (Alloy.CFG.devices.payment_terminal_module != 'webDevice' && Alloy.CFG.devices.check_device_connected_interval > 0) {
        $.payment_device_icon.setVisible(true);
        $.payment_device_icon.setWidth(34);

    } else {
        $.payment_device_icon.setVisible(false);
        $.payment_device_icon.setWidth(0);

    }
});

$.listenTo(Alloy.eventDispatcher, 'app:ready', function() {
    if (isKioskMode()) {
        $.listenTo(Alloy.eventDispatcher, 'kiosk:manager_login_change', handleKioskManagerLoginChange);
    }
});

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.header.addEventListener('click', onHeaderClick);

//---------------------------------------------------
// ## MODEL LISTENERS

// when wish list items change, update count on wish list buton

$.listenTo(currentCustomer.productLists, 'reset', function() {
    var totalQuant = currentCustomer.productLists.getTotalQuantity();
    $.wish_list_button.setTitle(currentCustomer.productLists.getWishListCount() > 0 ? (totalQuant || 0) : '');
});

// currentCustomer change event listener

$.listenTo(currentCustomer, 'change:login', function() {
    render();
});

// currentAssociate change event listener
$.listenTo(currentAssociate, 'change', render);

$.listenTo(currentCustomer, 'change:first_name change:last_name', render);

// currentBasket change event listener
$.listenTo(currentBasket, 'basket_sync', renderCart);

// currentBasket customer_logging_in event listener
$.listenTo(Alloy.eventDispatcher, 'customer_logging_in', function() {
    $.stopListening(currentBasket);
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.updateDeviceStatus = updateDeviceStatus;
exports.initNotifications = initNotifications;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
    render();
    adjustCartLabel();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    removeAllChildren($.navigation_container);
    exitButton && exitButton.removeEventListener('click', handleExitForKiosk);
    associateLogoutButtonKiosk && associateLogoutButtonKiosk.removeEventListener('click', handleAssociateButtonForKiosk);
    // remove all onClick calls in view xml file
    $.removeListener();
    $.header.removeEventListener('click', onHeaderClick);
    $.stopListening();
    $.destroy();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    isKioskMode() ? renderKioskMode() : renderStandard();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * initNotifications - setup header notifications after application has started and store password warning has been shown
 *
 * @api public
 */
function initNotifications() {
    if (Alloy.CFG.devices.payment_terminal_module != 'webDevice' && Alloy.CFG.devices.check_device_connected_interval > 0) {
        // Don't do this right away otherwise when going to Home screen the hideAuxillaryViews will get rid of the window, want things to settle a bit
        setTimeout(function() {
            checkPaymentDeviceConnection();
            logger.info('creating payment device interval ' + Alloy.CFG.devices.check_device_connected_interval);
            paymentDeviceInterval = setInterval(checkPaymentDeviceConnection, Alloy.CFG.devices.check_device_connected_interval);
        }, 300);
    }
    setHamburgerWarning();
    if (storePasswordHelpers.isStorePasswordExpiring()) {
        // if the password is expiring then we need to update hamburger menu if the password gets changed
        $.listenTo(Alloy.Models.storeUser, 'change:expiration_days', setHamburgerWarning);
    }
}

/**
 * renderCart - renders the cart
 *
 * @api private
 */
function renderCart() {
    logger.info('HEADER RENDERING BASKET CHANGES');
    logger.secureLog(JSON.stringify(currentBasket.toJSON()));

    var productItems = currentBasket.getProductItems();
    var numItems = 0;
    _.each(productItems, function(productItem) {
        numItems += productItem.getQuantity();
    });
    var totalPrice = currentBasket.getOrderTotal() || currentBasket.getProductTotal();
    if (currentBasket.getOrderNo() && currentBasket.getOrderNo() !== 'null') {
        totalPrice = currentBasket.calculateBalanceDue();
    }
    var padding = '';
    if (numItems < 10) {
        padding = '  ';
    } else if (numItems < 100) {
        padding = ' ';
    }
    $.product_items_count.setText(padding + numItems);
    if (numItems == 0) {
        $.cart_label.setText(toCurrency(0));
    } else {
        $.cart_label.setText(toCurrency(totalPrice));
    }
    adjustCartLabel();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleProductSearchClick - handles the product search click
 *
 * @api private
 */
function handleProductSearchClick() {
    $.product_search_container.animate(Alloy.Animations.bounce);
    verifyAddressEditBeforeNavigation(Alloy.Router.presentProductSearchDrawer);
}

/**
 * onHeaderClick - handles the header click
 *
 * @api private
 */
function onHeaderClick() {
    Alloy.eventDispatcher.trigger('app:header_bar_clicked');
}

/**
 * handleHomeClick - handles the home button click
 *
 * @api private
 */
function handleHomeClick() {
    $.home_icon.animate(Alloy.Animations.bounce);
    verifyAddressEditBeforeNavigation(Alloy.Router.navigateToHome);
}

/**
 * adjustCartLabel - adjust the font and the top of the cart label
 * when the length of the label is more than 8
 *
 * @api private
 */
function adjustCartLabel() {
    if ($.cart_label.getText().length > labelTextLength) {
        $.cart_label.setFont(Alloy.Styles.headlineFont);
        $.cart_label.setTop(10);
    } else {
        $.cart_label.setFont(Alloy.Styles.calloutFont);
        $.cart_label.setTop(7);
    }
}

/**
 * handlePaymentDeviceClick - handles tha payment devices click
 *
 * @api private
 */
function handlePaymentDeviceClick() {
    $.payment_device_icon.animate(Alloy.Animations.bounce);
    checkPaymentDeviceConnection(true);
}

/**
 * handleAssociateLogoutClick - log the current Associate out
 *
 * @api private
 */
function handleAssociateLogoutClick() {
    showAssociatePopover();
}

/**
 * handleCustomerSearchClick - pop up the Customer Search modal
 *
 * @api private
 */
function handleCustomerSearchClick() {
    $.customer_lookup.animate(Alloy.Animations.bounce);
    Alloy.Router.presentCustomerSearchDrawer();
}

/**
 * handleCustomerLabelClick - pop up the Customer Search modal
 *
 * @api private
 */
function handleCustomerLabelClick() {
    showCustomerProfilePopover();
}

/**
 * handleWishListClick - navigate to wish list view in the cart
 *
 * @api private
 */
function handleWishListClick() {
    verifyAddressEditBeforeNavigation(function() {
        if (isCustomerLoggedIn()) {
            Alloy.Router.navigateToCart({
                switchToWishList : true
            });
        }
    });
}

/**
 * handleCustomerLabelClick - pop up the Customer Search modal
 *
 * @api private
 */
function handleCustomerLogoutClick() {
    showCustomerProfilePopover();
}

/**
 * handleCartClick - handles the cart click
 *
 * @api private
 */
function handleCartClick() {
    $.cart_container.animate(Alloy.Animations.bounce);
    verifyAddressEditBeforeNavigation(function() {
        Alloy.Router.navigateToCart({
            switchToCart : true
        });
    });
}

/**
 * handleKioskManagerLoginChange handles an associate login/logout change in kiosk mode
 *
 * @api private
 */
function handleKioskManagerLoginChange() {
    if (!isKioskManagerLoggedIn()) {
        // hide agent icon in header here
        if (associateLogoutButtonKiosk) {
            hideKioskLogout();
        }
        if (Alloy.ViewManager.isOrderSearchViewVisible()) {
            Alloy.Router.navigateToHome();
        }
    }
    setHamburgerWarning();

}

/**
 * showSupportDashboard will show the Admin Dashboard and the manager authorization dialog if needed
 * @param {Object} requireAuth - tells the admin dashboard to ask for manager authorization to show dashboard
 *
 * @api private
 */
function showSupportDashboard(requireAuth) {
    logger.info('Showing Admin Dashboard');
    allowAppSleep(false);
    Alloy.Dialog.showCustomDialog({
        fullScreen : true,
        viewName : 'admin_dashbord',
        controllerPath : 'support/index',
        options : {
            requireAuthorization : requireAuth
        },
        continueEvent : 'dashboard:dismiss',
        continueFunction : function() {
            Alloy.eventDispatcher.trigger('dashboard:dismiss');
        }
    });
}

/**
 * renderKioskMode - renders the kiosk mode
 *
 * @api private
 */
function renderKioskMode() {
    logger.info('renderKioskMode called');
    // switching from standard mode to kiosk mode we don't need to recreate this
    $.navigation_container.remove($.modal_control_container);
    if (!isKioskCartEnabled()) {
        $.navigation_container.remove($.cart_container);
    } else {
        var width = $.cart_label.getWidth();
        if (!_.isNumber(width)) {
            width = 140;
        }
        $.navigation_container.add($.cart_container);
    }

    // render exit button
    if (!exitButton) {
        exitButton = Ti.UI.createButton({
            id : 'exit_session_button',
            titleid : '_Exit',
            width : 80,
            height : 36,
            top : 10,
            left : isKioskCartEnabled() ? 710 : 925,
            borderRadius : 18,
            verticalAlign : Titanium.UI.TEXT_VERTICAL_ALIGNMENT_CENTER,
            font : Alloy.Styles.detailTextFont,
            color : Alloy.Styles.accentColor,
            backgroundColor : Alloy.Styles.color.background.light,
            accessibilityValue : 'exit_session_button'
        });
        exitButton.addEventListener('click', handleExitForKiosk);
        $.navigation_container.add(exitButton);
    } else {
        exitButton.setLeft(isKioskCartEnabled() ? 710 : 925);
    }

    $.wish_list_container.hide();
    $.wish_list_container.setHeight(0);
    $.wish_list_container.setWidth(0);
}

/**
 * renderStandard - renders the standard application
 *
 * @api private
 */
function renderStandard() {
    logger.info('HEADER RENDERING ASSOCIATE CHANGES');
    logger.secureLog(JSON.stringify(currentAssociate.toJSON()));
    if (exitButton) {
        $.navigation_container.remove(exitButton);
        exitButton.removeEventListener('click', handleExitForKiosk);
        exitButton = null;
        $.navigation_container.add($.modal_control_container);
        $.navigation_container.add($.cart_container);
    }

    var associateInfo = currentAssociate.getAssociateInfo();
    if (associateInfo) {
        var firstName = associateInfo.firstName;
        var lastName = associateInfo.lastName;

        var associateText = firstName ? firstName + ' ' : '';
        associateText += lastName ? lastName[0] + '.' : '';

        if (!firstName && !lastName) {
            associateText = _L('Associate');
        }
        $.associate_label.setText(associateText);
    }

    logger.info('HEADER RENDERING CUSTOMER CHANGES');
    logger.secureLog(JSON.stringify(currentCustomer.toJSON()));
    var agentLoggedIn = currentAssociate.isLoggedIn();
    var customer_no = currentCustomer.getCustomerNumber();
    var canLOBO = currentAssociate.hasPermissions() ? currentAssociate.getPermissions().allowLOBO : true;

    if (!agentLoggedIn || !canLOBO) {
        $.customer_label.setVisible(false);
        $.customer_icon_loggedIn.setVisible(false);
        $.customer_lookup.setVisible(false);
    } else if (customer_no) {
        $.customer_lookup.hide();
        $.customer_lookup.setWidth(0);
        var firstName = currentCustomer.getFirstName();
        var lastName = currentCustomer.getLastName();
        var customerText = firstName ? firstName + ' ' : '';
        customerText += lastName ? lastName : '';

        $.customer_label.setText(customerText);
        $.logged_in_customer_container.show();
        $.logged_in_customer_container.setWidth(220);
        $.customer_label.setVisible(true);
        $.customer_icon_loggedIn.setVisible(true);
        if (Alloy.CFG.enable_wish_list) {
            $.wish_list_container.setHeight(45);
            $.wish_list_container.setWidth('6%');
            $.wish_list_container.show();
        } else {
            $.wish_list_container.hide();
            $.wish_list_container.setHeight(0);
            $.wish_list_container.setWidth(0);
        }
    } else {
        $.logged_in_customer_container.hide();
        $.customer_lookup.show();
        $.customer_lookup.setWidth(220);
        $.customer_icon_loggedIn.setVisible(false);
        $.wish_list_container.hide();
        $.wish_list_container.setHeight(0);
        $.wish_list_container.setWidth(0);
    }
}

/**
 * handleExitForKiosk - handles the exit button click for kiosk
 *
 * @api private
 */
function handleExitForKiosk() {
    Alloy.Dialog.showConfirmationDialog({
        messageString : _L('Reset Session Message'),
        titleString : _L('Reset Session'),
        okFunction : function() {
            if (Alloy.Kiosk.hasOwnProperty('order_complete_timer')) {
                clearTimeout(Alloy.Kiosk.order_complete_timer);
            }
            Alloy.Router.associateLogout();
            Alloy.Kiosk = {};
        }
    });
}

/**
 * hideKioskLogout - hides the kiosk logout
 *
 * @api private
 */
function hideKioskLogout() {
    $.navigation_container.remove(associateLogoutButtonKiosk);
    associateLogoutButtonKiosk.removeEventListener('click', handleAssociateButtonForKiosk);
    associateLogoutButtonKiosk = null;
}

/**
 * handleAssociateButtonForKiosk - handles the associate login button click
 *
 * @api private
 */
function handleAssociateButtonForKiosk() {
    // if logged in, then logout
    if (Alloy.Kiosk.manager) {
        Alloy.Kiosk.manager = null;
        Alloy.eventDispatcher.trigger('kiosk:manager_login_change');
        notify(_L('Associate Logged Out'));
        return;
    }

    var associate = Alloy.createModel('associate');
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'associate/authorization',
        initOptions : {
            titleText : _L('Associate Authorization'),
            subTitleText : _L('Enter Associate Credentials Kiosk'),
            managerIdHintText : _L('Associate ID'),
            managerPasswordHintText : _L('Password'),
            associate : associate,
            checkForAdminPrivileges : false
        },
        continueEvent : 'authorization:dismiss',
        continueFunction : function(result) {
            if (result && !result.result) {// cancel was pressed
                return;
            }

            if (result) {
                Alloy.Kiosk.manager = result.associate;
                Alloy.eventDispatcher.trigger('kiosk:manager_login_change');
                if (Alloy.Kiosk.manager) {
                    // show associate icon in header here
                    associateLogoutButtonKiosk = Ti.UI.createButton({
                        id : 'associate_logout_button_header',
                        height : 24,
                        width : 24,
                        left : isKioskCartEnabled() ? 665 : 880,
                        top : 15,
                        backgroundImage : Alloy.Styles.agentImage,
                        accessibilityLabel : 'associate_logout_button_header'
                    });
                    associateLogoutButtonKiosk.addEventListener('click', handleAssociateButtonForKiosk);
                    $.navigation_container.add(associateLogoutButtonKiosk);
                }
                Alloy.Router.showHideHamburgerMenu();
            }
        }
    });
}

/**
 * showCustomerProfilePopover - shows the customer profile popover
 *
 * @api private
 */
function showCustomerProfilePopover() {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'components/customerPopover',
        continueEvent : 'customerPopover:dismiss',
    });
}

/**
 * showAssociatePopover - shows the associate popover
 *
 * @api private
 */
function showAssociatePopover() {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'components/associatePopover',
        continueEvent : 'associatePopover:dismiss',
    });
}

/**
 * cleanupComponentsOnExit - clean all the components on exiting kiosk
 *
 * @api private
 */
function cleanupComponentsOnExit() {
    // hide agent icon in header here
    if (associateLogoutButtonKiosk) {
        hideKioskLogout();
    }
}

/**
 * isCustomerLoggedIn - checks if the customer is logged in or not
 *
 * @api private
 */
function isCustomerLoggedIn() {
    return currentCustomer.isLoggedIn();
}

/**
 * checkPaymentDeviceConnection - checks the payment device connection
 *
 * @param userTrigger
 *
 * @api private
 */
function checkPaymentDeviceConnection(userTrigger) {
    var userTriggered = userTrigger || false;
    logger.info('checking payment device');
    updateDeviceStatus(userTriggered, paymentTerminal.verifyDeviceConnection());
}

/**
 * updateDeviceStatus - updates the device status
 *
 * @param userTriggered
 * @param connected
 *
 * @api private
 */
function updateDeviceStatus(userTriggered, connected) {
    if ($.payment_device_icon.getVisible()) {
        logger.info('checking payment device connection');
        if (connected) {
            if ($.payment_device_icon.image == Alloy.Styles.paymentDeviceConnectedImage) {
                if (!userTriggered) {
                    // skip any messaging to user
                    return;
                }
            }
            $.payment_device_icon.setImage(Alloy.Styles.paymentDeviceConnectedImage);
            notify(_L('Payment Device Connected'), 3000);
        } else {
            if ($.payment_device_icon.image == Alloy.Styles.paymentDeviceNotConnectedImage) {
                if (!userTriggered) {
                    // skip any messaging to user
                    return;
                }
            }
            $.payment_device_icon.setImage(Alloy.Styles.paymentDeviceNotConnectedImage);
            Alloy.Router.checkPaymentDevice(true);
        }
    }
}

/**
 * showHideHamburgerMenu - Show or hide hamburger menu
 *
 * @api private
 */
function showHideHamburgerMenu() {
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
    if (!isKioskManagerLoggedIn() && isKioskMode()) {
        handleAssociateButtonForKiosk();
    } else {

        var promise = new _.Deferred;
        if (storePasswordHelpers.isStorePasswordExpiring()) {
            promise = storePasswordHelpers.checkStorePassword();
        } else {
            promise.resolve();
        }
        Alloy.Router.showActivityIndicator(promise);
        promise.done(function() {
            setHamburgerWarning();
            Alloy.Router.showHideHamburgerMenu();
        });
    }
}

/**
 * setHamburgerWarning - Show warning icon on hamburger is store password is expiring soon
 *
 * @api private
 */
function setHamburgerWarning() {
    if ((!isKioskMode() && storePasswordHelpers.isStorePasswordExpiring()) || (isKioskMode() && isKioskManagerLoggedIn() && storePasswordHelpers.isStorePasswordExpiring())) {
        $.hamburger_menu.setBackgroundImage(Alloy.Styles.hamburgerMenuImageNotification);
    } else {
        $.hamburger_menu.setBackgroundImage(Alloy.Styles.hamburgerMenuImageWhite);
    }
}

//---------------------------------------------------
// ## CONSTRUCTOR

$.cart_label.setText(toCurrency(0));
