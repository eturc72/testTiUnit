// ©2016-2017 salesforce.com, inc. All rights reserved
/**
 * controllers/components/hamburgerMenu.js - App hamburger menu
 */

//---------------------------------------------------
// ## VARIABLES

// Arguments passed into this controller can be accessed off of the `$.args` object directly or:
var args = $.args;
var currentCustomer = Alloy.Models.customer;
var customerAddress = Alloy.Models.customerAddress;
var currentBasket = Alloy.Models.basket;
var currentAssociate = Alloy.Models.associate;
var storePasswordHelpers = require('storePasswordHelpers');
var logger = require('logging')('components:hamburgerMenu', getFullControllerPath($.__controllerPath));
var tableRowStyle = $.createStyle({
    classes : ['table_view_row'],
    apiName : 'Ti.UI.TableRowView'
});
var verifyAddressEditBeforeNavigation = require('EAUtils').verifyAddressEditBeforeNavigation;

// this is the menu that will be rendered every time we show the hamburger menu. Some menu items could be filtered out
// depending on the current state of the app.

var allTableData = [{
    id : 'sales_dashboard',
    accessibilityValue : 'sales_dashboard',
    title : _L('Sales Dashboard')
}, {
    id : 'product_search',
    accessibilityValue : 'product_search',
    title : _L('Search Button')
}, {
    id : 'customer_search',
    accessibilityValue : 'customer_search',
    title : _L('Customer Search Button')
}, {
    id : 'new_customer',
    accessibilityValue : 'new_customer',
    title : _L('Create Customer')
}, {
    id : 'wish_list',
    accessibilityValue : 'wish_list',
    title : _L('Wish List Button')
}, {
    id : 'clear_cart',
    accessibilityValue : 'clear_cart',
    title : _L('Clear Cart')
}, {
    id : 'order_search',
    accessibilityValue : 'order_search',
    title : _L('Order Search Button')
}, {
    id : 'customer_logout',
    accessibilityValue : 'customer_logout',
    title : _L('Logout Customer')
}];

//each black list array contains the ids of the menus to filter out based on current state of the app.
var isKioskModeMenuBlackList = ['customer_search', 'sales_dashboard', 'new_customer', 'wish_list'];
var isCustomerLogoutMenuBlackList = ['wish_list', 'customer_logout'];
var isCustomerLoginMenuBlackList = ['clear_cart'];
var isWishListDisabledBlackList = ['wish_list'];

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.showHideHamburgerMenu = showHideHamburgerMenu;
exports.hideHamburgerMenu = hideHamburgerMenu;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.side_bar.setData([]);
    $.container.removeEventListener('click', showHideHamburgerMenu);
    $.associate_logout.removeEventListener('singletap', onAssociateLogoutClick);
    $.admin_dashboard.removeEventListener('singletap', handleAdminDashboardButtonClick);
    $.side_bar.removeEventListener('singletap', handleMenuSelect);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * hideHamburgerMenu - hide hamburger menu
 *
 * @param {Deferred} deferred
 *
 * @api public
 */
function hideHamburgerMenu(deferred) {
    if ($.container.getVisible()) {
        $.side_bar_wrapper.animate({
            duration : 300,
            left : '-30%'
        }, function() {
            $.container.setVisible(false);
            $.container.setWidth(0);
            $.container.setHeight(0);
            $.container.setZIndex(null);
            if (deferred && _.isFunction(deferred.resolve)) {
                deferred.resolve();
            }
        });
    }
}

/**
 * showHamburgerMenu - display hamburger menu
 *
 * @param {Deferred} deferred
 *
 * @api private
 */
function showHamburgerMenu(deferred) {
    if (!$.container.getVisible()) {
        updateAssociateName();
        renderMenuItems();
        $.container.setWidth('100%');
        $.container.setHeight('100%');
        $.container.setZIndex(100);
        $.container.setVisible(true);
        $.side_bar_wrapper.animate({
            duration : 300,
            left : 0
        }, function() {
            if (deferred && _.isFunction(deferred.resolve)) {
                deferred.resolve();
            }
        });
    }
}

