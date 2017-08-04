// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/simulatePayment.js - Controller to simulate payments
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:payments:simulatePayment', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.backdrop.addEventListener('click', dismiss);

$.cancel_button.addEventListener('click', dismiss);

$.swipe_button.addEventListener('click', swipeEventHandler);

var buttons = [];
var eventType;
var buttonData;

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} details
 * @api public
 */
function init(details) {
    logger.info('init');
    eventType = details.event_type;
    buttonData = details.button_data;
    _.each(details.button_data, function(button_data, index) {
        var button = Ti.UI.createButton({
            backgroundImage : Alloy.Styles.buttons.primary.backgroundImage,
            backgroundDisabledImage : Alloy.Styles.buttons.primary.backgroundDisabledImage,
            color : Alloy.Styles.buttons.primary.color,
            width : 390,
            height : 40,
            left : 35,
            top : 20,
            index : index,
            title : details.button_data[index].title
        });
        $.button_container.add(button);
        button.addEventListener('click', clickButton);
        buttons.push(button);
    });
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    _.each(buttons, function(button) {
        button.removeEventListener('click', clickButton);
    });
    $.backdrop.removeEventListener('click', dismiss);
    $.cancel_button.removeEventListener('click', dismiss);
    $.swipe_button.removeEventListener('click', swipeEventHandler);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('simulate_payment:dismiss');
}

/**
 * clickButton - handle the button click
 *
 * @param {Object} event
 * @api private
 */
function clickButton(event) {
    var index = event.source.index;
    delete buttonData[index].title;
    Alloy.eventDispatcher.trigger(eventType, buttonData[index]);
    dismiss();
}

/**
 * swipEventHandler - handle the swipe event
 *
 * @api private
 */
function swipeEventHandler() {
    $.trigger('simulate_payment:swipe');
    dismiss();
}
