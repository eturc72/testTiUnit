// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/orders/giftMessage.js - Gift Message order summary
 */

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 * @param {boolean} isGift if is a gift or not
 * @param {String} text for gift message
 *
 * @api public
 */
function init(isGift, text) {
    if (isGift) {
        $.gift_message_container.show();
        if (text) {
            $.gift_message.setText(text);
        }
        $.gift_message_container.setHeight(Ti.UI.SIZE);

    } else {
        $.gift_message_container.hide();
        $.gift_message_container.setHeight(0);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.destroy();
}

