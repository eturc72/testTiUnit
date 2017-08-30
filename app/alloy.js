// ©2013-2017 salesforce.com, inc. All rights reserved.
// The contents of this file will be executed before any of
// your view controllers are ever executed, including the index.
// You have access to all functionality on the `Alloy` namespace.
//
// This is a great place to do any initialization for your app
// or create any global variables/functions that you'd like to
// make available throughout your app. You can easily make things
// accessible globally by attaching them to the `Alloy.Globals`
// object. For example:
//
//     Alloy.Globals.someGlobalFunction = function(){};

var logger = require('logging')('application:alloy', 'app/alloy');
var lastTrace = -1;
var lastMemory = -1;
var swissArmyUtils = require('com.demandware.SwissArmyUtils');

/**
 * ucfirst - Capitalize first character
 * @param {String} text - the text to capitalize
 * @return string with first character capitalized
 */
var ucfirst = function(text) {
    return text ? text[0].toUpperCase() + text.substr(1) : text;
};

var getFullControllerPath = function(controllerPath) {
    if (controllerPath.indexOf('app/controllers/') == -1) {
        return "app/controllers/" + controllerPath;
    }
    return controllerPath;
};

/**
 * supportLog - output messae to the global console log
 * @param {String} msg - the message to add to the log
 */
var supportLog = function(msg) {
    if (Alloy.Globals.consoleLog) {
        Alloy.Globals.consoleLog.unshift(msg);

        if (Alloy.Globals.consoleLog.length > 100) {
            Alloy.Globals.consoleLog.pop();
        }
    }
};

/**
 * setRuntimeLoggableCategories - sets the categories to be used during runtime for the admin dashboard log
 * @param {Array} categories - the list of categories
 */
var setRuntimeLoggableCategories = function(categories) {
    Alloy.Globals.runtimeLoggableCategories = categories;
};

/**
 * getLoggableCategories - gets the runtime loggable categories or the Alloy.CFG.loggableCategories if no runtime
 */
var getLoggableCategories = function() {
    var loggableCategories;
    var finalCategories = [],
        loggableSubcategories = {};

    if (Alloy.Globals.runtimeLoggableCategories && Alloy.Globals.runtimeLoggableCategories.length > 0) {
        loggableCategories = Alloy.Globals.runtimeLoggableCategories;
    } else {
        loggableCategories = Alloy.CFG.loggableCategories;
    }

    _.each(loggableCategories, function(category) {
        var index = category.indexOf(':');
        if (index != -1) {
            var catName = category.substring(0, index);
            var subCatNames = category.substring(index + 1);

            if (!loggableSubcategories[catName]) {
                loggableSubcategories[catName] = [];
            }

            loggableSubcategories[catName].push(subCatNames.split(':'));
        } else {
            finalCategories.push(category);
        }
    });

    return {
        loggableCategories : finalCategories,
        loggableSubcategories : loggableSubcategories
    };
};

/**
 * removeAllChildren will remove direct and sub children from the view specified
 *
 * @param {Ti.UI.View} view to remove the children and sub children from
 */
var removeAllChildren = function(view) {
    _.each(view.getChildren(), function(child) {
        view.remove(child);
        // set this on a timer b/c we don't need to wait for this to complete, but we do want to get rid of all children recursively
        setTimeout(function() {
            removeAllChildren(child);
        }, 50);
    });
};

/**
 * allowAppSleep - whether or not the app should be able to go to sleep or always stay running
 */
var allowAppSleep = function(truth) {
    logger.info('Setting allow app sleep to ' + truth);
    Ti.App.idleTimerDisabled = !truth;
};

//---------------------------------------------------------------
// Include external modules

// empty router model
Alloy.eventDispatcher = new Backbone.Model();

// Include appConfigurations, set Alloy.CFG values
require('appConfiguration').loadDefaultConfigs();

// Changes to Alloy API
require('alloyAdditions');
// Handles open, close, pause & resume app events
require('appResume');
// Handles image proxy caching among other things
require('imageUtils');

var moment = require('alloy/moment');

//---------------------------------------------------------------
// Application Initialization

// Resets cookies for storefront host
Alloy.Globals.resetCookies = function() {
    var http = Ti.Network.createHTTPClient({
        validatesSecureCertificate : Alloy.CFG.ocapi.validate_secure_cert
    });
    var host = Alloy.CFG.storefront_host;
    http.clearCookies('http://' + host);
    http.clearCookies('https://' + host);
};

