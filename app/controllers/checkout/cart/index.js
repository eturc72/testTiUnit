// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/index.js - controller for cart tab in checkout
 */

//----------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var fetchImages = require('EAUtils').fetchImagesForProducts;
var getVisibleViewFromContainerView = require('EAUtils').getVisibleViewFromContainerView;
var analytics = require('analyticsBase');
var logger = require('logging')('checkout:cart:index', getFullControllerPath($.__controllerPath));

var oldPliHash;
var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;

var cCProductLists = currentCustomer.productLists;
var wishListViewController;
var wishListId = null;

// approaching_promotions globals
var approaching_promotions_timer;

// transformation matrices & animations
var matrix_in = Ti.UI.create2DMatrix();
matrix_in = matrix_in.scale(0, 1);
var matrix_out = Ti.UI.create2DMatrix();
var shrink_down = Ti.UI.createAnimation({
    transform : matrix_in,
    duration : 150,
    autoreverse : false,
    repeat : 0
});
var expand_out = Ti.UI.createAnimation({
    transform : matrix_out,
    duration : 150,
    autoreverse : false,
    repeat : 0
});

var menuRowStyle = $.createStyle({
    classes : ['menu_row_style'],
    apiName : 'Ti.UI.TableRowView'
});
var menuRowLabelStyle = $.createStyle({
    classes : ['menu_row_label_style'],
    apiName : 'Ti.UI.Label'
});
var allMenuItems = [{
    id : 'add_button',
    accessibilityValue : 'add_button',
    text : _L('Add to Cart')
}, {
    id : 'save_later_button',
    accessibilityValue : 'save_later_button',
    text : _L('Save for Later')
}, {
    id : 'add_to_wish_list_button',
    accessibilityValue : 'add_to_wish_list_button',
    text : _L('Add to Wish List')
}, {
    id : 'override_button',
    accessibilityValue : 'override_button',
    text : _L('Override')
}];
var selectedIndexForPopoverMenu;
var cartPopoverMenuWhiteList = ['save_later_button', 'add_to_wish_list_button', 'override_button'];
var saveForLaterPopoverMenuWhiteList = ['add_button', 'add_to_wish_list_button'];

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'associate_logout', function() {
    if (approaching_promotions_timer) {
        clearInterval(approaching_promotions_timer);
    }
});

$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', hideMenuPopover);
$.listenTo(Alloy.eventDispatcher, 'app:dialog_displayed', hideMenuPopover);
$.listenTo(Alloy.eventDispatcher, 'app:navigation', hideMenuPopover);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.cart_table.addEventListener('click', onCartTableClick);

$.cart_table.addEventListener('doubletap', onCartTableDoubleClick);

$.saved_products_table.addEventListener('click', onSavedProductsClick);

$.cart_button.addEventListener('click', switchToSelectedProductListView);

$.saved_products_button.addEventListener('click', switchToSelectedProductListView);

$.wish_list_button.addEventListener('click', switchToSelectedProductListView);

//---------------------------------------------------
// ## MODEL LISTENERS

// This will trigger 'reset' on $.basketProductLineItems ...
//  and subsequently trigger a table redraw ...
$.listenTo(currentBasket, 'basket_sync', function() {
    logger.info('Responding to basket_sync');
    initProductLineItemsCollection();
    displayApproachingPromotions();
});

$.listenTo(currentCustomer, 'change:saved_products reset:saved_products', function() {
    logger.info('Responding to change:saved_products or reset:saved_products');
    initSavedItemsCollection(false);
});

$.listenTo(currentBasket, 'change:approaching_order_promotions  change:approaching_shipping_promotions', function() {
    logger.info('Responding to change:approaching_*_promotions');
    displayApproachingPromotions();
});

$.listenTo(currentBasket, 'change:checkout_status', function() {
    if (currentBasket.getCheckoutStatus() == 'cart') {
        initProductLineItemsCollection();
        displayApproachingPromotions();
    }
});

// when there's a change in the current customer's logged in status, go back to the cart page
$.listenTo(currentCustomer, 'change:login', function() {
    logger.info('Responding to customer change');
    updateCartLabel();
    determineSelectorRowVisibility();
    determineWishListVisibility();
});

