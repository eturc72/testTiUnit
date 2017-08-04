// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/sessionTimeoutConfirmation.js - session timeout confirmation dialog
 */

//---------------------------------------------------
// ## VARIABLES

var counter = 0;
var timer = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.end_session_button.addEventListener('click', buttonHandler);
$.continue_button.addEventListener('click', buttonHandler);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.dismiss = dismiss;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    counter = Alloy.CFG.session_timeout_dialog_display_time / 1000;

    $.title.setText(_L('End Session'));
    $.message.setText(String.format(_L('End Session Message'), counter));

    timer = setInterval(function() {
        $.message.setText(String.format(_L('End Session Message'), --counter));
        if (counter == 0) {
            clearInterval(timer);
        }
    }, 1000);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.end_session_button.removeEventListener('click', buttonHandler);
    $.continue_button.removeEventListener('click', buttonHandler);
    clearInterval(timer);
    timer = null;
    $.destroy();
}


//---------------------------------------------------
// ## FUNCTIONS

/**
 * dismiss - close the dialog
 *
 * @api public
 */
function dismiss() {
    $.trigger('session_timeout_confirmation:end_session');
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * buttonHandler - handler for end session and continue button
 *
 * @param {Object} event
 *
 * @api private
 */
function buttonHandler(event) {
    clearInterval(timer);
    timer = null;
    if (event.source.id == $.end_session_button.id) {
        dismiss();
    } else if (event.source.id == $.continue_button.id) {
        $.trigger('session_timeout_confirmation:continue');
    }
}