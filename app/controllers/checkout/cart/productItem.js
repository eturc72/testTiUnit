// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/productItem.js - A single row in the product items or the saved items
 */

//----------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var currencyCode;
var strikeThroughListPrice = false;
var strikeThroughSalePrice = false;
var eaUtils = require('EAUtils');
var logger = require('logging')('checkout:cart:productItem', getFullControllerPath($.__controllerPath));
var args = $.args;

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Product} product
 * @param {ProductLineItem} pli
 * @param {String} newCurrencyCode
 * @param {String} country
 *
 * @api public
 */
function init(product, pli, newCurrencyCode, country) {
    logger.info('init');
    addPricingToProductListItem(product, pli);
    currencyCode = newCurrencyCode;
    $.pli.clear();
    $.pli.set(pli.toJSON());
    updateImage(product, pli);
    updateVariations(product);
    updateOptionText(pli);
    updateMessageLabel(pli);
    showPurchaseQuantity(pli);
    if (hasScaleDown()) {
        scaleDown();
        return;
    }
    updateSalePrice(product, country ? country : '');
    updateOverridePrice(pli, product);
    updateDueToCoupon(pli, product);
    updateProductDiscounts(pli);

}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    // stop listening to the model events
    logger.info('DEINIT called');
    $.stopListening();
    removeAllChildren($.variation_container);
    if (!hasScaleDown()) {
        removeAllChildren($.price_adjustments_container);
    }
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateOptionText - update the option information
 *
 * @param {ProductLineItem} pli
 * @api private
 */
function updateOptionText(pli) {
    if (_.isFunction(pli.getOptionItems) && pli.getOptionItems().length > 0) {
        var optionItems = pli.getOptionItems();
        var option = optionItems[0];
        $.option_text.setText(option.getItemText());
        if (option.getPrice() != 0) {
            $.option_price_label.setText(_L('Option Price:') + ' ' + toCurrency(option.getPrice(), currencyCode));
        }
    } else {
        $.option_text.hide();
        $.option_price_container.hide();
        $.option_text.setHeight(0);
        $.option_price_container.setHeight(0);
    }
}

/**
 * updateVariations - update the variation information
 *
 * @param {Product} product
 * @api private
 */
function updateVariations(product) {
    var vvs = product.getVariationValues();
    // make a new label for every variation value
    for (var name in vvs) {
        var displayName = product.getVariationAttributeDisplayName(name);
        var value = product.getVariationAttributeByName(name);
        var label = Ti.UI.createLabel({
            textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
            left : 0,
            height : Titanium.UI.SIZE,
            font : Alloy.Styles.lineItemFont,
            color : Alloy.Styles.color.text.mediumdark,
            text : String.format(_L('%s: %s'), displayName, value)
        });
        $.variation_container.add(label);
    }
}

/**
 * updateOverridePrice - update the price if there's an override
 *
 * @param {ProductLineItem} pli
 * @param {Product} product
 * @api private
 */
function updateOverridePrice(pli, product) {
    if (_.isFunction(pli.getPriceOverride) && pli.getPriceOverride() === 'true') {
        // if there's a sale price, strike through that, otherwise strike through the list price
        if (product.getSalePrice()) {
            addPriceStrikeThrough($.sale_price_container, $.sale_price_label);
            strikeThroughSalePrice = true;
        } else {
            addPriceStrikeThrough($.unit_price_container, $.unit_price_label);
            strikeThroughListPrice = true;
        }
    } else {
        $.override_price_container.hide();
        $.override_price_container.setHeight(0);
    }
}

/**
 * addPriceStrikeThrough - add a strike through on the given price
 *
 * @param {Container} container
 * @param {Label} label
 * @api private
 */
function addPriceStrikeThrough(container, label) {
    var width = 60;
    var len = label.getText().length;
    width += (len - 5) * 5;
    container.setWidth(width);
    eaUtils.strikeThrough(label, label.getText());
}

/**
 * updateSalePrice - show a sale price
 *
 * @param {Product} product
 * @param {String} country
 * @api private
 */
function updateSalePrice(product, country) {
    var country = country ? country : '';
    var salePrice = product.getSalePrice(country);
    if (salePrice) {
        var listPrice = product.getListPrice(country);
        $.unit_price_label.setText(_L('List Price:') + ' ' + toCurrency(listPrice, currencyCode));
        $.sale_price_label.setText(_L('Sale Price:') + ' ' + toCurrency(salePrice, currencyCode));
        $.sale_price_label.setWidth(Ti.UI.SIZE);
        // strike through the unit price
        addPriceStrikeThrough($.unit_price_container, $.unit_price_label);
        strikeThroughListPrice = true;
    } else {
        $.sale_price_container.setHeight(0);
        $.sale_price_container.hide();
    }
}

/**
 * updateImage - update the image for the product
 *
 * @param {Product} product
 * @api private
 */
function updateImage(product, pli) {
    var image;
    if (_.isFunction(pli.getThumbnailUrl)) {
        image = pli.getThumbnailUrl() ? pli.getThumbnailUrl() : product.getCartImage();
    } else {
        image = product.getCartImage();
    }
    if (image) {
        // set the image into the right image view
        var imageView = $.product_image;
        if (!imageView.image) {
            Alloy.Globals.getImageViewImage(imageView, image);
        }
    }
}