$.listenTo(cCProductLists, 'reset', function() {
    wishListId = cCProductLists.getFirstWishListId();
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.switchToWishListView = switchToWishListView;
exports.switchToCartView = switchToCartView;
exports.switchToSavedProductView = switchToSavedProductView;
exports.deleteSavedItem = deleteSavedItem;
exports.deleteItem = deleteItem;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('Calling INIT');
    determineSelectorRowVisibility();
    toggle_cart_on(true);
    displayApproachingPromotions();
    updateCartLabel();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('Calling deinit, removing listeners');
    $.cart_table.removeEventListener('click', onCartTableClick);
    $.cart_table.removeEventListener('doubletap', onCartTableDoubleClick);
    $.saved_products_table.removeEventListener('click', onSavedProductsClick);
    $.cart_button.removeEventListener('click', switchToSelectedProductListView);
    $.saved_products_button.removeEventListener('click', switchToSelectedProductListView);
    $.wish_list_button.removeEventListener('click', switchToSelectedProductListView);
    $.menu_container.setData([]);
    $.menu_container.removeEventListener('click', handleMenuAction);
    hideMenuPopover();
    if (wishListViewController) {
        $.contents_container.remove(wishListViewController.getView());
        wishListViewController.deinit();
        wishListViewController = null;
    }
    deinitRows($.cart_table);
    deinitRows($.saved_products_table);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * toggle_cart_on - show either product items or saved items
 *
 * @param {boolean} state
 * @param {Object} event - event data
 * @api private
 */
function toggle_cart_on(state, event) {
    logger.info('toggle_cart_on ' + state);
    var buttonId;
    if (state) {
        buttonId = 'cart_button';
    } else {
        buttonId = event.source.id;
    }

    switch(buttonId) {
    case 'cart_button':
        // show the cart items
        switchToCartView();
        break;
    case 'saved_products_button':
        // show the saved items
        switchToSavedProductView();
        break;
    case 'wish_list_button':
        // show the wish list items
        switchToWishListView();
        break;
    default:
        break;
    }
}

/**
 * initProductLineItemsCollection - prepare the product line items
 *
 * @api private
 */
function initProductLineItemsCollection() {
    logger.info('Calling initProductLineItemsCollection');
    updateCartLabel();
    var plis = currentBasket.getProductItems();
    var newHash = Ti.Utils.sha256(JSON.stringify(plis));
    // if the plis didn't change, don't do any redrawing
    if (oldPliHash && newHash == oldPliHash) {
        return;
    }
    deinitRows($.cart_table);
    oldPliHash = newHash;
    if (plis && plis.length > 0) {
        logger.info('Calling initProductLineItemsCollection with data');
        // once the data has been set, get all the images
        $.basketProductLineItems.once('reset', function() {
            logger.info('Fetching images for plis');
            fetchImageForProducts(plis, $.cart_table);
        });
        // set the data into the local variable
        $.basketProductLineItems.reset(plis);
    } else {
        // empty product line items
        logger.info('Calling initProductLineItemsCollection with no data');
        $.basketProductLineItems.reset([]);
    }
}

/**
 * initSavedItemsCollection - prepare the saved items
 *
 * @param {Boolean} changeCartVisibility - whether to adjust the cart visibility
 * @api private
 */
function initSavedItemsCollection(changeCartVisibility) {
    updateSavedProductsLabel();
    var plis = currentCustomer.getSavedProducts();
    deinitRows($.saved_products_table);
    if (plis && plis.length > 0) {
        logger.info('Calling initSavedItemsCollection with data');
        // once the data has been set, get all the images
        $.customerProductLineItems.once('reset', function() {
            logger.info('Fetching images for saved plis');
            if ($.saved_products_table.getSections().length > 0) {
                fetchImageForProducts(plis, $.saved_products_table);
            }
        });
        // set the data into the local variable
        $.customerProductLineItems.reset(plis);
    } else {
        logger.info('Calling initSavedItemsCollection with no data');
        $.customerProductLineItems.reset([]);
    }
    var changeVisibility = true;
    if (changeCartVisibility != undefined) {
        changeVisibility = changeCartVisibility;
    }
    if (changeVisibility) {
        adjustSectionVisibility();
    }
}

/**
 * transformPLI - transform the product line item for display
 *
 * @param {Object} model
 * @api private
 */
function transformPLI(model) {
    logger.info('transform PLI');
    return {
        product_name : model.getProductName(),
        product_id : _L('Item# ') + model.getProductId(),
        quantity : _L('Quantity:') + ' ' + model.getQuantity(),
        unit_price : _L('List Price: ') + toCurrency(model.getBasePrice()),
        sub_total : toCurrency(model.getPrice()),
        row_id : 'id_' + model.getProductId(),
        override_price : model.getBasePriceOverride() ? _L('Override: ') + toCurrency(model.getBasePriceOverride()) : ''
    };
}

/**
 * switchToWishListView -  display the wish list view
 *
 * @api public
 */
function switchToWishListView() {
    var visibleView = getVisibleViewFromContainerView($.contents_container);
    if (wishListViewController && visibleView !== wishListViewController.getView()) {
        $.cart_button.setBackgroundImage(Alloy.Styles.buttonLeftOffImage);
        $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonMiddleOffImage);
        $.wish_list_button.setBackgroundImage(Alloy.Styles.buttonRightOnImage);
        flip(visibleView, wishListViewController.getView());
        $.trigger('cart:display', {
            savedItemsDisplayed : false,
            wishListItemsDisplayed : true
        });
    }
}

/**
 * switchToCartView -  display the cart view
 *
 * @api public
 */
function switchToCartView() {
    var visibleView = getVisibleViewFromContainerView($.contents_container);
    if (visibleView !== $.pli_container) {
        $.cart_button.setBackgroundImage(Alloy.Styles.buttonLeftOnImage);
        if (Alloy.CFG.enable_wish_list) {
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonMiddleOffImage);
            $.wish_list_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
        } else {
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
        }
        if (visibleView) {
            flip(visibleView, $.pli_container);
        } else {
            flip($.pli_container, $.pli_container);
        }
        $.trigger('cart:display', {
            savedItemsDisplayed : false,
            wishListItemsDisplayed : false
        });
    }
}