/**
 * filterMenuItems - filter menu items before they are rendered
 *
 * @param {Array} filter - array of menu items ids to filter out
 * @param {Array} listToFilter - Array of menu items to be filtered
 *
 * @api private
 */
function filterMenuItems(filter, listToFilter) {
    var filteredData;
    var tableData = listToFilter || allTableData;
    if (Object.prototype.toString.apply(filter) === '[object Array]') {
        filteredData = tableData.filter(function(row) {
            return filter.indexOf(row.id) == -1;
        });
    } else {
        filteredData = tableData;
    }
    return filteredData;

}

/**
 * generateMenuRows - create a table view row for each menu item
 *
 * @param {Array} filteredData - array of menu items
 *
 * @api private
 */
function generateMenuRows(filteredData) {
    var renderRows = [];
    _.each(filteredData, function(rowData) {
        if (rowData.id == 'sales_dashboard') {
            // don't show the sales dashboard item if the associate doesn't have the privileges to see them
            if (!currentAssociate.hasStoreLevelSalesReportsPrivileges() && !currentAssociate.hasSalesReportsPrivileges()) {
                return;
            }
        }
        var row;
        if (rowData.image) {
            var imageRow = Alloy.createController('components/menuImageRow', {
                submenuLabel : rowData.submenuLabel,
                image : rowData.image,
                properties : tableRowStyle,
                label : rowData.label
            });
            row = imageRow.getView();
            row.id = rowData.id;
            row.accessibilityValue = rowData.accessibilityValue;
        } else {
            row = Ti.UI.createTableViewRow(tableRowStyle);
            row = _.extend(row, rowData);
        }
        renderRows.push(row);
    });
    return renderRows;
}

/**
 * executeMenuAction -  execute action triggered by the menu item selected
 *
 * @param {String} selectedMenuItemId - selected menu item id
 *
 * @api private
 */
function executeMenuAction(selectedMenuItemId) {
    switch(selectedMenuItemId) {
    case 'sales_dashboard':
        showSalesDashboard();
        break;
    case 'new_customer' :
        showNewCustomerDialog();
        break;

    case 'customer_logout' :
        onCustomerLogoutClick();
        break;

    case 'order_search':
    //fall through
    case 'product_search':
    //fall through
    case 'customer_search':
        showSearchDialog(selectedMenuItemId);
        break;

    case 'wish_list':
        verifyAddressEditBeforeNavigation(showCurrentCustomerWishList);
        break;
    case 'clear_cart':
        handleClearCart();
        break;
    case 'change_store_password':
        handleChangeStorePassword();
        break;
    default:
        logger.error('Case for ' + selectedMenuItemId + ' is not handled.');
        break;
    }
}

/**
 * showSalesDashboard - Show sales dashboard
 *
 * @api private
 */
function showSalesDashboard() {
    Alloy.CFG.sales_reports.enabled_charts = {};
    if (currentAssociate.hasStoreLevelSalesReportsPrivileges()) {
        Alloy.CFG.sales_reports.enabled_charts = Alloy.CFG.sales_reports.charts.store_level_privileges;
    } else {
        if (currentAssociate.hasSalesReportsPrivileges()) {
            Alloy.CFG.sales_reports.enabled_charts = Alloy.CFG.sales_reports.charts.associate_level_privileges;
        }
    }
    Alloy.Dialog.showCustomDialog({
        fullScreen : true,
        viewName : 'associate_profile',
        controllerPath : 'reports/index',
        continueEvent : 'salesReport:dismiss'
    });
}

/**
 * showSearchDialog - Show search dialog
 *
 * @param {String} searchTabId - Search tab id
 *
 * @api private
 */
function showSearchDialog(searchTabId) {
    switch(searchTabId) {
    case 'product_search':
        verifyAddressEditBeforeNavigation(Alloy.Router.presentProductSearchDrawer);
        break;

    case 'customer_search':
        verifyAddressEditBeforeNavigation(Alloy.Router.presentCustomerSearchDrawer);
        break;

    case 'order_search':
        verifyAddressEditBeforeNavigation(Alloy.Router.presentOrderSearchDrawer);
        break;
    }

}

/**
 * showNewCustomerDialog - Show new customer dialog
 *
 * @api private
 *
 */
