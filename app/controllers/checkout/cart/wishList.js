// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/wishList.js - wish list view on cart
 */

//----------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var confirmDeleteItem = args.confirmDeleteItem;
var addToCartFromAnotherList = args.addToCartFromAnotherList;
var navigateToProduct = args.navigateToProduct;
var updateWishListButtonTitle = args.updateWishListButtonTitle;
var fetchImageForProducts = args.fetchImageForProducts;
var getWishListNameFromPListArray = args.getWishListNameFromPListArray;
var currentCustomer = Alloy.Models.customer;
var cCProductLists = currentCustomer.productLists;
var selectedWishListId;
var wishListSelectorController;
var wishListRenderedOnce = false;
var EAUtils = require('EAUtils');
var logger = require('logging')('checkout:cart:wishList', getFullControllerPath($.__controllerPath));

// Localization constant
var buttonTextLength = 20;

//---------------------------------------------------
// ## MODEL LISTENERS

if ($.email_wish_list_button.getTitle().length > buttonTextLength || EAUtils.isSymbolBasedLanguage()) {
    $.email_wish_list_button.setFont(Alloy.Styles.smallButtonFont);
}
// when product lists fetched render show wish List
$.listenTo(cCProductLists, 'reset', firstTimeWishListRender);

//---------------------------------------------------
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
    logger.info('Calling deinit, removing listeners');
    $.email_wish_list_button.removeEventListener('click', showEmailWishListDialog);
    deinitRows();
    if (wishListSelectorController) {
        $.wish_list_selector_container.removeAllChildren();
        $.stopListening(wishListSelectorController);
        wishListSelectorController.deinit();
        wishListSelectorController = null;
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * deinitRows - deinit the rows in the table
 *
 * @api private
 */
function deinitRows() {
    if ($.wish_list_products_table.getSections().length > 0) {
        _.each($.wish_list_products_table.getSections()[0].getRows(), function(row) {
            row.deinit();
        });
    }
}

/**
 * deleteWishListItem - delete an item from the current wish list
 *
 * @param {String} wishListId - current wish list id
 * @param {String} wishListItemId - wish list item id
 * @api private
 */
function deleteWishListItem(wishListId, wishListItemId) {
    logger.info('delete wish List item ');
    var promise = cCProductLists.deleteItem(wishListId, wishListItemId);
    Alloy.Router.showActivityIndicator(promise);
}

/**
 * handleWishListItemClick - handle delete, edit, add to cart click on each wish list item row view
 *
 * @param {Object} event - event data
 * @api private
 */
function handleWishListItemClick(event) {
    var item = cCProductLists.getListItems(selectedWishListId).at(event.index);
    var productId = item.getProductId();
    var productName = item.getProductName();
    var itemId = item.getItemId();
    switch(event.source.id) {
    case 'add_to_cart_button':
        // move the product from the wish list to the cart
        if (_.isFunction(addToCartFromAnotherList)) {
            addToCartFromAnotherList(item);
        }
        break;
    case 'edit_button':
        // edit the product in wish list. go back to the PDP
        if (_.isFunction(navigateToProduct)) {
            var itemJSON = item.toJSON();
            itemJSON.index = event.index;
            itemJSON.replaceInWishList = {
                listId : selectedWishListId,
                listItemId : item.getItemId()
            };
            navigateToProduct(item.getProductId(), itemJSON);
        }

        break;
    case 'delete_button':
        // remove the product from wish list
        if (_.isFunction(confirmDeleteItem)) {
            confirmDeleteItem({
                index : event.index,
                product_name : productName,
                wishListId : selectedWishListId,
                wishListItemId : item.getItemId()
            }, deleteWishListItem);
        }
        break;

    default:
        break;
    }
}

/**
 * initWishListItemsCollection - prepare the wish list items
 *
 * @param {Collection} collection - the wish list
 * @api private
 */
function initWishListItemsCollection(collection) {

    updateWishListViewAndButtonTitle(collection.getTotalQuantity());

    // This can be called multiple times so need to clean up the old rows before resetting the line items in the table
    deinitRows();
    if (collection && collection.getCount() > 0) {
        logger.info('Calling initWishListItemsCollection with data');
        // once the data has been set, get all the images
        $.customerWishListItems.once('reset', function() {
            logger.info('Fetching images for saved plis');
            if ($.wish_list_products_table.getSections().length > 0) {
                fetchImageForProducts(collection.getModelObjects(), $.wish_list_products_table);
            }
        });
        // set the data into the local variable
        $.customerWishListItems.reset(collection.toJSON());
    } else {
        logger.info('Calling initWishListItemsCollection with no data');
        $.customerWishListItems.reset([]);
    }
}

/**
 * updateWishListViewAndButtonTitle - update the label of how many items are in the wish list, and hide wish list table when there is no item
 *
 * @param {Number} count - total quantity of item in current wish list
 * @api private
 */
function updateWishListViewAndButtonTitle(count) {
    if (_.isFunction(updateWishListButtonTitle)) {
        updateWishListButtonTitle(count);
    }
    if (count <= 0) {
        if (count < 0) {
            $.no_wish_list_products_label.setText(String.format(_L('%s does not have a wish list'), currentCustomer.getFullName()));
        } else {
            $.no_wish_list_products_label.setText(_L('There are no items in this wish list'));
        }
        $.wish_list_products_table.hide();
        $.wish_list_products_table.setHeight(0);
        $.no_wish_list_products_container.setHeight(Ti.UI.FILL);
        $.no_wish_list_products_container.show();
        $.email_wish_list_button.setEnabled(false);
        $.email_wish_list_button.setTouchEnabled(false);
    } else {
        $.no_wish_list_products_container.hide();
        $.no_wish_list_products_container.setHeight(0);
        $.wish_list_products_table.setHeight(Ti.UI.FILL);
        $.wish_list_products_table.show();
        $.email_wish_list_button.setEnabled(true);
        $.email_wish_list_button.setTouchEnabled(true);
    }
}

/**
 * renderWishList - render the wish list
 *
 * @param {String} wishListId - current wish list id
 * @api private
 */
function renderWishList(wishListId) {
    var currentWishListId = wishListId || cCProductLists.getFirstWishListId();
    selectedWishListId = currentWishListId;
    if (currentCustomer.isLoggedIn()) {
        if (cCProductLists.getWishListCount() > 1) {
            if (wishListSelectorController) {
                wishListSelectorController.updateSelectedItem(currentWishListId);
            }
        } else {
            if (cCProductLists.getWishListCount() == 1) {
                loadInitSelectedWishList(currentWishListId);
            } else if (cCProductLists.getWishListCount() == 0) {
                updateWishListViewAndButtonTitle(-1);
            }
        }
    }
}

/**
 * loadInitSelectedWishList - Load selected or default wish list data
 *
 * @param {String} wishListId - wish list id
 * @api private
 */
function loadInitSelectedWishList(wishListId) {
    if (wishListId) {
        initWishListItemsCollection(cCProductLists.getListItems(wishListId));
    }
}

/**
 * showEmailWishListDialog - show the email wish list dialog
 *
 * @api private
 */
function showEmailWishListDialog() {
    var successMsg = _L('Your Wish List has been emailed.');
    var wishListName = (_.isFunction(getWishListNameFromPListArray) ? getWishListNameFromPListArray(cCProductLists.where({
        id : selectedWishListId
    })) : '');
    if (wishListName != '') {
        successMsg = String.format(_L('Your Wish List %s has been emailed.'), wishListName);
    }
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'checkout/cart/emailCollectorDialog',
        cancelEvent : 'email_collector_dialog:dismiss',
        continueEvent : 'email_collector_dialog:continue',
        options : {
            emailData : {
                productListId : selectedWishListId,
                senderEmail : currentCustomer.getEmail(),
                senderName : currentCustomer.getFullName()
            },
            successNotifyMessage : successMsg,
            failNotifyMessage : _L('Your email failed to be sent. Please try again later.')
        }
    }).focus();

}

