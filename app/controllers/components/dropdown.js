// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/dropdown.js - Dropdown used by the select widget component
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('components:dropdown', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {};
var items = args.items;
var textField = args.textField;
var valueField = args.valueField;
var selectableField = args.selectableField;
var style = args.style;

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT - initialize view
 *
 * @api private
 */
function init() {
    $.menuBox.setSeparatorStyle(Ti.UI.TABLE_VIEW_SEPARATOR_STYLE_NONE);
    $.menuBox.setTableSeparatorInsets({
        left : 0,
        right : 0
    });
    $.menuBox.setRowHeight(Alloy.Styles.selectLists.height);

    // For each item, add a new table tow
    var rows = [];
    var filteredItems = filterItems(items),
        selectedIndex = -1;
    _.each(filteredItems, function(item, index) {
        var itemJSON = transformItem(item);

        if (itemJSON.selected) {
            itemJSON.font = style && style.selectedFont ? style.selectedFont : Alloy.Styles.selectLists.font;
            selectedIndex = index;
        } else {
            itemJSON.font = style && style.unselectedFont ? style.unselectedFont : Alloy.Styles.selectLists.selectedOptionFont;
        }
        if (itemJSON.selectable && itemJSON.enabled && itemJSON.selected) {
            // selectable & enabled & selected
            itemJSON.backgroundColor = style && style.selectedOptionBackgroundColor ? style.selectedOptionBackgroundColor : Alloy.Styles.selectLists.selectedOptionBackgroundColor;
            itemJSON.color = style && style.selectedOptionColor ? style.selectedOptionColor : Alloy.Styles.selectLists.selectedOptionColor;
        } else if (itemJSON.selectable && itemJSON.enabled && !itemJSON.selected) {
            // selectable & enabled & not selected
            itemJSON.backgroundColor = style && style.backgroundColor ? style.backgroundColor : Alloy.Styles.selectLists.backgroundColor;
            itemJSON.color = style && style.color ? style.color : Alloy.Styles.selectLists.color;
        } else if (!itemJSON.enabled && itemJSON.selected) {
            // not enabled, but selected
            itemJSON.backgroundColor = style && style.selectedOptionBackgroundColor ? style.selectedOptionBackgroundColor : Alloy.Styles.selectLists.selectedOptionBackgroundColor;
            itemJSON.color = style && style.selecetdOptionColor ? style.selecetdOptionColor : Alloy.Styles.selectLists.selectedOptionColor;
        } else if (!itemJSON.enabled && !itemJSON.selected) {
            // not enabled, not selected
            itemJSON.backgroundColor = style && style.disabledBackgroundColor ? style.disabledBackgroundColor : Alloy.Styles.selectLists.disabledBackgroundColor;
            itemJSON.color = style && style.disabledColor ? style.disabledColor : Alloy.Styles.selectLists.disabledColor;
        } else if (!itemJSON.selectable && !itemJSON.selected) {
            // not selectable and enabled
            itemJSON.backgroundColor = style && style.disabledBackgroundColor ? style.disabledBackgroundColor : Alloy.Styles.selectLists.disabledBackgroundColor;
            itemJSON.color = style && style.disabledColor ? style.disabledColor : Alloy.Styles.selectLists.disabledColor;
        } else {
            // not selectable and enabled and selected
            itemJSON.backgroundColor = style && style.selectedOptionBackgroundColor ? style.selectedOptionBackgroundColor : Alloy.Styles.selectLists.selectedOptionBackgroundColor;
            itemJSON.color = style && style.selectedOptionColor ? style.selectedOptionColor : Alloy.Styles.selectLists.selectedOptionColor;
        }
        itemJSON.selectedBackgroundColor = style && style.selectedBackgroundColor ? style.selectedBackgroundColor : Alloy.Styles.accentColor;
        rows.push(itemJSON);
    });
    $.menuBox.setData(rows);
    if (selectedIndex > -1) {
        $.menuBox.scrollToIndex(selectedIndex - 1);
    }
}

/**
 * DEINIT - cleanup listeners
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    // defined in view xml file
    $.menuBox.removeEventListener('click', handleMenuBoxClick);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * filterItems - filter the items
 * @param {Object} items
 *
 * @api private
 */
function filterItems(items) {
    return items.models;
}

/**
 * transformItem - transform the data for the display
 * @param {Object} item
 *
 * @api private
 */
function transformItem(item) {
    var itemJSON = item.toJSON();

    itemJSON.title = '' + itemJSON[textField];
    itemJSON.selectable = selectableField ? itemJSON[selectableField] : true;
    itemJSON.enabled = itemJSON.hasOwnProperty('enabled') ? itemJSON.enabled : true;
    itemJSON.item_id = '' + itemJSON[valueField];
    itemJSON.accessibilityValue = itemJSON[valueField];
    if (item.hasOwnProperty('selected')) {
        itemJSON.selected = item.selected;
    }

    return itemJSON;
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleMenuBoxClick - menu box has been clicked on to select item
 * @param {Object} event
 *
 * @api private
 */
function handleMenuBoxClick(event) {
    logger.info('handleMenuBoxClick');
    var itemId = event.rowData.item_id;

    // var matchingItems = items.where({value:itemId});
    var matchingItems = items.filter(function(item) {
        var itemJSON = item.toJSON();
        return itemJSON[valueField] == itemId;
    });
    var item = matchingItems.length ? matchingItems[0] : null;
    $.trigger('itemSelected', item.toJSON());
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();

if (style && style.border_color) {
    $.container.setBorderColor(style.border_color);
}
