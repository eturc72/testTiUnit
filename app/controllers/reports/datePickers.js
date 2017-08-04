// ©2015-2017 salesforce.com, inc. All rights reserved.

/**
 * controllers/reports/datePicker.js -  handles custom date ranges for sales report
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var model = args.model;
var formatDate = require('EAUtils').formatDate;
var customDateFrom = model.get('customDateFrom'),
    customDateTo = model.get('customDateTo'),
    today = new Date(),
    minDate = new Date(2013, 0, 1);

// allowedDateRanger correspond to 90 days difference between start date an end date
var allowedDateRanger = 90 * 24 * 60 * 60 * 1000;

var TIME_START_DAY = 'T00:00:00',
    TIME_END_DAY = 'T23:59:59';

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.cancel.addEventListener('click', dismiss);
$.go.addEventListener('click', setDateTimeFilters);

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.cancel.removeEventListener('click', dismiss);
    $.go.removeEventListener('click', setDateTimeFilters);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * convertDateToCurrentTimezone - Convert date parameter to current  time zone
 * @param {String} dateString
 * @return {Date} date
 *
 * @api private
 */
function convertDateToCurrentTimezone(dateString) {
    return (new Date(dateString).getTime()) + (60 * (new Date().getTimezoneOffset()) * 1000);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * setDateTimeFilters - set custom start and end dates to trigger report reload
 *
 * @api private
 */
function setDateTimeFilters() {
    if (verifyDateRange()) {
        model.set({
            dateFrom : formatDate($.date_from.value, TIME_START_DAY),
            customDateFrom : formatDate($.date_from.value, TIME_START_DAY),
            dateTo : formatDate($.date_to.value, TIME_END_DAY),
            customDateTo : formatDate($.date_to.value, TIME_END_DAY)
        });
        dismiss();
    }

}

/**
 * dismiss - trigger the closing of the popover
 *
 * @api private
 */
function dismiss() {
    $.trigger('datePickers:dismiss');
}

/**
 * verifyDateRange - Check if date range is within 90 days
 *
 *@return {Boolean}
 *
 * @api private
 */
function verifyDateRange() {
    var dateFrom = new Date(formatDate($.date_from.getValue(), TIME_START_DAY)),
        dateTo = new Date(formatDate($.date_to.getValue(), TIME_END_DAY));
    var range = dateTo.getTime() - dateFrom.getTime();

    if (dateTo.getTime() < dateFrom.getTime()) {
        $.date_range_msg.setText(_L('End date cannot be before start date.'));
        $.date_range_msg.setColor('red');
        $.date_to.setValue(today);
        return false;
    }

    if (range > allowedDateRanger) {
        $.date_range_msg.setText(_L('Maximum range of 90 days allowed.'));
        $.date_range_msg.setColor('red');
        $.date_from.setValue(new Date(dateTo.getTime() - allowedDateRanger + (24 * 60 * 60 * 1000)));
        return false;
    }

    $.date_range_msg.setText(_L('Maximum range of 90 days allowed.'));
    $.date_range_msg.setColor(Alloy.Styles.color.text.dark);
    return true;
}

//---------------------------------------------------
// ## CONSTRUCTOR

$.date_from.setMinDate(minDate);
$.date_to.setMinDate(minDate);
$.date_from.setMaxDate(today);
$.date_to.setMaxDate(today);
$.date_from.setValue(( customDateFrom ? new Date(convertDateToCurrentTimezone(customDateFrom)) : new Date(today.getTime() - (24 * 60 * 60 * 1000))));
$.date_to.setValue( customDateTo ? new Date(customDateTo) : today);
$.date_range_msg.setText(_L('Maximum range of 90 days allowed.'));
