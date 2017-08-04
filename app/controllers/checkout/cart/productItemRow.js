// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/productItemRow.js - A row in the product items in the cart
 */

//----------------------------------------------
// ## VARIABLES

var productOverridesAllowed = Alloy.CFG.overrides.product_price_overrides;
var logger = require('logging')('checkout:cart:productItemRow', getFullControllerPath($.__controllerPath));

// Localization constant
var buttonTextLength = 18;

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(Alloy.Models.customer, 'change:login', adjustButtons);

//----------------------------------------------
// ## PUBLIC API

/**
 * update the display of the row
 * @param {Product} product
 * @param {ProductLineItem} pli
 * @param {Boolean} showDivider
 * @param {Boolean} hideButtons
 * @param {Object} order
 *
 * @api public
 */
$.productItemRowTable.update = function(product, pli, showDivider, hideButtons, order) {
    logger.info('update called');
    $.product_item.init(product, pli, pli.currencyCode, order ? order.getCountry() : '');
    if (!showDivider) {
        $.product_line_item_container.setBackgroundImage(null);
    }
    if (hideButtons) {
        $.button_container.hide();
    }
};

/**
 * showOverrideButton - determine whether to show the override button
 */
$.productItemRowTable.showOverrideButton = function() {
    if ($.override_button) {
        if (!isKioskMode() || isKioskManagerLoggedIn()) {
            $.override_button.show();
        } else {
            $.override_button.hide();
        }
    }
};

/**
 * DEINIT - deinit the row
 *
 * @api public
 */
$.productItemRowTable.deinit = function() {
    logger.info('DEINIT called');
    $.product_item.deinit();
    // removes listener for listenTo event
    $.stopListening();
    $.destroy();
};

//---------------------------------------------------
// ## FUNCTIONS

/**
 * adjustButtons - adjust the buttons that are visible
 *
 * @api private
 */
function adjustButtons() {
    if (!Alloy.Models.customer.isLoggedIn()) {
        // remove more_menu_button button if customer NOT logged in
        $.more_menu_button.hide();
        $.more_menu_button.setHeight(0);
        if (productOverridesAllowed && !isKioskMode()) {
            $.override_button.show();
            $.override_button.setHeight(28);
            $.button_container.show($.more_menu_button);
        }
    } else {
        // remove override_button button if customer logged in since it will be in the more menu
        $.override_button.hide();
        $.override_button.setHeight(0);
        $.more_menu_button.setHeight(28);
        $.more_menu_button.show();
    }
}

//----------------------------------------------
// ## CONSTRUCTOR

if (isKioskMode() && productOverridesAllowed) {
    $.listenTo(Alloy.eventDispatcher, 'kiosk:manager_login_change', function() {
        isKioskManagerLoggedIn() ? $.override_button.show() : $.override_button.hide();
    });
}

if ($model.getPriceOverride() === 'true' || productOverridesAllowed) {
    $.override_button.show();
} else {
    $.override_button.hide();
    $.override_button.setWidth(0);
    $.override_button.setHeight(0);
}

if (productOverridesAllowed) {
    (!isKioskMode() || isKioskManagerLoggedIn()) ? $.override_button.show() : $.override_button.hide();
}

adjustButtons();

if ($.override_button && $.override_button.getTitle().length > buttonTextLength) {
    $.override_button.setFont(Alloy.Styles.detailInfoBoldFont);
}