/**
 * switchToSavedProductView -  display the saved products view
 *
 * @api public
 */
function switchToSavedProductView() {
    var visibleView = getVisibleViewFromContainerView($.contents_container);
    if (visibleView !== $.saved_products_container) {
        $.cart_button.setBackgroundImage(Alloy.Styles.buttonLeftOffImage);
        if (Alloy.CFG.enable_wish_list) {
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonMiddleOnImage);
            $.wish_list_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
        } else {
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonRightOnImage);
        }
        flip(visibleView, $.saved_products_container);
        $.trigger('cart:display', {
            savedItemsDisplayed : true,
            wishListItemsDisplayed : false
        });
    }
}

/**
 * deleteSavedItem - delete an item from the saved items
 *
 * @param {int} index
 * @api public
 */
function deleteSavedItem(index) {
    logger.info('delete saved item');
    var item = currentCustomer.getSavedProducts()[index];
    var promise = currentCustomer.removeSavedProduct(item);
    Alloy.Router.showActivityIndicator(promise);
    initSavedItemsCollection(false);
}

/**
 * deleteItem - delete an item from the cart
 *
 * @param {int} index
 * @api private
 */
function deleteItem(index) {
    logger.info('delete item');
    var promise = currentBasket.removeItem(currentBasket.getProductItems()[index].getItemId());
    Alloy.Router.showActivityIndicator(promise);
}


/**
 * addToCartFromAnotherList - add product to cart from wish list view or from save for later view
 *
 * @param {Object} item - product list or product line item
 * @api private
 */
function addToCartFromAnotherList(item) {
    var productId = item.getProductId();
    var productName = item.getProductName();
    var product = {
        product_id : productId,
        quantity : item.getQuantity()
    };
    var addProduct = currentBasket.addProduct(product, {
        c_employee_id : Alloy.Models.associate.getEmployeeId(),
        c_store_id : Alloy.CFG.store_id
    });
    // show an activity indicator so the product can't be added more than once
    Alloy.Router.showActivityIndicator(addProduct);
    addProduct.done(function() {
        currentCustomer.removeSavedProduct(item);
        initSavedItemsCollection();
        analytics.fireAnalyticsEvent({
            category : _L('Basket'),
            action : _L('Add To Basket'),
            label : productName + ' (' + productId + ')'
        });
    }).fail(function(failModel) {
        var fault = failModel ? failModel.get('fault') : null;
        var errorMsg = _L('Unable to add item' + (item.getQuantity() > 1 ? 's' : '') + ' to the cart');
        if (fault) {
            if (fault.type && fault.type === 'ProductItemNotAvailableException') {
                errorMsg = String.format(_L('Item \'%s\' is not available in quantity %d.'), productName, item.getQuantity());
            } else if (fault.message && fault.message != '') {
                errorMsg = fault.message;
            }
        }
        notify(errorMsg, {
            preventAutoClose : true
        });
    });
}

/**
 * addProductToWishList - add product to wish list
 *
 * @param {Object} productInfo - product id and quantity
 * @param {String} listId - wish list id
 * @api private
 */
function addProductToWishList(productInfo, listId) {
    if (cCProductLists.getWishListCount() > 1) {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'product/components/productListSelectorDialog',
            continueEvent : 'productListSelectorDialog:continue',
            cancelEvent : 'productListSelectorDialog:dismiss',
            continueFunction : function(event) {
                if (event && event.listId) {
                    var promise = cCProductLists.addItem(event.listId, productInfo);
                    promise.done(function(model, opt) {
                        notifyOnProductAddedToWishList(event.listId, model, opt);
                    }).fail(function(model) {
                    });
                    Alloy.Router.showActivityIndicator(promise);
                }
            },
            options : {
                wishListCollection : cCProductLists.getAllWishLists()
            }
        });
    } else {
        var promise = cCProductLists.addItem(listId, productInfo);
        promise.done(function(model, opt) {
            notifyOnProductAddedToWishList(listId, model, opt);
        }).fail(function(model) {
        });
        Alloy.Router.showActivityIndicator(promise);
    }
}

