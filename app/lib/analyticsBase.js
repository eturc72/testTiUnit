// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/analytics.js - main anaylics module
 */

/**
 * This class is the main analytics module. This is what an analytics integration plugs into.
 * In order to create your own integration with an analytics service, you will need to implement
 * the following functions (be sure to export these functions):
 *
 * function startAnalytics(event) {...};
 * function stopAnalytics(event) {...};
 * function fireAnalyticsEvent(data) {...};
 * function fireUserEvent(data) {...};
 * function fireScreenEvent(data) {...};
 * function fireTransactionEvent(data) {...};
 * function fireTransactionItemEvent(data) {...};
 * function fireExceptionEvent(data) {...};
 *
 * You will also need to implement the following function for when to dispatch the events if your
 * dispatch_type in your config is set to 'on_logout' or 'low_net_traffic'. 'on_logout' means events
 * will be sent when the associate logs out. 'low_net_traffic' means that the event
 * to tell the analytics service to send the events out will be sent when there is low network
 * activity in the application.
 *
 * function dispatchEvents() {...};
 */

//----------------------------------------
// ## VARIABLES

var logger = require('logging')('analytics', 'app/lib/analytics');

var analyticsTimer = null;
var eventCount = 0;
var analyticsModules = [];

//----------------------------------------
// ## APP LISTENERS

// configuration changes may be updated at login
Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:prelogin', function(event) {
    if (isAnalyticsEnabled()) {
        _.each(Alloy.CFG.analytics.modules, function(module) {
            logger.info('adding and starting analyticsModule ' + module);
            var analyticsModule = require(module);
            analyticsModules.push(analyticsModule);
            analyticsModule.startAnalytics(event);
        });
    }
});

Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', function(event) {
    if (isAnalyticsEnabled()) {
        startTimer();
    }
});

Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:unload', function(event) {
    if (isAnalyticsEnabled()) {
        stopTimer();
        var dispatch_type = Alloy.CFG.analytics.dispatch_type;
        if (dispatch_type == 'on_logout' || dispatch_type == 'low_net_traffic') {
            // do this before stopping the modules
            dispatchEvents();
        }
        _.each(analyticsModules, function(analyticsModule) {
            logger.info('stopping analyticsModule ' + analyticsModule);
            analyticsModule.stopAnalytics(event);
        });
        analyticsModules = [];
    }
});

//----------------------------------------
// ## PUBLIC API

exports.fireAnalyticsEvent = fireAnalyticsEvent;
exports.fireUserEvent = fireUserEvent;
exports.fireScreenEvent = fireScreenEvent;
exports.fireTransactionEvent = fireTransactionEvent;
exports.fireTransactionItemEvent = fireTransactionItemEvent;
exports.fireExceptionEvent = fireExceptionEvent;

//----------------------------------------
// ## FUNCTIONS

/**
 * isAnalyticsEnabled - is analytics configured to be enabled
 *
 * @api private
 */
function isAnalyticsEnabled() {
    return Alloy.CFG.analytics.enabled;
}

/**
 * dispatchEvents - dispatch analytics events
 *
 * @api private
 */
function dispatchEvents() {
    var dispatch_type = Alloy.CFG.analytics.dispatch_type;
    if (isAnalyticsEnabled() && eventCount && (dispatch_type == 'low_net_traffic' || dispatch_type == 'on_logout')) {
        var time = (new Date()).getTime();
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.dispatchEvents();
        });
        var totalTime = (new Date()).getTime() - time;
        logger.info('Dispatched ' + eventCount + ' analytics events for ' + analyticsModules.length + ' analytics modules in ' + totalTime + 'ms');
        eventCount = 0;
    }
}

/**
 * startTimer - start analytics timer
 *
 * @api private
 */
function startTimer() {
    // 'low_net_traffic' means that the event to tell the analytics service to send the events out
    // will be sent when there is low network activity in the application.
    if (Alloy.CFG.analytics.dispatch_type == 'low_net_traffic') {
        analyticsTimer = setInterval(dispatchEvents, Alloy.CFG.analytics.event_dispatch_delay * 1000);
        logger.info('starting timer for \'low_net_traffic\' dispatchEvents id ' + analyticsTimer);
    }
}

/**
 * stopTimer - stop analytics timer
 *
 * @api private
 */
function stopTimer() {
    if (analyticsTimer) {
        logger.info('clearing timer for \'low_net_traffic\' dispatchEvents id ' + analyticsTimer);
        clearInterval(analyticsTimer);
        analyticsTimer = null;
    }
}

/**
 * fireAnalyticsEvent - Fires an analytics event. Takes an object with the following parameters:
 *    category: String
 *    action: String
 *    label: String
 *    action: String
 *
 * @param {Object} data
 * @api public
 */
function fireAnalyticsEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireAnalyticsEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireAnalyticsEvent(data);
        });
        eventCount++;
    }
}

/**
 * fireUserEvent - Fires a user event (ie: login). Takes an object with the following parameters:
 *    userId: String
 *    category: String
 *    action: String
 *
 * @param {Object} data
 * @api public
 */
function fireUserEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireUserEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireUserEvent(data);
        });
        eventCount++;
    }
}

/**
 * fireScreenEvent - Fires a screen event. Takes an object with the following parameters:
 *    screen: String
 *
 * @param {Object} data
 * @api public
 */
function fireScreenEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireScreenEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireScreenEvent(data);
        });
        eventCount++;
    }
}

/**
 * fireTransactionEvent - Fires a transaction event ie: checkout. Takes an object with the following parameters:
 *    orderId: String
 *    storeId: String
 *    total: String
 *    tax: String
 *    shipping: String
 *    currency: String
 *
 * @param {Object} data
 * @api public
 */
function fireTransactionEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireTransactionEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireTransactionEvent(data);
        });
        eventCount++;
    }
}

/**
 * fireTransactionItemEvent - Fires a transaction event ie: checkout. Takes an object with the following parameters:
 *    orderId: String
 *    name: String
 *    productId: String
 *    price: String
 *    quantity: String
 *    currency: String
 *
 * @param {Object} data
 * @api public
 */
function fireTransactionItemEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireTransactionItemEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireTransactionItemEvent(data);
        });
        eventCount++;
    }
}

/**
 * fireExceptionEvent - Fires an exception event. Takes an object with the following parameters:
 *    description: String
 *    fatal: Boolean
 *
 * @param {Object} data
 * @api public
 */
function fireExceptionEvent(data) {
    if (isAnalyticsEnabled()) {
        logger.info('fireExceptionEvent ' + JSON.stringify(data, null, 4));
        _.each(analyticsModules, function(analyticsModule) {
            analyticsModule.fireExceptionEvent(data);
        });
        eventCount++;
    }
}
