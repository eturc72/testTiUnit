// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/index.js - Admin Dashboard main window
 */

//---------------------------------------------------
// ## VARIABLES

var currentPage = -1;
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var logger = require('logging')('support:index', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.listenTo($.header, 'changeDashboardPage', handlePageSelection);
$.backdrop.addEventListener('click', handleClose);
$.support_window.addEventListener('postlayout', handlePostLayout);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    showAdminDashboard();
    $.app_config_window.init();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.backdrop.removeEventListener('click', handleClose);
    $.support_window.removeEventListener('postlayout', handlePostLayout);
    // defined in view xml file
    $.close_icon.removeEventListener('click', handleClose);
    // deinit required controllers from view xml file
    $.header.deinit();
    $.info_window.deinit();
    $.app_config_window.deinit();
    $.payment_terminal_window.deinit();
    $.receipt_printer_window && $.receipt_printer_window.deinit();
    $.testing_window.deinit();
    $.logging_window.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showAdminDashboard - will show the dashboard after manager login if needed
 *
 * @api private
 */
function showAdminDashboard() {
    $.dashboard.setWidth('95%');
    $.dashboard.setHeight('93%');
    $.dashboard.setTop('5%');
    $.dashboard.setBottom('5%');
    $.dashboard.setRight('3%');
    $.dashboard.setLeft(20);
    $.dashboard.setOpacity('1.0');
    $.dashboard_container.setHeight(Ti.UI.FILL);
    $.dashboard_container.setWidth(Ti.UI.FILL);
    handlePageSelection({
        page : 'configurations'
    });
}

/**
 * continuePageSelection - will perform the page selection in the admin dashboard
 *
 * @param {Object} event
 * @api private
 */
function continuePageSelection(event) {
    if (currentPage >= 0) {
        $.header_tabgroup.children[currentPage].hide();
    }

    switch (event.page) {
    case 'configurations':
        currentPage = 0;
        break;
    case 'app_config':
        currentPage = 1;
        $.app_config_window.render();
        break;
    case 'payment_terminal':
        currentPage = 2;
        break;
    case 'receipt_printer':
        currentPage = 3;
        break;
    case 'test':
        currentPage = 4;
        break;
    case 'logs':
        currentPage = 5;
        break;
    }
    $.header_tabgroup.children[currentPage].show();
    $.header.selectTab(event.page);
    Alloy.eventDispatcher.trigger('session:renew');
}

/**
 * continueClose - will dismiss the dashboard
 *
 * @api private
 */
function continueClose() {
    Alloy.eventDispatcher.trigger('session:renew');
    $.trigger('dashboard:dismiss', {});
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handlePostLayout -  will setup view after layout of window
 *
 * @api private
 */
function handlePostLayout() {
    $.titlebar.setVisible(true);
    $.dashboard_container.setVisible(true);
}

/**
 * handlePageSelection - is event handler for when switching tabs and could show warning if needed for app settings tab
 *
 * @param {Object} event
 * @api private
 */
function handlePageSelection(event) {
    if((event.page == 'configurations' && currentPage==0) ||
       (event.page == 'app_config' && currentPage==1) ||
       (event.page == 'payment_terminal' && currentPage==2) ||
       (event.page == 'receipt_printer' && currentPage==3) ||
       (event.page == 'test' && currentPage==4) ||
       (event.page == 'logs' && currentPage==5)) {
        return;
    }

    if (currentPage == 1) {
        $.app_config_window.showWarning().done(function() {
            continuePageSelection(event);
        });
    } else {
        continuePageSelection(event);
    }
}

/**
 * handleClose - is the event handler for closing the adming dashboard and could show warning if needed for app settings tab
 *
 * @api private
 */
function handleClose() {
    if (currentPage == 1) {
        $.app_config_window.showWarning().done(function() {
            continueClose();
        });
    } else {
        continueClose();
    }
}