/**
 * notifyOnProductAddedToWishList - notify user when product is added to wish list
 *
 * @param {String} listId - Wish list Id
 * @param {Oject} model - model returned when product is added to wish list
 * @param {Oject} options - options returned when product is added to wish list
 * @api private
 */
function notifyOnProductAddedToWishList(listId, model, options) {
    var cPList = cCProductLists.where({
        id : listId
    });
    var itemText = model.getProductName();
    var wishListName = getWishListNameFromPListArray(cPList);
    var message = String.format(_L('%s added to Wish List.'), itemText);
    if (options.update) {
        message = String.format(_L('%s updated in Wish List.'), itemText);
        if (wishListName != '') {
            message = String.format(_L('%s updated in Wish List %s.'), itemText, wishListName);
        }
    } else if (wishListName != '') {
        message = String.format(_L('%s added to Wish List %s.'), itemText, wishListName);
    }
    notify(message);
}

/**
 * getWishListNameFromPListArray - return empty string if name of wish list is wish list and the actual name of the wish list in bracket otherwise
 *
 * @param {Array} cPList - product list object array of length 1
 * @return {String} wishListName
 * @api private
 */
function getWishListNameFromPListArray(cPList) {
    var wishListName = '';
    if (cPList && cPList.length > 0) {
        if (cPList[0].getName()) {
            wishListName = (cPList[0].getName() == _L('Wish List Title') ? '' : cPList[0].getName());
        }
    }
    return wishListName;
}

/**
 * openProductOverrideDialog - prepare to show the product price override dialog
 *
 * @param {Product} item
 * @param {int} index
 * @api private
 */
function openProductOverrideDialog(item, index) {
    logger.info('openProductOverrideDialog');
    var product = Alloy.createModel('product');
    product.set('id', item.getProductId());
    var promise = product.fetchModel();
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        var itemForProductOverride = {
            price_override : item.getPriceOverride(),
            manager_employee_id : item.getManagerEmployeeId(),
            product_name : item.getProductName(),
            image : item.getThumbnailUrl(),
            base_price : item.getBasePrice(),
            price_override_type : item.getPriceOverrideType(),
            price_override_reason_code : item.getPriceOverrideReasonCode(),
            price_override_value : item.getPriceOverrideValue(),
            product_id : item.getProductId(),
            item_id: item.getItemId()
        };
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/cart/productPriceAdjustments',
            initOptions : {
                pli : itemForProductOverride,
                index : index
            },
            continueEvent : 'productOverride:dismiss'

        });
    }).fail(function() {
        notify(_L('Unable to open product override dialog.'), {
            preventAutoClose : true
        });
    });
}

/**
 * displayApproachingPromotions - hide or show the approaching promotions section
 *
 * @api private
 */
function displayApproachingPromotions() {
    logger.info('displayApproachingPromotions');
    // clear out old timers
    if (approaching_promotions_timer) {
        clearInterval(approaching_promotions_timer);
    }
    var plis = currentBasket ? currentBasket.getProductItems() : null;
    if (plis && plis.length > 0) {
        var aops = currentBasket.getApproachingOrderPromotions();
        var asps = currentBasket.getApproachingShippingPromotions();
        var orderPriceDescriptions = currentBasket.getOrderPriceDescriptions();
        var approaching_promotions = null;
        if (aops && asps) {
            approaching_promotions = aops.concat(asps);
        } else if (aops) {
            approaching_promotions = aops;
        } else if (asps) {
            approaching_promotions = asps;
        }
        // there are approaching promotions to display
        if ((approaching_promotions && approaching_promotions.length > 0) || (orderPriceDescriptions && orderPriceDescriptions.length > 0)) {
            var promotions_strings = [];
            for (var i = 0; i < approaching_promotions.length; i++) {
                promotions_strings.push(String.format(_L('%s to go for \'%s\''), toCurrency(approaching_promotions[i].amount_to_qualify), approaching_promotions[i].promotion_description));
            }
            for (var i = 0; i < orderPriceDescriptions.length; i++) {
                promotions_strings.push(String.format(_L('%s off for \'%s\''), toCurrency(Math.abs(orderPriceDescriptions[i].getPrice())), orderPriceDescriptions[i].get('item_text')));
            }
            // adjust heights of some of the sections based on whether the customer is logged in
            if (Alloy.Models.customer.isLoggedIn()) {
                $.contents_container.setHeight(540);
            } else {
                $.contents_container.setHeight(591);
            }
            $.approaching_discount_container.show();
            $.approaching_discount_container.setHeight(60);
            // cycle through the approaching promotions
            var loop_counter = 0;
            loop_counter = showApproachingPromotion(promotions_strings, loop_counter);
            if (promotions_strings.length > 1) {
                approaching_promotions_timer = setInterval(function() {
                    loop_counter = showApproachingPromotion(promotions_strings, loop_counter);
                }, 5 * 1000);
            }

        } else {
            clearApproachingPromotions();
        }
    } else {
        clearApproachingPromotions();
    }
}