function showNewCustomerDialog() {
    if (currentCustomer.isLoggedIn()) {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('The current customer needs to be logged out before creating a new one. Tap on "Continue" to logout the customer and create a new customer.'),
            titleString : _L('Create Customer Title'),
            okButtonString : _L('Continue'),
            okFunction : function() {
                Alloy.Router.customerLogout().done(function() {
                    Alloy.Router.presentCreateAccountDrawer();
                });
            }
        });
    } else {
        Alloy.Router.presentCreateAccountDrawer();
    }
}

/**
 * showCurrentCustomerWishList - Show current customer wish list
 *
 * @api private
 */
function showCurrentCustomerWishList() {
    if (currentCustomer.isLoggedIn()) {
        Alloy.Router.navigateToCart({
            switchToWishList : true
        });
    }
}

/**
 * handleChangeStorePassword - handle change store password
 *
 * @api private
 *
 */
function handleChangeStorePassword() {
    logger.info('handleChangeStorePassword called');
    Alloy.Router.presentChangeStorePasswordDrawer();
}

/**
 * handleClearCart - clear cart
 *
 * @api private
 *
 */
function handleClearCart() {
    var employee_code = currentAssociate.getEmployeeId();
    var employee_pin = currentAssociate.getPasscode();
    // clearing the cart requires establishing a new session. To do this
    // we need to clear the cookies
    Alloy.Globals.resetCookies();

    var deferred = new _.Deferred();

    // but if clearing the cart fails, we've already cleared the cookies, so we have
    // to keep trying until successfully clearing the cart
    var retryFailure = function() {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('There was a problem clearing the cart. Please try again.'),
            titleString : _L('Unable to clear the cart.'),
            okButtonString : _L('Retry'),
            hideCancel : true,
            okFunction : function() {
                removeNotify();
                handleClearCart();
            }
        });
    };

    // logging in the associate is what establishes a new session
    Alloy.Router.showActivityIndicator(deferred);
    currentAssociate.loginAssociate({
        employee_id : employee_code,
        passcode : employee_pin
    }).done(function() {
        notify(_L('Cart Cleared'));
        currentBasket.deleteBasket().done(function() {
            currentBasket.getBasket({
                c_eaEmployeeId : employee_code
            }).done(function() {
                currentBasket.trigger('basket_sync');
                Alloy.eventDispatcher.trigger('cart_cleared');
                notify(_L('Cart Cleared'));
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
                retryFailure();
            });
        }).fail(function() {
            deferred.reject();
            retryFailure();
        });
    }).fail(function() {
        deferred.reject();
        retryFailure();
    });
}

/**
 * openAdminDashboardWindow - opens the Admin Dashboard window
 *
 * @api private
 */
function openAdminDashboardWindow() {
    logger.info('Opening Admin Dashboard Window');
    Alloy.Dialog.showCustomDialog({
        fullScreen : true,
        viewName : 'admin_dashbord',
        controllerPath : 'support/index',
        continueEvent : 'dashboard:dismiss',
        continueFunction : function() {
            Alloy.eventDispatcher.trigger('dashboard:dismiss');
        }
    });
}

/**
 * showAdminDashboard -  will show the Admin Dashboard and the manager authorization dialog if needed
 *
 * @param {Object} requireAuth - tells the admin dashboard to ask for manager authorization to show dashboard
 *
 * @api private
 */
function showAdminDashboard(requireAuth) {
    logger.info('Showing Admin Dashboard');
    allowAppSleep(false);
    if (requireAuth) {
        var associate = Alloy.createModel('associate');
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'associate/authorization',
            initOptions : {
                associate : associate,
                subTitleText : _L('Enter Manager Credentials Admin'),
                successMessage : _L('Manager Credentials Accepted')
            },
            continueEvent : 'authorization:dismiss',
            continueFunction : function(result) {
                if (result && result.result) {
                    openAdminDashboardWindow();
                }
            }
        });
    } else {
        openAdminDashboardWindow();
    }
}

/*
 * renderMenuItems - Render hamburger menu items base on current app state
 *
 * @api private
 */
