// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/nextPreviousToolbar.js - next and previous toolbar that appears above keyboard on form pages
 */

//----------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:nextPreviousToolbar', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {};
var supportReturn = args.supportReturn || false;
var getUIObjectType = require('EAUtils').getUIObjectType;
var textFields = [];
var selectedField;

var previous = Titanium.UI.createButton({
    title : _L('Previous'),
    style : Ti.UI.iOS.SystemButtonStyle.BORDERED,
});

var next = Titanium.UI.createButton({
    title : _L('Next'),
    style : Ti.UI.iOS.SystemButtonStyle.BORDERED,
    left : 0
});

var toolbar = Titanium.UI.iOS.createToolbar({
    items : [previous, next],
    borderTop : false,
    borderBottom : false
});

//---------------------------------------------------
// ## UI EVENT LISTENERS

// next event listener
next.addEventListener('click', onNextClick);

// previous event listener
previous.addEventListener('click', onPreviousClick);

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.setTextFields = setTextFields;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    next.removeEventListener('click', onNextClick);
    previous.removeEventListener('click', onPreviousClick);
    removeAllChildren(toolbar);
    selectedField = null;
    toolbar.hide();
    toolbar = null;
    _.each(textFields, function(textField) {
        logger.info('removing ' + textField);
        textField.removeEventListener('focus', onFieldFocus);
        if (supportReturn) {
            textField.removeEventListener('return', onNextClick);
        }
        textField.setKeyboardToolbar(toolbar);
        // make sure focus is removed so cleanup can occur
        if (getUIObjectType(textField) === 'TextField' || getUIObjectType(textField) === 'TextArea') {
            textField.blur();
        }
    });
    textFields = [];
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS


/**
 * setTextFields - set the text fields for the toolbar
 *
 * @api public
 */
function setTextFields(fields) {
    logger.info('setTextFields called ' + fields);
    textFields = fields.slice();
    _.each(textFields, function(textField) {
        if (getUIObjectType(textField) === 'TextField' || getUIObjectType(textField) === 'TextArea') {
            textField.setKeyboardToolbar(toolbar);
            textField.addEventListener('focus', onFieldFocus);
            if (supportReturn) {
                textField.addEventListener('return', onNextClick);
            }
        }

    });
}

/**
 * enableNext - enable the next button
 *
 * @api private
 */
function enableNext(enable) {
    next.setEnabled(enable);
}

/**
 * enablePrevious - enable the previous button
 *
 * @api private
 */
function enablePrevious(enable) {
    previous.setEnabled(enable);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onNextClick - the user taps on next and we move to next field
 *
 * @api private
 */
function onNextClick() {
    logger.info('onNextClick called');
    if (selectedField + 1 < textFields.length) {
        if (getUIObjectType(textFields[selectedField + 1]) === 'TextField' || getUIObjectType(textFields[selectedField + 1]) === 'TextArea') {
            textFields[selectedField + 1].focus();
        } else {
            textFields[selectedField + 1].fireEvent('autoFocus');
        }
    }
}

/**
 * onPreviousClick - the user taps on previous and we move to previous field
 *
 * @api private
 */
function onPreviousClick() {
    logger.info('onPreviousClick called');
    if (selectedField - 1 >= 0) {
        var UI_ObjectType = textFields[selectedField - 1].getApiName().split('.');
        UI_ObjectType = UI_ObjectType[UI_ObjectType.length - 1];
        if (UI_ObjectType === 'TextField' || UI_ObjectType === "TextArea") {
            textFields[selectedField - 1].focus();
        } else {
            textFields[selectedField - 1].fireEvent('autoFocus');
        }
    }
}

/**
 * onFieldFocus - a new field has focus so we need to adjust the next and previous buttons
 *
 * @param {Object} event
 *
 * @api private
 */
function onFieldFocus(event) {
    logger.info('onFieldFocus called');
    selectedField = _.indexOf(textFields, event.source);
    enableNext(selectedField < textFields.length - 1);
    enablePrevious(selectedField != 0);
    Alloy.eventDispatcher.trigger('session:renew');
}
