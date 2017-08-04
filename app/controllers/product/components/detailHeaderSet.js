// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/detailHeaderSet.js - controller for the product set detail header
 */

exports.baseController = 'product/components/detailHeader';

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:components:detailHeaderSet', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.enableAddAllToCart = enableAddAllToCart;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(info) {
    logger.info('init override called');
    // init this without a model
    $.pricing.init();
    // so we can easily add components and listeners to
    $.product_id.init();
    if (!isKioskMode() || (isKioskMode() && isKioskCartEnabled())) {
        // Can't use classes b/c of Bug: AC-637, once fixed we should use 'primary_button' class
        $.add_all_to_cart_btn = Ti.UI.createButton({
            left : 320,
            enabled : false,
            titleid : '_Add_All_to_Cart',
            accessibilityLabel : 'add_to_cart_btn',
            textAlign : Ti.UI.TEXT_ALIGNMENT_CENTER,
            color : Alloy.Styles.buttons.primary.color,
            disabledColor : Alloy.Styles.buttons.primary.disabledColor,
            backgroundImage : Alloy.Styles.buttons.primary.backgroundImage,
            backgroundDisabledImage : Alloy.Styles.buttons.primary.backgroundDisabledImage,
            height : 35,
            width : 200,
            top : 10
        });
        $.pricing_container.add($.add_all_to_cart_btn);
        $.add_all_to_cart_btn.addEventListener('singletap', onAddAllToCart);
        $.pricing_container.addEventListener('singletap', onPricingTap);
    }
    // Can't use classes b/c of Bug: AC-637, once fixed we should use 'horizontal_separator' class
    var horizontal_separator = Ti.UI.createView({
        width : Ti.UI.FILL,
        backgroundColor : Alloy.Styles.color.background.dark,
        height : 1,
        left : 0,
        top : 10
    });
    $.pdp_header.add(horizontal_separator);
    $.render();
}

/**
 * DEINIT
 *
 * @api public
 */
var superDeinit = $.deinit;
function deinit() {
    logger.info('deinit override called');
    $.stopListening();
    superDeinit();
    $.add_all_to_cart_btn && $.add_all_to_cart_btn.removeEventListener('singletap', onAddAllToCart);
    $.pricing_container.removeEventListener('singletap', onPricingTap);
    removeAllChildren($.pricing_container);
    removeAllChildren($.pdp_header);
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * enableAddAllToCart - Enables the add all to cart button in the header
 *
 * @param {Object} enabled
 * @api public
 */
function enableAddAllToCart(enabled) {
    logger.info('enableAddAllToCart called');
    if (!isKioskMode() || (isKioskMode() && isKioskCartEnabled())) {
        $.add_all_to_cart_btn.setEnabled(enabled);
        $.add_all_to_cart_btn.setTouchEnabled(enabled);
    }
}

//----------------------------------------------
// ## UI EVENT LISTENER FUNCTIONS

/**
 * onAddAllToCart - Triggered when add all to cart button is tapped
 *
 * @api private
 */
function onAddAllToCart() {
    logger.info('onAddAllToCart called');
    $.trigger('detailHeaderSet:add_all_to_cart_btn_tap');
}

/**
 * onPricingTap - Triggered when priciging section is tapped (over the add all to cart button)
 * Should check for variations being selected or not
 *
 * @api private
 */
function onPricingTap() {
    logger.info('onPricingTap called');
    if ($.add_all_to_cart_btn && (!$.add_all_to_cart_btn.getTouchEnabled() || !$.add_all_to_cart_btn.getEnabled())) {
        $.trigger('detailHeaderSet:check_all_variations');
    }
}