/**
 * showApproachingPromotion - loop through approaching promotions
 *
 * @api private
 */
function showApproachingPromotion(promotions_strings, loop_counter) {
    $.approaching_discount_label.setText(promotions_strings[loop_counter]);
    loop_counter++;
    if (loop_counter >= promotions_strings.length) {
        loop_counter = 0;
    }
    return loop_counter;
}

/**
 * updateWishListViewAndButtonTitle - update the label of how many items are in the wish list, and hide wish list table when there is no item
 *
 * @param {Number} count - total quantity of item in current wish list
 * @api private
 */

function updateWishListButtonTitle(count) {
    if (count < 0) {
        $.wish_list_button.setTitle(_L('Wish List'));
        return;
    }
    $.wish_list_button.setTitle(String.format(_L('Wish List: %d'), count));
}

/**
 * udpateCartLabel - update the label of how many items are in the cart. if no items in the cart,
 * show the no products label
 *
 * @api private
 */
function updateCartLabel() {
    logger.info('updateCartLabel');
    var total = calculateQuantity(currentBasket.getProductItems());
    $.cart_button.setTitle(String.format(_L('Cart Items: %d'), total));
    if (total == 0) {
        if (currentCustomer.isLoggedIn()) {
            $.pli_container.setTop(5);
        } else {
            $.pli_container.setTop(0);
        }
        $.cart_table.hide();
        $.cart_table.setHeight(0);
        $.no_products_container.show();
        $.no_products_container.setHeight('100%');
        $.no_products_container.setWidth('100%');
        $.no_products_container.setTop(0);
    } else {
        $.pli_container.setTop(0);
        $.cart_table.setHeight('100%');
        $.no_products_container.hide();
        $.no_products_container.setHeight(0);
        $.cart_table.show();
        displayApproachingPromotions();
    }
}

/**
 * udpateSavedProductsLabel - update the label of how many items are in the saved items. if no items in the saved items,
 * show the no products label
 *
 * @api private
 */
function updateSavedProductsLabel() {
    logger.info('updateSavedProductsLabel');
    var total = calculateQuantity(currentCustomer.getSavedProducts());
    $.saved_products_button.setTitle(String.format(_L('Saved Items: %d'), total));
    if (total == 0) {
        $.saved_products_table.hide();
        $.saved_products_table.setHeight(0);
        $.no_saved_products_container.show();
        $.no_saved_products_container.setHeight('100%');
        $.no_saved_products_container.setWidth('100%');
        $.no_saved_products_container.setTop(0);
    } else {
        $.no_saved_products_container.hide();
        $.no_saved_products_container.setHeight(0);
        $.saved_products_table.show();
        $.saved_products_table.setHeight('100%');
    }
}

/**
 * calculateQuantity - calculate the quantity selected
 *
 * @api private
 */
function calculateQuantity(productItems) {
    var sum = 0;
    if (productItems.length > 0) {
        sum = _.reduce(productItems, function(memo, product) {
            return memo + product.getQuantity();
        }, 0);
    }
    return sum;
}

/**
 * adjustSectionVisibility - adjust visibility of some parts of the page
 *
 * @api private
 */
function adjustSectionVisibility() {
    $.no_products_container.hide();
    $.no_products_container.setHeight(0);
    $.cart_table.show();
    displayApproachingPromotions();
    toggle_cart_on(true);
}

/**
 * fetchImageForProducts - get all the images for the products
 *
 * @param {Collection} plis
 * @param {TableView} table
 * @api private
 */
function fetchImageForProducts(plis, table) {
    fetchImages(plis, table);
}

/**
 * flip - flip from products to save products or back
 *
 * @param {container} from
 * @param {container} to
 * @api private
 */
function flip(from, to) {
    if (!from && to) {
        to.show();
        return;
    }
    if (from && !to) {
        from.show();
        return;
    }
    if (from === to) {
        // show to
        to.transform = matrix_in;
        to.show();
        to.animate(expand_out);
    } else {
        from.animate(shrink_down, function() {
            // hide from
            from.hide();
            from.transform = matrix_out;

            // show to
            to.transform = matrix_in;
            to.show();
            to.animate(expand_out);
        });
    }
}

/**
 * clearApproachingPromotions - clear the approaching promotions section
 *
 * @api private
 */