/**
 * renderWishListSelector - render wish list selectWidget
 *
 * @api private
 */
function renderWishListSelector() {
    //getWishListSelectorObjects returns array ready to be added  to selectWidget
    var selectorObj = cCProductLists.getWishListSelectorObjects();

    removeWishListSelector();

    wishListSelectorController = Alloy.createController('components/selectWidget', {
        valueField : 'wishListId',
        textField : 'wishListName',
        values : selectorObj,
        messageWhenSelection : '',
        messageWhenNoSelection : _L('Select Wish List'),
        selectListTitleStyle : {
            backgroundColor : Alloy.Styles.color.background.white,
            font : Alloy.Styles.tabFont,
            color : Alloy.Styles.accentColor,
            disabledColor : Alloy.Styles.color.text.light,
            width : Ti.UI.FILL,
            height : Ti.UI.FILL,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            textAlign : Ti.UI.TEXT_ALIGNMENT_CENTER,
            accessibilityValue : 'wish_list_selector'
        },
        selectListStyle : {
            width : 320,
            left : 20,
            height : 40,
            top : 5,
            bottom : 5,
            font : Alloy.Styles.textFieldFont,
            selectedFont : Alloy.Styles.textFieldFont,
            unselectedFont : Alloy.Styles.textFieldFont,
            color : Alloy.Styles.color.text.darkest,
            selectedOptionColor : Alloy.Styles.color.text.darkest,
            disabledColor : Alloy.Styles.color.text.light,
            backgroundColor : Alloy.Styles.color.background.white,
            selectedOptionBackgroundColor : Alloy.Styles.color.background.light,
            disabledBackgroundColor : Alloy.Styles.color.background.light,
            borderColor : Alloy.Styles.accentColor
        },
        needsCallbackAfterClick : true,
    });

    $.listenTo(wishListSelectorController, 'itemSelected', function(event) {
        if (event.item) {
            selectedWishListId = event.item.wishListId;
            loadInitSelectedWishList(selectedWishListId);
        }
    });
    $.listenTo(wishListSelectorController, 'dropdownSelected', function() {
        wishListSelectorController.continueAfterClick();
    });

    wishListSelectorController.updateItems(selectorObj);
    wishListSelectorController.setEnabled(true);
    $.wish_list_selector_container.add(wishListSelectorController.getView());
    $.wish_list_selector_container.show();
    //reposition email_wish_list_button if there a select widget
    $.email_wish_list_button.setRight(20);
}

