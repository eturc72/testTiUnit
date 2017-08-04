// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/googleAnalytics.js - google anaylics module
 */

/**
 * This class is an implementation of the analytics API. In order to create your own integration with a different
 * analytics service, you will need to implement the following functions:
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
 * dispatch_type in your config is set to 'on_logout' or 'low_net_traffic':
 *
 * function dispatchEvents() {...};
 */

//----------------------------------------
// ## VARIABLES

var ga = require('analytics.google');
var logger = require('logging')('analytics:googleAnalytics', 'app/lib/googleAnalytics');

var initialized = false;
var tracker = null;
var trackingId = null;

//----------------------------------------
// ## PUBLIC API

exports.startAnalytics = startAnalytics;
exports.stopAnalytics = stopAnalytics;
exports.dispatchEvents = dispatchEvents;
exports.fireAnalyticsEvent = fireAnalyticsEvent;
exports.fireUserEvent = fireUserEvent;
exports.fireScreenEvent = fireScreenEvent;
exports.fireTransactionEvent = fireTransactionEvent;
exports.fireTransactionItemEvent = fireTransactionItemEvent;
exports.fireExceptionEvent = fireExceptionEvent;

//----------------------------------------
// ## FUNCTIONS

/**
 * INIT
 *
 * @api private
 */
function init() {
    if (Alloy.CFG.analytics.google.tracker) {
        tracker = ga.getTracker(Alloy.CFG.analytics.google.tracker);
        trackingId = tracker.trackingId;
        ga.setDispatchInterval(Alloy.CFG.analytics.dispatch_interval);
        initialized = true;
    }
}

/**
 * startAnalytics - start the google analytics
 *
 * @param {Object} event
 * @api public
 */
function startAnalytics(event) {
}

/**
 * stopAnalytics - stop the google analytics
 *
 * @param {Object} event
 * @api public
 */
function stopAnalytics(event) {
}

/**
 * dispatchEvents - dispatch google analytics events
 *
 * @api public
 */
function dispatchEvents() {
    if (initialized) {
        var time = (new Date()).getTime();
        tracker.dispatchAnalyticsEvents({});
        var totalTime = (new Date()).getTime() - time;
        logger.info('Dispatched google analytics events in ' + totalTime + 'ms');
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
    logger.info('sending ' + data.category + ' analytics event with action ' + data.action);

    if (tracker) {
        tracker.trackEvent({
            category : data.category,
            action : data.action,
            label : data.label,
            value : data.value
        });
    } else {
        logger.info('could not send ' + data.category + ' analytics event with action ' + data.action);
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
    logger.info('sending ' + data.category + ' analytics user event with action ' + data.action);

    if (tracker && data.userId) {
        tracker.setUser({
            userId : data.userId,
            category : data.category,
            action : data.action
        });
    } else {
        logger.info('could not send ' + data.category + ' analytics user event with action ' + data.action);
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
    logger.info('sending analytics screen event for screen ' + data.screen);

    if (tracker) {
        tracker.trackScreen({
            screenName : data.screen
        });
    } else {
        logger.info('could not send analytics screen event for screen ' + data.screen);
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
    logger.info('sending analytics transaction event with id ' + data.orderId);

    if (tracker) {
        tracker.trackTransaction({
            transactionId : data.orderId,
            affiliation : data.storeId,
            revenue : data.total,
            tax : data.tax,
            shipping : data.shipping,
            currency : data.currency
        });
    } else {
        logger.info('could not send analytics transaction event with id ' + data.orderId);
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
    logger.info('sending analytics transaction item event with id ' + data.productId + ' for order ' + data.orderId);

    if (tracker) {
        tracker.trackTransactionItem({
            transactionId : data.orderId,
            name : data.name,
            sku : data.productId,
            price : data.price,
            quantity : data.quantity,
            currency : data.currency
        });
    } else {
        logger.info('could not send analytics transaction item event with id ' + data.productId + ' for order ' + data.orderId);
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
    logger.info('sending analytics exception event with description ' + data.description);

    if (tracker) {
        tracker.trackException({
            description : data.description,
            fatal : data.fatal
        });
    } else {
        logger.info('could not send analytics exception event with description ' + data.description);
    }
}

init();