function clearApproachingPromotions() {
    if (approaching_promotions_timer) {
        clearInterval(approaching_promotions_timer);
    }
    $.approaching_discount_label.setText('');
    $.approaching_discount_container.hide();
    $.approaching_discount_container.setHeight(0);
    // adjust heights depending if there's a logged in customer
    if (Alloy.Models.customer.isLoggedIn()) {
        $.contents_container.setHeight(600);
    } else {
        $.contents_container.setHeight(651);
    }
    $.cart_table.setHeight('100%');
}

/**
 * determineSelectorRowVisibility - determine if the selectorRow should be shown
 *
 * @api private
 */
function determineSelectorRowVisibility() {
    // if there's a logged in customer, show the saved cart selector
    if (Alloy.Models.customer.isLoggedIn()) {
        $.selectorRow.setHeight(51);
        $.selectorRow.show();
        $.contents_container.setBackgroundColor(Alloy.Styles.color.background.medium);
    } else {
        $.selectorRow.hide();
        $.selectorRow.setHeight(0);
        $.saved_products_container.hide();
        $.contents_container.setBackgroundColor(Alloy.Styles.color.background.white);
    }
}

/**
 * determineWishListVisibility - determine if the wish list should be rendered or not
 *
 * @api private
 */
function determineWishListVisibility() {
    // if there's a logged in customer, show the saved cart selector
    if (Alloy.Models.customer.isLoggedIn()) {
        if (Alloy.CFG.enable_wish_list && !wishListViewController) {
            wishListViewController = Alloy.createController('checkout/cart/wishList', {
                addToCartFromAnotherList : addToCartFromAnotherList,
                navigateToProduct : navigateToProduct,
                confirmDeleteItem : confirmDeleteItem,
                updateWishListButtonTitle : updateWishListButtonTitle,
                fetchImageForProducts : fetchImageForProducts,
                getWishListNameFromPListArray : getWishListNameFromPListArray
            });
            $.contents_container.add(wishListViewController.getView());
            wishListViewController.getView().hide();
        }
        if (Alloy.CFG.enable_wish_list) {
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonMiddleOffImage);
            $.cart_button.setLeft(100);
            $.saved_products_button.setLeft(1);
            $.wish_list_button.applyProperties({
                visible : true,
                height : 27,
                width : 150,
                touchEnabled : true
            });
        } else {
            $.cart_button.setLeft(200);
            $.saved_products_button.setLeft(0);
            $.saved_products_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
            $.wish_list_button.applyProperties({
                visible : false,
                height : 0,
                width : 0,
                touchEnabled : false
            });
        }
    } else {
        if (wishListViewController) {
            $.contents_container.remove(wishListViewController.getView());
            wishListViewController.deinit();
            wishListViewController = null;
        }
    }
}

/**
 * setupRemoveOverride - removes the already set up override.
 *
 * @param product_id
 * @param index
 * @return {Deferred} promise
 * @api private
 */

function setupRemoveOverride(product_id, index) {
    var deferred = new _.Deferred();
    Alloy.Dialog.showConfirmationDialog({
        messageString : _L('A price override has been applied to this item. Saving the item will remove the override.'),
        okButtonString : _L('Confirm'),
        okFunction : function() {
            var override = {
                product_id : product_id,
                index : index,
                price_override_type : 'none',
                employee_id : Alloy.Models.associate.getEmployeeId(),
                employee_passcode : Alloy.Models.associate.getPasscode(),
                store_id : Alloy.CFG.store_id
            };

            if (isKioskManagerLoggedIn()) {
                override.manager_employee_id = getKioskManager().getEmployeeId();
                override.manager_employee_passcode = getKioskManager().getPasscode();
                override.manager_allowLOBO = getKioskManager().getPermissions().allowLOBO;
                override.kiosk_mode = isKioskMode();
            }
            // now remove the override
            currentBasket.setProductPriceOverride(override, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }, {
                silent : true
            }).done(function() {
                // override removed, so continue with whatever is next
                deferred.resolve();
            }).fail(function() {
                // override not removed, so nothing should happen next
                deferred.reject();
            });
        },
        cancelFunction : function() {
            deferred.reject();
        }
    });
    return deferred.promise();
}

/**
 * saveItemForLater - saves the item for later and update the item quantity
 *
 * @param item
 * @param index
 * @api private
 */
function saveItemForLater(item, index) {
    item.setMessage(null, {
        silent : true
    });

    var product = {
        product_id : item.getProductId(),
        quantity : item.getQuantity()
    };
    var deferred = new _.Deferred();
    currentCustomer.addSavedProduct(product, {
        c_employee_id : Alloy.Models.associate.getEmployeeId(),
        c_store_id : Alloy.CFG.store_id
    }).done(function() {
        currentBasket.removeItem(item.getItemId()).done(function() {
            initSavedItemsCollection();
            deferred.resolve();
        }).fail(function(failModel) {
            var fault = failModel ? failModel.get('fault') : null;
            var errorMsg = _L('Unable to delete item.');
            if (fault && fault.message && fault.message != '') {
                errorMsg = fault.message;
            }
            notify(errorMsg, {
                preventAutoClose : true
            });
            deferred.reject();
        });
    }).fail(function(failModel) {
        var fault = failModel ? failModel.get('fault') : null;
        var errorMsg = _L('Unable to save item.');
        if (fault && fault.message && fault.message != '') {
            errorMsg = fault.message;
        }
        notify(errorMsg, {
            preventAutoClose : true
        });
        deferred.reject();
    });

    Alloy.Router.showActivityIndicator(deferred);
}

