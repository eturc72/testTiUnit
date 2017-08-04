// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * product/components/productListSelectorDialog.js -  handle selection of a single wish list from multiple wish lists
 */
//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var collection = args.wishListCollection;
var currentlySelectedListId;

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
//  ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.cancel.removeEventListener('click', dismiss);
    $.apply.removeEventListener('click', dismiss);
    $.list_view.removeEventListener('click', onListSelect);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * onListSelect - handle row clicked event
 *
 * @param {Object} event - event data
 * @api private
 */
function onListSelect(event) {
    if (event.row) {
        var row = event.row;
        setSelectedRowBGColor(row);
        currentlySelectedListId = row.listId;
    }
}

/**
 * dismiss - dismiss the selector dialog
 *
 * @param {Object} event - event data
 * @api private
 */
function dismiss(event) {
    if (event.source.id === 'apply') {
        $.trigger('productListSelectorDialog:continue', {
            listId : currentlySelectedListId
        });
    } else {
        $.trigger('productListSelectorDialog:dismiss');
    }

}

/**
 * setSelectedRowBGColor - set the right background for the selected row
 *
 * @param {Object} row - tableViewRow
 * @api private
 */
function setSelectedRowBGColor(row) {

    _.each($.list_view.getSections()[0].getRows(), function(cRow) {
        var checkBox = _.find(cRow.getChildren()[0].getChildren(), function(child) {
            return child.getApiName() == 'Ti.UI.ImageView';
        });
        if (cRow.listId == row.listId) {
            if (checkBox) {
                // show select checkbox image
                checkBox.setVisible(true);
            }
            row.setBackgroundColor(Alloy.Styles.selectLists.selectedOptionBackgroundColor);
        } else {
            if (checkBox) {
                // hide select checkbox image
                checkBox.setVisible(false);
            }
            cRow.setBackgroundColor(Alloy.Styles.color.background.white);
        }

    });

}

/**
 * transformPLI - return extracted values from model
 *
 * @param {Object} model - backbone model
 * @api private
 */
function transformPLI(model) {
    return {
        listId : model.getId(),
        listName : model.getName()
    };
}

//---------------------------------------------------
// ## CONSTRUCTOR

$.currentProductList.reset(collection);
