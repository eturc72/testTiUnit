// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/addToWishList.js - view component for adding a product to the wish list
 */

//----------------------------------------------
// ## VARIABLES

var replaceItem;
var currentCustomer = Alloy.Models.customer;
var cCProductLists = currentCustomer.productLists;
var lastProductAddedId,
    lastUsedProductListId;
var EAUtils = require('EAUtils');
var currentProductModel;

// Localization constant
var buttonTextLength = 20;
var symbolButtonTextLength = 9;

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.isEnabled = isEnabled;
exports.setUpdateInWishList = setUpdateInWishList;
exports.setEnabled = setEnabled;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @params {Object} args
 * @api public
 */
function init(args) {
    if (args.productModel) {
        currentProductModel = args.productModel;
    }
    if (args.buttonTitle) {
        $.add_to_wish_list.setTitle(args.buttonTitle);
    }
    if ($.add_to_wish_list.getTitle().length > buttonTextLength || (EAUtils.isSymbolBasedLanguage() && $.add_to_wish_list.getTitle().length > symbolButtonTextLength)) {
        $.add_to_wish_list.setFont(Alloy.Styles.smallButtonFont);
    } else {
        $.add_to_wish_list.setFont(Alloy.Styles.buttonFont);
    }
    replaceItem = args.replaceItem;
    setUpdateInWishList(replaceItem);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.add_to_wish_list.removeEventListener('click', onAddToWishListClick);
    currentProductModel = null;
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * isEnabled - determine if add_to_wish_list is enabled or not
 *
 *  @api public
 */
function isEnabled() {
    return ($.add_to_wish_list.getTouchEnabled() || $.add_to_wish_list.getEnabled());
}

/**
 * setUpdateInWishList - replace wish list button title
 *
 * @param {boolean} replace - if true repace title
 * @api public
 */
function setUpdateInWishList(replace) {
    if (replace) {
        $.add_to_wish_list.setTitle(_L('Replace in Wish List'));
    } else {
        $.add_to_wish_list.setTitle(_L('Add to Wish List'));
    }
}

/**
 * setEnabled - enable or disable add_to_wish_list button based on state
 *
 * @param {Boolean} state
 * @api public
 */
function setEnabled(state) {

    $.add_to_wish_list.setEnabled(state);
    $.add_to_wish_list.setTouchEnabled(state);
    if (state) {
        $.add_to_wish_list.setColor(Alloy.Styles.accentColor);
    } else {
        $.add_to_wish_list.setColor(Alloy.Styles.color.background.darkGray);
    }

}

/**
 * isCustomerLoggedIn - determine if the customer is logged in
 *
 * @return {Bolean}
 * @api private
 */
function isCustomerLoggedIn() {
    return Alloy.Models.customer.isLoggedIn();
}

/**
 * addProductToWishList - add product to wish List
 *
 * @param {String} wishListId
 * @api private
 */
function addProductToWishList(wishListId) {
    if (!currentProductModel) {
        return;
    }
    var productInfo = currentProductModel.getSelectedProductInfo();
    // if this is a replace item from wish list action execute code in below if statement
    if (replaceItem && replaceItem.replaceInWishList && replaceItem.replaceInWishList.listId == wishListId) {
        var replaceInWishList = replaceItem.replaceInWishList;
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        cCProductLists.deleteItem(replaceInWishList.listId, replaceInWishList.listItemId).done(function(model, opt) {
            cCProductLists.addItem(wishListId, productInfo).done(function(model, opt) {
                replaceItem.id = replaceItem.replaceInWishList.listItemId = model.getItemId();
                lastProductAddedId = productInfo.product_id;
                lastUsedProductListId = wishListId;
                var cPList = cCProductLists.where({
                    id : wishListId
                });
                Alloy.Router.navigateToCart({
                    switchToWishList : true
                });
            }).always(function() {
                deferred.resolve();
            });
        }).fail(function() {
            deferred.resolve();
        });
    } else {
        var promise = cCProductLists.addItem(wishListId, productInfo);
        promise.done(function(model, opt) {
            var wishListName = cCProductLists.getListNameById(wishListId);
            if (cCProductLists.length > 0 && wishListName) {
                wishListName = (wishListName == _L('Wish List Title') ? '' : wishListName);
            } else {
                wishListName = '';
            }
            var message = String.format(_L('%s added to Wish List.'), model.getProductName());
            if (opt.update) {
                message = String.format(_L('%s updated in Wish List.'), model.getProductName());
                if (wishListName != '') {
                    message = String.format(_L('%s updated in Wish List %s.'), model.getProductName(), wishListName);
                }
            } else if (wishListName != '') {
                message = String.format(_L('%s added to Wish List %s.'), model.getProductName(), wishListName);
            }
            notify(message);
            lastProductAddedId = productInfo.product_id;
            lastUsedProductListId = wishListId;
        });
        Alloy.Router.showActivityIndicator(promise);
    }
}

/**
 * onAddToWishListClick - handle add to wish list button click
 *
 * @api private
 */
function onAddToWishListClick() {
    if (isCustomerLoggedIn()) {
        //if multiple wish lists show wish list selector dialog
        if (cCProductLists.getWishListCount() > 1 && !replaceItem) {
            Alloy.Dialog.showCustomDialog({
                controllerPath : 'product/components/productListSelectorDialog',
                continueEvent : 'productListSelectorDialog:continue',
                cancelEvent : 'productListSelectorDialog:dismiss',
                continueFunction : function(event) {
                    if (event && event.listId) {
                        addProductToWishList(event.listId);
                    }
                },
                options : {
                    wishListCollection : cCProductLists.getAllWishLists()
                }
            });
        } else if (cCProductLists.getWishListCount() == 1 || (cCProductLists.getWishListCount() > 1 && replaceItem)) {
            //if only 1 wish list just add product
            addProductToWishList( replaceItem ? replaceItem.replaceInWishList.listId : cCProductLists.getFirstWishListId());
        } else {
            //if no wish list alert user
            Alloy.Dialog.showAlertDialog({
                messageString : String.format(_L('%s does not have a wish list'), currentCustomer.getFullName())
            });
        }

    } else {
        //if customer not logged in the require login
        Alloy.Router.presentCustomerSearchDrawer({
            message : _L('Customer must be logged in to add to wish list. Please look up customer.')
        });
    }
}