Alloy.Styles = require('alloy/styles/' + Alloy.CFG.theme).styles;
Alloy.Animations = {
    bounce : Ti.UI.createAnimation({
        transform : Ti.UI.create2DMatrix().scale(0.9, 0.9),
        duration : 100,
        autoreverse : true,
        repeat : 1
    }),
    bigBounce : Ti.UI.createAnimation({
        transform : Ti.UI.create2DMatrix().scale(0.6, 0.6),
        duration : 100,
        autoreverse : true,
        repeat : 1
    }),
    fadeOut : Ti.UI.createAnimation({
        opacity : 0,
        duration : 400
    }),
    fadeIn : Ti.UI.createAnimation({
        opacity : 1.0,
        duration : 400
    })
};

// Application timers for client and server session keep alives
require('timers');

// Create after Alloy.Styles so they can be used for dialogs
var DialogMgr = require('DialogMgr');
Alloy.Dialog = new DialogMgr();

/**
 * notify - Show 'growl-style' notification
 * @param {String} text - the message to show in the growl
 * @param {Object} config - additional configuration for the growl like timeout or preventAutoClose
 */
var notify = function(text, config) {
    var timeout = config && config.timeout || Alloy.CFG.notification_display_timeout;
    var preventAutoClose = config && config.preventAutoClose;
    Alloy.Dialog.showNotifyGrowl({
        label : text,
        timeout : timeout,
        preventAutoClose : preventAutoClose
    });
};

/**
 * removeNotify - removes notify/growl messages that are shown
 * @param {String} message (optional) - if provided then only removes the notify with that message if showing
 */
var removeNotify = function(message) {
    Alloy.Dialog.removeNotifyGrowl(message);
};

Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:unload', function() {
    Alloy.Kiosk.manager = null;
});

//-------------------------------------------------------------
/* Kiosk mode initialization and helper functions */

Alloy.CFG.kiosk_mode = {};
var isKioskMode = function() {
    return Alloy.CFG.kiosk_mode.enabled;
};

Alloy.Kiosk = {
    manager : null
};

var isKioskManagerLoggedIn = function() {
    return isKioskMode() && Alloy.Kiosk.manager;
};

var isKioskCartEnabled = function() {
    return Alloy.CFG.kiosk_mode.enable_cart;
};

var getKioskManager = function() {
    if (isKioskManagerLoggedIn()) {
        return Alloy.Kiosk.manager;
    }

    return null;
};

//-------------------------------------------------------------
/**
 * recordHistoryEvent - Records events for later use / analytics/audit trail/usage
 *
 * @param {Object} hash should include at least a 'type' key/value
 *
 * @api private
 */
var recordHistoryEvent = (function() {
    var _lastNavEvent = {
        route : 'begin'
    };
    function recordHistoryEvent(event) {
        event = event || {};
        var history_event = _.extend({}, {
            associate_id : Alloy.Models.associate.getEmployeeId() || 'public',
            customer_id : Alloy.Models.customer.getCustomerNumber() || 'guest customer',
            time : new Date().getTime(),
            type : event.type || 'undefined',
            details : JSON.stringify(event)//.replace('\'', '\\\'')
        });

        if (event.route) {
            history_event.route = event.route;
        }

        if (_lastNavEvent && _lastNavEvent.route && event.route) {
            if (Alloy.CFG.use_appcelerator_analytics) {
                Ti.Analytics.navEvent(event.route, _lastNavEvent.route, event.type, event);
            }
            _lastNavEvent = event;
        } else {
            if (Alloy.CFG.use_appcelerator_analytics) {
                Ti.Analytics.featureEvent(event.type, event);
            }
        }

        var newEvent = Alloy.createModel('history');
        newEvent.set(history_event);
        //newEvent.save();
        Alloy.Collections.history.add(newEvent);
    }

    return recordHistoryEvent;
})();

// FIXME: This should get extracted into a Logger module, right?

Alloy.Globals.consoleLog = [];

// Dynamic Loggable Categories are stored here (private API) (use getLoggableCategories() )
Alloy.Globals.runtimeLoggableCategories = [];

swissArmyUtils.redirectConsoleLogToFile();

module.exports = {notify:notify,
ucfirst:ucfirst,
getFullControllerPath:getFullControllerPath,
supportLog:supportLog,
allowAppSleep:allowAppSleep,
setRuntimeLoggableCategories:setRuntimeLoggableCategories,
getLoggableCategories:getLoggableCategories,
removeAllChildren:removeAllChildren,
notify:notify};