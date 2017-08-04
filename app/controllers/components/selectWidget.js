// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/selectWidget.js - Dropdown select widget component
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var attributeId = args.attributeId;
var logger = require('logging')('components:selectWidget', getFullControllerPath($.__controllerPath));

// values is either an array of Strings/Numbers/simple types or an array of Objects
var values = args.values;
var needsCallbackAfterClick = args.needsCallbackAfterClick || false;

var selectedItem = args.selectedItem;
var valueField = args.valueField || 'value';
var applyArgs = args.applyArgs || false;
var textField = args.textField || 'value';
var selectableField = args.selectableField;
var messageWhenSelection = args.messageWhenSelection || '';
var messageWhenNoSelection = args.messageWhenNoSelection || '';
var enabled = true;
var selectListStyle = args.selectListStyle;
var selectListTitleStyle = args.selectListTitleStyle;

$.items = new Backbone.Collection();

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo($.items, 'reset', function() {
    selectSingleItem();
});

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;
exports.setEnabled = setEnabled;
exports.getEnabled = getEnabled;
exports.updateItems = updateItems;
exports.updateSelectedItem = updateSelectedItem;
exports.dismiss = dismiss;
exports.continueAfterClick = continueAfterClick;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT - initialize view
 *
 * @api private
 */
function init() {
    logger.info(valueField + ' INIT called');
    var models = _.map(values, function(value) {
        var model;
        if (!( value instanceof Object)) {
            model = new Backbone.Model();
            model.set('value', value);
        } else {
            model = new Backbone.Model(value);
        }
        return model;
    });

    // Loop through all values
    var selectedValue;
    var longestName = '';
    // figure out the longest name so we can size the widget appropriately
    _.each(models, function(value) {
        var asJSON = value.toJSON();
        if (asJSON[textField].length > longestName.length) {
            longestName = asJSON[textField];
        }
        if (selectedItem) {
            if (asJSON[valueField] == selectedItem) {
                selectedValue = asJSON;
            }
        }
    });
    $.select_list_title.setText(longestName);
    $.select_list_title.setWidth(Ti.UI.SIZE);
    var w = $.select_list_title.toImage().getWidth();
    if (w < 180) {
        $.select_list_title.setWidth(180);
        $.hitBox.setWidth(198);
    } else {
        $.select_list_title.setWidth(w + 50);
        $.hitBox.setWidth(w + 78);
    }
    // If there is one marked selected, then use it ... otherwise ...
    $.select_list_title.setText( selectedValue ? messageWhenSelection + selectedValue[textField] : messageWhenNoSelection);
    // set this as enabled by default and this will setup the color of the widget
    setEnabled(true);
    $.items.reset(models);
}

/**
 * DEINIT - cleanup listeners
 *
 * @api public
 */