/**
 * confirmDeleteItem - displays the custom dialog to confirm deletion of item
 *
 * @param event
 * @param callback
 * @api private
 */
function confirmDeleteItem(event, callback) {
    // Shows the confirmation overlay, and if that is confirmed, removes
    // the item from the cart
    Alloy.Dialog.showConfirmationDialog({
        messageString : String.format(_L('Do you really want to delete this item?'), event.product_name),
        titleString : _L('Delete Item'),
        okButtonString : _L('Delete'),
        okFunction : function() {
            //if call originated from wish list view
            if (event.wishListId && event.wishListItemId) {
                callback(event.wishListId, event.wishListItemId);
            } else {
                callback(event.index);
            }
        }
    });
}

/**
 * navigateToProduct - navigate to the product details page
 *
 * @param product_id
 * @param replaceItem
 * @api private
 */
function navigateToProduct(product_id, replaceItem) {
    var config = {
        product_id : product_id,
    };
    if (replaceItem) {
        config.replaceItem = replaceItem;
    }
    Alloy.Router.navigateToProduct(config);
}

/**
 * showPopoverMenu - Show popover menu
 *
 * @param {Object} sourceButton - Ti.UI.Button
 * @param {Array} whiteList - allowed menu list
 * @param {Number} selectedIndex - Product row clicked on from the tableview
 * @api private
 */
function showPopoverMenu(sourceButton, whiteList, selectedIndex) {
    var menuItems = [];
    //filter the menu to dispaly the appropriate menu items
    menuItems = allMenuItems.filter(function(row) {
        if (whiteList.indexOf(row.id) > -1) {

            switch(row.id) {
            case 'save_later_button':
                if (!Alloy.Models.customer.isLoggedIn()) {
                    return false;
                }
                break;
            case 'add_to_wish_list_button':
                if (!Alloy.Models.customer.isLoggedIn()) {
                    return false;
                }
                if (!Alloy.CFG.enable_wish_list) {
                    return false;
                } else if (Alloy.CFG.enable_wish_list && Alloy.Models.customer.productLists.getWishListCount() < 1) {
                    return false;
                }
                break;
            case 'override_button':
                if (!Alloy.CFG.overrides.product_price_overrides) {
                    return false;
                } else if (isKioskMode() && !isKioskManagerLoggedIn()) {
                    return false;
                }
                break;
            }

            return true;

        }
        return false;
    });

    if (menuItems.length > 0) {
        selectedIndexForPopoverMenu = selectedIndex;
        var menuRowViews = [];

        //create menu items UI
        _.each(menuItems, function(row) {
            var cMenuRowView = Ti.UI.createTableViewRow(menuRowStyle);
            cMenuRowView.add(_.extend(Ti.UI.createLabel(menuRowLabelStyle), row));
            menuRowViews.push(cMenuRowView);
        });

        //each menu item UI should have a height of 50
        $.menu_container.setHeight(50 * menuItems.length);
        $.menu_container.setData(menuRowViews);

        //determine coordinate of popover view relative to screen
        var sourceButtonPointRelativeToScreen = sourceButton.convertPointToView({
            x : sourceButton.rect.x,
            y : sourceButton.rect.y
        }, $.cart.parent.parent);

        //Determine whether popover arrow direction should face up or down for popover to be fully displayed
        if (Ti.Platform.displayCaps.platformHeight - sourceButtonPointRelativeToScreen.y > 230) {
            $.more_menu_popover.setArrowDirection(Titanium.UI.iPad.POPOVER_ARROW_DIRECTION_UP);
        } else {
            $.more_menu_popover.setArrowDirection(Titanium.UI.iPad.POPOVER_ARROW_DIRECTION_DOWN);
        }

        $.more_menu_popover.show({
            view : sourceButton
        });
    } else {
        selectedIndexForPopoverMenu = null;
    }
}

/**
 * hideMenuPopover - Hide menu popover
 *
 * @api private
 */
function hideMenuPopover() {
    $.more_menu_popover.hide();
}

/**
 * handleMenuAction - Handle popover menu clicked action
 *
 * @param {Object} event
 * @api private
 *
 */