function renderMenuItems() {
    logger.info('rendering menu items');
    var menuData;
    if (!currentCustomer.isLoggedIn()) {
        menuData = filterMenuItems(isCustomerLogoutMenuBlackList);
    }

    if (isKioskMode()) {
        menuData = filterMenuItems(isKioskModeMenuBlackList, menuData);

        if (isKioskManagerLoggedIn()) {
            $.admin_dashboard_wrapper.show();
            $.admin_dashboard_wrapper.setHeight(62);
            $.admin_dashboard_wrapper.setEnable(true);
        } else {
            $.admin_dashboard_wrapper.hide();
            $.admin_dashboard_wrapper.setHeight(0);
            $.admin_dashboard_wrapper.setEnable(false);
        }
    }

    if (!isKioskMode() && currentCustomer.isLoggedIn()) {
        menuData = filterMenuItems(isCustomerLoginMenuBlackList);
    }

    if (!Alloy.CFG.enable_wish_list) {
        menuData = filterMenuItems(isWishListDisabledBlackList, menuData);
    }

    if (storePasswordHelpers.isStorePasswordExpiring()) {
        var expirationDays = Alloy.Models.storeUser.getExpirationDays();
        menuData.push({
            id : 'change_store_password',
            accessibilityValue : 'change_store_password',
            submenuLabel : expirationDays == 1 ? String.format(_L('Expires in %d Day'), expirationDays) : String.format(_L('Expires in %d Days'), expirationDays),
            label : _L('Change Store Password Menu'),
            image : Alloy.Styles.warningIcon
        });
    }

    $.side_bar.setData(generateMenuRows(menuData));
}

/**
 * handleAdminDashboardAction - check associate permissions before showing admin dashboard
 *
 * @api private
 */
function handleAdminDashboardAction() {
    if ((!isKioskMode() && currentAssociate.hasAdminPrivileges()) || (isKioskManagerLoggedIn() && getKioskManager().hasAdminPrivileges())) {
        showAdminDashboard();
    } else {
        logger.info('Ask Manager credentials');
        showAdminDashboard(true);
    }
}

/**
 * updateAssociateName -  update the associate salutation label with the current associate name
 *
 * @api private
 */
function updateAssociateName() {
    if (isKioskMode() && isKioskManagerLoggedIn()) {
        $.associate_salute_msg.setText(String.format(_L('Hi, %s'), getKioskManager().getFullName()));
    } else {
        $.associate_salute_msg.setText(String.format(_L('Hi, %s'), currentAssociate.getFullName()));
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * showHideHamburgerMenu - display or hide hamburger menu
 *
 * @return {Deferred} promise
 * @api public
 */
function showHideHamburgerMenu() {
    var deferred = new _.Deferred();

    if (!$.container.getVisible()) {
        showHamburgerMenu(deferred);
    } else {
        hideHamburgerMenu(deferred);
    }

    return deferred.promise();
}

/**
 * handleMenuSelect - handle menu item selected event
 *
 * @param {Object} event
 *
 * @api private
 */
function handleMenuSelect(event) {
    if (event.row && event.row.id) {
        showHideHamburgerMenu().done(function() {
            executeMenuAction(event.row.id);
        });
    }

}

/**
 * handleAdminDashboardButtonClick - handle admin dashboard button click
 *
 * @api private
 */
function handleAdminDashboardButtonClick() {
    showHideHamburgerMenu().done(handleAdminDashboardAction);
}

/**
 * onCustomerLogoutClick - tap on logout button for customer
 *
 * @api private
 */
function onCustomerLogoutClick() {
    verifyAddressEditBeforeNavigation(Alloy.Router.customerLogout);
}

/**
 * onAssociateLogoutClick - tap on Logout associate button
 *
 * @api private
 */
function onAssociateLogoutClick() {
    showHideHamburgerMenu().done(function() {
        verifyAddressEditBeforeNavigation(function() {
            // if kiosk mode only log associate out of kiosk mode not the app
            if (isKioskManagerLoggedIn()) {
                Alloy.Kiosk.manager = null;
                Alloy.eventDispatcher.trigger('kiosk:manager_login_change');
                notify(_L('Associate Logged Out'));
            } else {
                Alloy.Router.associateLogout();
            }
        });
    });
}
