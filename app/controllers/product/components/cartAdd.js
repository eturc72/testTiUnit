// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/cartAdd.js - view component for adding a product to the cart
 * Handles quantity select, availability message and Add to Cart button
 */

//---------------------------------------------------
// ## VARIABLES

var analytics = require('analyticsBase');
var logger = require('logging')('product:components:cartAdd', getFullControllerPath($.__controllerPath));

var processing = false;
var replaceItem = null;
var currentBasket = Alloy.Models.basket;
var currentProduct = Alloy.Models.product;
var EAUtils = require('EAUtils');

// Localization constant
var buttonTextLength = 15;
var symbolButtonTextLength = 9;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.add_to_cart_btn.addEventListener('click', addToCartBtnEventHandler);
$.web_availability_footer_row.addEventListener('click', disabledAddToCartClickEventHandler);

if (Alloy.CFG.enable_wish_list) {
    $.add_to_product_list_container.addEventListener('click', disabledAddToWishListClickEventHandler);
}

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getEnabled = getEnabled;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('init called');

    replaceItem = args && args.replaceItem;
    $model = $model || args && args.model || currentProduct;
    $.listenTo($model, 'change:selected_details', onSelectedDetailsChange);
    $.listenTo($model, 'change:selected_variant', onSelectedVariantChange);
    if (Alloy.CFG.enable_wish_list) {
        if (replaceItem && replaceItem.replaceInWishList) {
            $.add_to_wish_list_button.init({
                productModel : $model,
                replaceItem : replaceItem
            });
        } else {
            $.add_to_wish_list_button.init({
                productModel : $model
            });
        }
    }
    render();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');

    if (!isKioskMode() || (isKioskMode() && isKioskCartEnabled())) {
        var values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (replaceItem && replaceItem.quantity > 9) {
            for (var i = 10; i <= replaceItem.quantity; i++) {
                values.push(i);
            }
        }
        if (replaceItem && !isNaN(replaceItem.quantity)) {
            //reset quantity of product to be replaced
            currentProduct.set({
                quantity : replaceItem.quantity
            }, {
                silent : true
            });
        }
        $.quantitySelectList = Alloy.createController('components/selectWidget', {
            values : values,
            selectListTitleStyle : {
                accessibilityValue : 'quantity_chooser',
                width : 105,
                left : 15
            },
            selectListStyle : {
                width : 105,
                top : 0
            },
            selectedItem : replaceItem ? replaceItem.quantity : 1
        });
        if (replaceItem && replaceItem.quantity) {
            $model.setQuantity(replaceItem.quantity, {
                silent : true
            });
        }
        $.quantity_container.add($.quantitySelectList.getView());
        $.listenTo($.quantitySelectList, 'itemSelected', quantitySelectListEventHandler);
    }

    if (replaceItem && !replaceItem.replaceInWishList) {
        $.add_to_cart_btn.setTitle(_L('Replace in Cart'));
    } else {
        $.add_to_cart_btn.setTitle(_L('Add to Cart'));
    }
    if ($.add_to_cart_btn.getTitle().length > buttonTextLength || (EAUtils.isSymbolBasedLanguage() && $.add_to_cart_btn.getTitle().length > symbolButtonTextLength)) {
        $.add_to_cart_btn.setFont(Alloy.Styles.smallButtonFont);
    }
    if (isKioskMode()) {
        $.add_to_cart_btn.setVisible(isKioskCartEnabled());
        if (!isKioskCartEnabled()) {
            $.quantity_label.setVisible(false);
            $.quantity_label.setWidth(0);
            $.quantity_container.setVisible(false);
            $.quantity_container.setWidth(0);
            $.availability_message_label.setLeft(0);
            $.web_availability_footer_row.remove($.add_to_cart_btn);
        }
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');

    // removes all $.listenTo listeners
    $.stopListening();

    $.add_to_cart_btn.removeEventListener('click', addToCartBtnEventHandler);
    $.web_availability_footer_row.removeEventListener('click', disabledAddToCartClickEventHandler);
    $.quantitySelectList && $.quantitySelectList.deinit();
    $.stopListening($.quantitySelectList, 'itemSelected', quantitySelectListEventHandler);
    if (Alloy.CFG.enable_wish_list && $.add_to_product_list_container && $.add_to_wish_list_button) {
        $.add_to_product_list_container.removeEventListener('click', disabledAddToWishListClickEventHandler);
        $.add_to_wish_list_button.deinit();
    }
    removeAllChildren($.quantity_container);
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * addProduct - Adds the product selected to the basket.  Takes into consideration
 * if options have changed or an item is being replaced.
 *
 * @return {Deferred} promise
 * @api private
 */
function addProduct() {
    var productInfo = $model.getSelectedProductInfo();
    logger.info('Adding product to cart: ' + JSON.stringify(productInfo));
    var haveOptionsChanged = false;
    if (replaceItem) {
        haveOptionsChanged = optionsChanged(productInfo, replaceItem);
    }
    var promise;
    if (replaceItem && !replaceItem.replaceInWishList && replaceItem.product_id == productInfo.product_id && !haveOptionsChanged) {
        // updating the product with a new quantity as nothing else has changed

        promise = currentBasket.replaceProduct({
            product_id : replaceItem.product_id,
            quantity : productInfo.quantity
        }, replaceItem.item_id, {
            c_employee_id : Alloy.Models.associate.getEmployeeId(),
            c_store_id : Alloy.CFG.store_id
        });
        promise.done(function() {
            notify(_L('Item' + (productInfo.quantity > 1 ? 's' : '') + ' updated in the cart'));
            Alloy.Router.navigateToCart();
        }).fail(function(response) {
            logger.error('failure adding product to cart: ' + JSON.stringify(response));
            var msg = _L('Item' + (productInfo.quantity > 1 ? 's' : '') + ' could not be updated in the cart');
            if (response && response.fault && response.fault.message) {
                msg = response.fault.message;
            }
            notify(msg, {
                preventAutoClose : true
            });
        }).always(function() {
            processing = false;
        });

    } else if (replaceItem && !replaceItem.replaceInWishList && (replaceItem.product_id != productInfo.product_id || haveOptionsChanged)) {
        // replacing the product in the cart as the variation or options have changed

        promise = currentBasket.replaceProduct(productInfo, replaceItem.item_id, {
            c_employee_id : Alloy.Models.associate.getEmployeeId(),
            c_store_id : Alloy.CFG.store_id
        });
        promise.done(function() {
            notify(_L('Item' + (productInfo.quantity > 1 ? 's' : '') + ' replaced in the cart'));
            Alloy.Router.navigateToCart();
        }).fail(function(response) {
            logger.error('failure adding product to cart: ' + JSON.stringify(response));
            var msg = _L('Item' + (productInfo.quantity > 1 ? 's' : '') + ' could not be replaced in the cart');
            if (response && response.fault && response.fault.message) {
                msg = response.fault.message;
            }
            notify(msg, {
                preventAutoClose : true
            });
        }).always(function() {
            processing = false;
        });

    } else {
        // adding a new product to the cart
        promise = currentBasket.addProduct(productInfo, {
            c_employee_id : Alloy.Models.associate.getEmployeeId(),
            c_store_id : Alloy.CFG.store_id
        });
        promise.done(function() {
            analytics.fireAnalyticsEvent({
                category : _L('Basket'),
                action : _L('Add To Basket'),
                label : $model.getName() + ($model.getSelectedVariant() ? ' (' + $model.getSelectedVariant().getProductId() + ')' : '')
            });
            notify(_L('Item' + (productInfo.quantity > 1 ? 's' : '') + ' added to the cart'));
        }).fail(function(response) {
            logger.error('failure adding product to cart: ' + JSON.stringify(response));
            var msg = _L('Unable to add item' + (productInfo.quantity > 1 ? 's' : '') + ' to the cart');
            if (response) {
                var fault = response.get('fault');
                if (fault && fault.message && fault.message != '') {
                    msg = fault.message;
                }
            }
            notify(msg, {
                preventAutoClose : true
            });
        }).always(function() {
            processing = false;
        });
    }
    Alloy.Router.showActivityIndicator(promise);
    return promise;
}

/**
 * optionsChanged - determine if the selected options have changed from the original product and the new choices
 *
 * @api private
 */
function optionsChanged(newProduct, oldProduct) {
    logger.info('optionsChanged called');
    // if neither had options, options could not have change
    if (!newProduct.option_items && !oldProduct.option_items) {
        return false;
    }
    if (newProduct.option_items && oldProduct.option_items && newProduct.option_items.length == oldProduct.option_items.length) {
        for (var i = 0,
            n = newProduct.option_items.length; i < n; ++i) {
            if (newProduct.option_items[i].option_value_id !== oldProduct.option_items[i].option_value_id) {
                return true;
            }
        }
        return false;
    }
    return true;
}

/**
 * onSelectedDetailsChange - Model event listener to update the product availability text after reading inventory
 *
 * @api private
 */
function onSelectedDetailsChange(model) {
    logger.info('onSelectedDetailsChange called');
    // Update with appropriate inventory messaging if selected variant or fully configured
    var webAvailability = $model.getInventoryAvailability(model);
    logger.info('web availability: ' + JSON.stringify(webAvailability));
    $.availability_message.setColor(determineAvailabilityTextColor(webAvailability.levels));
    $.availability_message.setText(webAvailability.message);
    var enabled = false;
    if ($model.isProductSelected() && webAvailability.levels.notAvailable <= 0) {
        enabled = true;
    }
    var isOrderable;
    if ((webAvailability.levels.notAvailable > 0 || webAvailability.levels.notAvailable == null) && webAvailability.levels.stockLevel == null) {
        isOrderable = false;
    } else {
        isOrderable = true;
    }
    enableAddToButtons(enabled, isOrderable);
    $.trigger('cartAdd:add_cart_changed');
}

/**
 * determineAvailabilityTextColor - Determines the color for the text of the availability message
 *
 * @api private
 */
function determineAvailabilityTextColor(levels) {
    logger.info('determineAvailabilityTextColor called');
    var color = Alloy.Styles.color.text.dark;
    if (!levels) {
        return color;
    }

    if (levels.preorder > 0) {
        color = Alloy.Styles.color.text.blue;
    }

    if (levels.backorder > 0) {
        color = Alloy.Styles.accentColor;
    }

    if (levels.notAvailable > 0) {
        color = Alloy.Styles.color.text.red;
    }

    return color;
}

/**
 * enableAddToCart - Enable or disable the add to cart button
 *
 * @api private
 */
function enableAddToCart(enabled) {
    logger.info('enableAddToCart called');
    if (isKioskMode() && !isKioskCartEnabled()) {
        enabled = false;
    }
    $.add_to_cart_btn.setEnabled(enabled);
    $.add_to_cart_btn.setTouchEnabled(enabled);
}

/**
 * enableAddToButtons - Enable or disable the add to cart or add to wish list buttons
 *
 * @param {Boolean} enabled
 * @param {Boolean} orderable - is product orderable?
 * @api private
 */
function enableAddToButtons(enabled, orderable) {
    enableAddToCart(enabled);
    if (Alloy.CFG.enable_wish_list) {
        if ( typeof orderable == 'boolean') {
            //if product orderable  enable add to wish list button
            $.add_to_wish_list_button.setEnabled(orderable);
        } else {
            $.add_to_wish_list_button.setEnabled(enabled);
        }

    }

}

/**
 * getEnabled - Returns enabled property of add_to_cart_btn
 *
 * @return {Boolean}
 * @api private
 */
function getEnabled() {
    logger.info('getEnabled called');
    return $.add_to_cart_btn.getEnabled();
}

/**
 * removeOverride - If an override exists need to remove it before adding product
 *
 * @api private
 */
function removeOverride() {
    Alloy.Dialog.showConfirmationDialog({
        messageString : _L('A price override has been applied to this item. Replacing the item will remove the override.'),
        okButtonString : _L('Confirm'),
        okFunction : function() {
            var override = {
                lineItem_id : replaceItem.item_id,
                product_id : replaceItem.product_id,
                price_override_type : 'none',
                index : replaceItem.index,
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
            Alloy.Models.basket.setProductPriceOverride(override, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }).done(function() {
                addProduct();
            }).fail(function(response) {
                logger.error('failure removing product override: ' + JSON.stringify(response));
                processing = false;
            });

        },
        cancelFunction : function() {
            processing = false;
        }
    });
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * disabledAddToCartClickEventHandler - Event handler for when add to cart is clicked when disabled
 *
 * @api private
 */
function disabledAddToCartClickEventHandler() {
    logger.info('disabledAddToCartClickEventHandler called');
    if (!$.add_to_cart_btn.getTouchEnabled() || !$.add_to_cart_btn.getEnabled()) {
        $.trigger('cartAdd:verify_variants');
    }
}

/**
 * disabledAddToWishListClickEventHandler - Event handler for when add to wish list is clicked when disabled
 *
 * @api private
 */
function disabledAddToWishListClickEventHandler() {
    logger.info('disabledAddToWishListClickEventHandler called');
    if (!$.add_to_wish_list_button.isEnabled()) {
        $.trigger('cartAdd:verify_variants');
    }

}

/**
 * addToCartBtnEventHandler - Event handler for add to cart button click
 *
 * @api private
 */
function addToCartBtnEventHandler() {
    logger.info('addToCartBtnEventHandler called');
    if (processing) {
        return;
    }

    $.add_to_cart_btn.animate(Alloy.Animations.bounce);

    processing = true;

    if (replaceItem && replaceItem.price_override == 'true') {
        removeOverride();
    } else {
        addProduct();
    }
}

/**
 * quantitySelectListEventHandler - Event handler for quanity selection change
 *
 * @param {Object} event
 * @api private
 */
function quantitySelectListEventHandler(event) {
    logger.info('quantitySelectListEventHandler selection: ' + JSON.stringify(event.item.value));
    $model.setQuantity(event.item.value, {
        silent : true
    });
    // quantity change means we need to verify inventory for new quantity
    fetchSelectedDetails();
}

/**
 * onSelectedVariantChange - Model event listener for selected variation change
 *
 * @api private
 */
function onSelectedVariantChange() {
    logger.info('onSelectedVariantChange called');
    fetchSelectedDetails();
}

/**
 * fetchSelectedDetails - Product has been selected and need to update inventory and pricing
 *
 * @api private
 */
function fetchSelectedDetails() {
    logger.info('fetchSelectedDetails called');

    // while selection is happening disable add to buttons
    enableAddToButtons(false);
    $.availability_message.setText('');

    if ($model.getSelectedVariant()) {
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        $model.fetchSelectedDetails().always(function() {
            deferred.resolve();
        });
    } else {
        // trigger a change for availability text
        $model.trigger('change:selected_details', $model);
    }
}

//----------------------------------------------
// ## CONSTRUCTOR

// Disable add to cart before registering any event listeners to avoid possible race condition
// of event listener code executing before add to cart is disabled.
enableAddToButtons(false);