function handleMenuAction(event) {
    hideMenuPopover();
    var visibleView = getVisibleViewFromContainerView($.contents_container);
    switch(visibleView) {
    case $.saved_products_container:
        var item = currentCustomer.getSavedProducts()[selectedIndexForPopoverMenu];
        var productId = item.getProductId();
        switch(event.source.id) {
        case 'add_button':
            // move the product from the saved items to the cart
            addToCartFromAnotherList(item);
            break;
        case 'add_to_wish_list_button':
            //add to wish list
            addProductToWishList({
                product_id : productId,
                quantity : item.getQuantity()
            }, wishListId);
            break;
        }
        break;
    case $.pli_container:
        var item = currentBasket.getProductItems()[selectedIndexForPopoverMenu];
        var productId = item.getProductId();
        switch(event.source.id) {
        case 'save_later_button':
            // move to the saved items collection
            if (!currentCustomer.getSavedProducts()) {
                currentBasket.setSavedProducts(new Backbone.Collection());
            }
            if (item.getPriceOverride() == 'true') {
                setupRemoveOverride(productId, selectedIndexForPopoverMenu).done(function() {
                    saveItemForLater(item, selectedIndexForPopoverMenu);
                });
            } else {
                saveItemForLater(item, selectedIndexForPopoverMenu);
            }
            break;
        case 'add_to_wish_list_button':
            //add to wish list
            addProductToWishList({
                product_id : productId,
                quantity : item.getQuantity()
            }, wishListId);
            break;
        case 'override_button':
            // price override
            openProductOverrideDialog(item, selectedIndexForPopoverMenu);
            break;
        }
        break;
    }
}

/**
 * deinitRows - deinit the old rows in the table to remove listeners
 *
 * @api private
 */
function deinitRows(table) {
    // cleanup the old rows
    if (table.getSections().length > 0) {
        _.each(table.getSections()[0].getRows(), function(row) {
            row.deinit();
        });
    }
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCartTableClick - when the cart items table is clicked on for button actions
 *
 * @api private
 */
function onCartTableClick(event) {
    var item = currentBasket.getProductItems()[event.index];
    var product_id = item.getProductId();
    var product_name = item.getProductName();
    // remove the product
    if (event.source.id === 'delete_button') {
        confirmDeleteItem({
            index : event.index,
            product_name : product_name
        }, deleteItem);
    } else if (event.source.id === 'more_menu_button') {
        // show Popover Menu
        showPopoverMenu(event.source, cartPopoverMenuWhiteList, event.index);
    } else if (event.source.id === 'override_button') {
        // price override
        openProductOverrideDialog(item, event.index);
    } else if (event.source.id === 'edit_button') {
        // edit the product. go back to the PDP
        var item_json = item.toJSON();
        item_json.index = event.index;
        navigateToProduct(item.get('product_id'), item_json);
    }
}

/**
 * switchToSelectedProductListView - display the selected product list view on cart_button, saved_products_button or wish_list_button click
 *
 * @param {Object} event - event data
 * @api private
 */
function switchToSelectedProductListView(event) {
    if (event.source === $.pli_container) {
        toggle_cart_on(true, event);
    } else {
        toggle_cart_on(false, event);
    }
}


/**
 * onCartTableDoubleClick - double tap on cart table to bring up override
 *
 * @param {Object} event
 * @api private
 */
function onCartTableDoubleClick(event) {
    // sometimes the override button will be hidden. doubletap will reveal it
    var row = $.cart_table.getSections()[0].getRows()[event.index];
    if (row) {
        row.showOverrideButton.call(this);
    }
}

/**
 * onSavedProductsClick - when the saved items table is clicked on for buttons
 *
 * @param {Object} event
 * @api private
 */
function onSavedProductsClick(event) {
    var item = currentCustomer.getSavedProducts()[event.index];
    var product_id = item.getProductId();
    var product_name = item.getProductName();
    if (event.source.id === 'add_button') {
        // move the product from the saved items to the cart
        addToCartFromAnotherList(item);
    } else if (event.source.id === 'more_menu_button') {
        // show Popover Menu
        showPopoverMenu(event.source, saveForLaterPopoverMenuWhiteList, event.index);
    } else if (event.source.id === 'delete_button') {
        // delete the item from the saved items collection
        confirmDeleteItem({
            index : event.index,
            product_name : product_name
        }, deleteSavedItem);
    } else if (event.source.id === 'product_name' || event.source.id === 'product_image') {
        // go to the PDP for the product
        navigateToProduct(product_id);
    }
}

/**
 * onCartTabClick - event on cart tab clicked for when customer is logged in
 *
 * @api private
 */
function onCartTabClick() {
    toggle_cart_on(true);
}

/**
 * onSavedTabClick - event on saved tab clicked for when customer is logged in
 *
 * @api private
 */
function onSavedTabClick() {
    toggle_cart_on(false);
}


