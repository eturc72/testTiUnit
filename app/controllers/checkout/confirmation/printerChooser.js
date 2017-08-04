// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/confirmation/printerChooser.js - Controller to choose a printer
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('checkout:confirmation:printerChooser', getFullControllerPath($.__controllerPath));
var printerCollection = new Backbone.Collection();
var printerAvailability = Alloy.CFG.printer_availability;

//----------------------------------------------
// ## APP LISTENERS

// list for changes to the list of discovered printers
$.listenTo(Alloy.eventDispatcher, 'printerlist:change', onPrinterListChange);

//----------------------------------------------
// ## UI EVENT LISTENERS

$.printer_table.addEventListener('click', onPrinterTableClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    if (printerAvailability) {
        logger.info('INIT called');
        printerCollection = new Backbone.Collection();
        if (Alloy.last_selected_printer) {
            $.chosen_printer_label.setText(Alloy.last_selected_printer);
        } else {
            $.chosen_printer_label.setText(_L('<select printer>'));
        }
        $.printerList.reset([]);
        // when the printer chooser is brought up, start the printer discovery process
        Alloy.eventDispatcher.trigger('printerlist:startdiscovery', {});
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.stopListening(Alloy.eventDispatcher, 'printerlist:change', onPrinterListChange);
    $.printer_table.removeEventListener('click', onPrinterTableClick);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onPrinterListChange - when the list of printer changes
 *
 * @param {Object} event
 * @api private
 */
function onPrinterListChange(event) {
    printerCollection.reset([]);
    // create new models for each string that was received
    _.each(event.printerList, function(string) {
        var model = Alloy.createModel('printer');
        model.set('ip', string);
        printerCollection.add(model);
    });

    // when the printers have been set, look for the last selected printer
    $.printerList.once('reset', function() {
        var rows = $.printer_table.getSections()[0].getRows();
        var row = _.find(rows, function(row) {
            return row.getChildren()[0].text == Alloy.last_selected_printer;
        });
        // reselect the last selected printer
        if (row) {
            row.setBackgroundColor(Alloy.Styles.color.background.medium);
            $.trigger('printer_chosen', {
                enabled : true
            });
        }

    });
    // set the models into the table view
    $.printerList.reset(printerCollection.models);
}

/**
 * onPrinterTableClick - when the user selects a printer in the table
 *
 * @param {Object} event
 * @api private
 */
function onPrinterTableClick(event) {
    // deselecting the last selected printer
    if (Alloy.last_selected_printer === printerCollection.at(event.index).get('ip')) {
        Alloy.last_selected_printer = null;
        _.each($.printer_table.getSections()[0].getRows(), function(row) {
            row.setBackgroundColor(Alloy.Styles.color.background.white);
        });
        $.chosen_printer_label.setText(_L('<select printer>'));
        $.trigger('printer_chosen', {
            enabled : false
        });
    } else {
        // selecting a printer
        Alloy.last_selected_printer = printerCollection.at(event.index).get('ip');
        $.chosen_printer_label.setText(Alloy.last_selected_printer);
        _.each($.printer_table.getSections()[0].getRows(), function(row) {
            row.setBackgroundColor(Alloy.Styles.color.background.white);
        });
        $.printer_table.getSections()[0].getRows()[event.index].setBackgroundColor(Alloy.Styles.color.background.medium);
        $.trigger('printer_chosen', {
            enabled : true
        });
        Alloy.eventDispatcher.trigger('printer:select', {
            selectedPrinter : Alloy.last_selected_printer
        });
    }
}