function deinit() {
    logger.info(valueField + ' DEINIT called');
    if ($.dropdown) {
        $.stopListening($.dropdown, 'itemSelected', handleSelect);
        $.dropdown.deinit();
    }
    // listener added in xml
    $.hitBox.removeEventListener('click', handleHitBoxClick);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * setEnabled - sets if widget is enabled or not
 *
 * @param {Object} isEnabled
 *
 * @api public
 */
function setEnabled(isEnabled) {
    logger.info(valueField + ' setEnabled called');
    enabled = isEnabled;
    var backgroundColor = Alloy.Styles.selectLists.backgroundColor,
        titleBackgroundColor = backgroundColor,
        color = Alloy.Styles.selectLists.color,
        titleColor = color;

    if (selectListStyle && selectListTitleStyle) {
        if (!isEnabled) {
            selectListStyle.disabledBackgroundColor && ( backgroundColor = selectListStyle.disabledBackgroundColor);
            selectListStyle.disabledColor && ( color = selectListStyle.disabledColor);
            selectListTitleStyle.disabledBackgroundColor && ( titleBackgroundColor = selectListTitleStyle.disabledBackgroundColor);
            selectListTitleStyle.disabledColor && ( titleColor = selectListTitleStyle.disabledColor);
        } else {
            selectListStyle.backgroundColor && ( backgroundColor = selectListStyle.backgroundColor);
            selectListStyle.color && ( color = selectListStyle.color);
            selectListTitleStyle.backgroundColor && ( titleBackgroundColor = selectListTitleStyle.backgroundColor);
            selectListTitleStyle.color && ( titleColor = selectListTitleStyle.color);
        }
    } else {
        if (!isEnabled) {
            backgroundColor = titleBackgroundColor = Alloy.Styles.selectLists.disabledBackgroundColor;
            color = titleColor = Alloy.Styles.selectLists.disabledColor;
        }
    }
    $.hitBox.setBackgroundColor(backgroundColor);
    $.hitBox.setColor(color);
    $.select_list_title.setBackgroundColor(titleBackgroundColor);
    $.select_list_title.setColor(titleColor);
    isEnabled ? $.select_list_image.setOpacity(1) : $.select_list_image.setOpacity(0.5);
}

/**
 * getEnabled - returns if widget is enabled or not
 *
 * @return {Boolean} if enabled or not
 *
 * @api public
 */
function getEnabled() {
    return enabled;
}

/**
 * updateItems - updates the items that can be selected from in dropdown
 *
 * @param {Object} in_items
 *
 * @api public
 */
function updateItems(in_items) {
    logger.info(valueField + ' updateItems called');
    $.items.reset(in_items);
}

/**
 * updateSelectedItem - selects a new item in the dropdown
 *
 * @param {Object} selectedItem
 *
 * @api public
 */
function updateSelectedItem(selectedItem) {
    logger.info(valueField + ' updateSelectedItem called ' + selectedItem);
    // if there is only a single item then select it, otherwise select the selectedItem
    if (!selectSingleItem()) {
        selectSelectedItem(selectedItem);
    }
}

/**
 * dismiss - dimiss the dropdown
 *
 * @api public
 */
function dismiss() {
    logger.info(valueField + ' dismiss called');
    if ($.dropdown) {
        Alloy.Dialog.dismissDialog();
    }
}

/**
 * continueAfterClick - continue after clicking to show dropdown
 *
 * @api public
 */
function continueAfterClick() {
    clickContinue();
}

/**
 * clickContinue - presents the dropdown
 *
 * @api private
 */
function clickContinue() {
    logger.info(valueField + ' clickContinue creating dropdown');
    if ($.dropdown) {
        $.stopListening($.dropdown, 'itemSelected', handleSelect);
        $.dropdown.deinit();
        $.dropdown = null;
    }
    $.dropdown = Alloy.createController('components/dropdown', {
        items : $.items,
        textField : textField,
        valueField : valueField,
        selectableField : selectableField,
        style : selectListStyle
    });

    $.listenTo($.dropdown, 'itemSelected', handleSelect);
    Alloy.Dialog.presentDialog($.dropdown.getView(), {
        parent : $.hitBox,
        preferredSide : 'bottom',
        preferredHeight : ($.items.length || 1) * Alloy.Styles.selectLists.height
    });
}

/**
 * handleHitBoxClick - when the select widget is selected and we need to bring up the dropdown
 *
 * @api private
 */
function handleHitBoxClick() {
    logger.info(valueField + ' handleHitBoxClick');
    if (enabled) {
        $.trigger('dropdownSelected');
        if (!needsCallbackAfterClick) {
            clickContinue();
        }
    }
}

/**
 * select - selects the item in the model
 *
 * @param {Object} data
 *
 * @api private
 */
function select(data) {
    logger.info(valueField + ' select called with ' + data);
    var selectedItem;
    // Look through data and mark this one as selected
    $.items.each(function(record) {
        var recordJSON = record.toJSON();
        if (recordJSON[valueField] == data) {
            selectedItem = recordJSON;
            record.selected = true;
        } else {
            record.selected = false;
        }
    });
    $.select_list_title.setText( selectedItem ? messageWhenSelection + selectedItem[textField] : messageWhenNoSelection);
    return selectedItem;
}

/**
 * selectSelectedItem - selects an item in the dropdown and fires event
 *
 * @param {Object} data
 *
 * @api private
 */
function selectSelectedItem(data) {
    logger.info(valueField + ' selectSelectedItem called ' + JSON.stringify(data, null, 2));
    var selectedItem = select(data);
    $.trigger('itemSelected', {
        data : {
            variationAttributeId : attributeId
        },
        item : selectedItem,
        args : args
    });
}

/**
 * handleSelect - when a dropdown item is selected
 *
 * @param {Object} data
 *
 * @api private
 */
function handleSelect(data) {
    logger.info(valueField + ' handleSelect called');
    // 'this' will be dropdown from above
    $.stopListening($.dropdown, 'itemSelected', handleSelect);
    Alloy.Dialog.dismissDialog();

    if (!data) {
        return;
    }
    selectSelectedItem(data[valueField]);
}

/**
 * selectSingleItem - will select the one item in the list if that is the only item
 *
 * @return {Boolean} if single item in dropdown selected
 *
 * @api private
 */
function selectSingleItem() {
    if ($.items.length === 1) {
        logger.info(valueField + ' selecting single item');
        // delay this so that listeners can be setup
        setTimeout(function() {
            selectSelectedItem($.items.at(0).get(valueField));
        }, 100);
        return true;
    }
    return false;
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();

if (selectListStyle) {
    $.hitBox.applyProperties(selectListStyle);
}

if (applyArgs) {
    $.hitBox.applyProperties(args);
}

if (selectListTitleStyle) {
    $.select_list_title.applyProperties(selectListTitleStyle);
}

if (selectedItem) {
    selectSelectedItem(selectedItem);
}