/**
 * transform - transform the product line item for display purposes
 *
 * @api private
 */
$.pli.transform = function() {
    return {
        product_name : $.pli.getProductName(),
        product_id : _L('Item# ') + $.pli.getProductId(),
        quantity : _L('Quantity:') + ' ' + $.pli.getQuantity(),
        unit_price : _L('List Price:') + ' ' + toCurrency($.pli.getBasePrice(), currencyCode),
        sub_total : toCurrency($.pli.getPrice()),
        override_price : $.pli.getBasePriceOverride() ? _L('Override:') + ' ' + toCurrency($.pli.getBasePriceOverride(), currencyCode) : '',
        item_price : _L('Item Price:') + ' ' + toCurrency($.pli.getPrice(), currencyCode)
    };
};

/**
 * updateDueToCoupon - update prices due to a coupon being applied
 *
 * @param {ProductLineItem} pli
 * @param {Product} product
 * @api private
 */
function updateDueToCoupon(pli, product) {
    if (_.isFunction(pli.getPriceAdjustments) && pli.getPriceAdjustments().length > 0) {
        // strike through the list price
        if (!strikeThroughListPrice) {
            addPriceStrikeThrough($.unit_price_container, $.unit_price_label);
        }
        // strike through the override price
        if (pli.getPriceOverride() === 'true') {
            addPriceStrikeThrough($.override_price_container, $.override_price_label);
        }
        // update the sale price
        if (product.getSalePrice() && !strikeThroughSalePrice) {
            addPriceStrikeThrough($.sale_price_container, $.sale_price_label);
        }
    }
}

/**
 * showPurchaseQuantity - show the purchased quantity for product list items
 *
 * @param {Object} pli  - Product List Item
 * @api private
 */
function showPurchaseQuantity(pli) {
    if (_.isFunction(pli.getPurchasedQuantity)) {

        $.product_info_container.add(Ti.UI.createLabel({
            width : Ti.UI.SIZE,
            height : Titanium.UI.SIZE,
            color : Alloy.Styles.color.text.mediumdark,
            textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
            left : 0,
            font : Alloy.Styles.lineItemFont,
            accessibilityLabel : 'purchased_quantity',
            text : String.format(_L('Purchased Quantity: %d'), pli.getPurchasedQuantity())
        }));
        $.product_details_container.setHeight(85);
    }
}

/**
 * updateProductDiscounts - add price adjustments
 *
 * @param {ProductLineItem} pli
 * @api private
 */
function updateProductDiscounts(pli) {
    if (_.isFunction(pli.getPriceAdjustments) && pli.getPriceAdjustments().length > 0) {
        var discounts = pli.getPriceAdjustments();
        for (var d = 0; d < discounts.length; ++d) {
            var discount = discounts[d];
            var label = Ti.UI.createLabel({
                textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
                left : 0,
                font : Alloy.Styles.lineItemLabelFont,
                color : Alloy.Styles.color.text.mediumdark,
                height : Titanium.UI.SIZE,
                text : discount.getItemText()
            });
            $.price_adjustments_container.add(label);
        }
        $.product_line_item_container.setHeight($.product_line_item_container.getHeight() + 10);
    } else {
        $.price_adjustments_container.hide();
        $.price_adjustments_container.setHeight(0);
    }

}

/**
 * updateMessageLabel - show a message if there is one
 *
 * @param {ProductLineItem} pli
 * @api private
 */
function updateMessageLabel(pli) {
    if (_.isFunction(pli.hasMessage) && pli.hasMessage()) {
        $.message_label.setText(pli.getMessage());
        if (hasScaleDown()) {
            $.product_line_item_container.setHeight($.product_line_item_container.getHeight() + 20);
        } else {
            $.product_line_item_container.setHeight($.product_line_item_container.getHeight() + 10);
        }
    }
}

/**
 * addPricingToProductListItem - add price and base price properties to product line items which do not have it by default
 *
 * @param {Object} product - Product
 * @param {Object} pli - Product List Item
 * @api private
 */
function addPricingToProductListItem(product, pli) {
    if (pli.get('_type') == 'customer_product_list_item') {
        if (!pli.has('price')) {
            pli.set({
                price : product.getPrice()
            }, {
                silent : true
            });
        }
        if (!pli.has('base_price')) {
            var listPrice = product.getListPrice();
            pli.set({
                base_price : ((product.getPrices() && listPrice) ? listPrice : product.getPrice())
            }, {
                silent : true
            });
        }
    }
}

/**
 * hasScaleDown -  return true if we should remove some views to render unavailable product line item row
 * @return {Boolean}
 *
 * @api private
 */
function hasScaleDown() {
    return (_.isObject($.args) && !_.isEmpty(args) && $.args.scaleDown === true);
}

/**
 * scaleDown -  adjust view sizes for unavailable product line item row
 *
 * @api private
 */
function scaleDown() {
    $.product_line_item_container.setWidth(400);
    $.product_image_container.setLeft(10);
    $.product_image_container.setHeight(115);
    $.product_image_container.setWidth(115);
    $.product_container.setWidth(260);
    $.product_details_container.setWidth('100%');
}