/**
 * removeWishListSelector -  remove and deinit wish list selectWidget
 *
 * @api private
 */
function removeWishListSelector() {
    _.each($.wish_list_selector_container.getChildren(), function(childView) {
        if (childView.id !== 'email_wish_list_button') {
            $.wish_list_selector_container.remove(childView);
        } else {
            //reposition email_wish_list_button in the middle if there is no select widget
            childView.setRight(null);
            childView.setLeft(null);
        }
    });
    if (wishListSelectorController) {
        $.stopListening(wishListSelectorController);
        wishListSelectorController.deinit();
        wishListSelectorController = null;
    }
}

/**
 * transformWishListPLI - tansform Wish List Product List Item
 * @api private
 */
function transformWishListPLI(model) {
    logger.info('transform wish list PLI');
    return {
        row_id : 'id_' + model.getProductId(),
    };
}

//---------------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * firstTimeWishListRender - render wish list items for the first time when productlists are fetched
 *
 * @api private
 */
function firstTimeWishListRender() {
    logger.info('Responding to product lists reset event');
    if (wishListRenderedOnce) {
        return;
    }
    if (currentCustomer.isLoggedIn()) {
        wishListRenderedOnce = true;
    }
    if (cCProductLists.getWishListCount() > 1) {
        // if there are multiple wish lists  render a wish list selector
        renderWishListSelector();
    } else {
        removeWishListSelector();
    }
    renderWishList();

    _.each(cCProductLists.getAllWishLists(), function(list) {
        $.listenTo(list, 'item:deleted item:added item:updated', function() {
            renderWishList(list.getId());
        });
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

/**
 * Because there is a possibility that the productlists collection might trigger a reset event before this controller
 * starts listening to it we verify below if the controller has already responded the proper reset event, if
 * not we check if productlist has loaded, if yes it means the controller was not able to respond so we do it ourselves.
 * if productlist has not loaded the controller will just listen for the reset event
 */

firstTimeWishListRender();
