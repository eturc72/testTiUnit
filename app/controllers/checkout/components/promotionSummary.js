// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/components/promotionSummary.js - Controller for coupons
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;

var logger = require('logging')('checkout:components:promotionSummary', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', onHideAuxViews);

$.listenTo(Alloy.eventDispatcher, 'order_just_created', initCouponLineItems);

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.coupon.addEventListener('return', handleApplyCoupon);
$.coupon_apply_button.addEventListener('click', handleApplyCoupon);
$.coupon_table.addEventListener('click', handleDeleteCoupon);

//---------------------------------------------------
// ## MODEL LISTENERS

// update the coupons when the basket is sync'd or the coupon items change
$.listenTo(currentBasket, 'sync change:coupon_items', initCouponLineItems);

$.listenTo(currentBasket, 'change:checkout_status', onCheckoutStatusChange);

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
    logger.info('DEINIT called');
    $.coupon.removeEventListener('return', handleApplyCoupon);
    $.coupon_apply_button.removeEventListener('click', handleApplyCoupon);
    $.coupon_table.removeEventListener('click', handleDeleteCoupon);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * initCouponLineItems - initialize the coupons
 *
 * @api private
 */
function initCouponLineItems() {
    var coupon_items = currentBasket.getCouponItems() || {};
    var clis = coupon_items;

    // update the display depending on whether there are coupons or not
    if (clis && clis.length > 0) {
        $.activeCoupons.reset(clis);
        $.instruction_view.hide();
        $.instruction_view.setHeight(0);
        $.coupon_table.show();
        $.coupon_table.setHeight(340);
    } else {
        $.activeCoupons.reset([]);
        $.instruction_view.show();
        $.instruction_view.setHeight('auto');
        $.coupon_table.setHeight('0');
        $.coupon_table.hide();
    }

}

/**
 * transformCoupons - return displayable values for the coupon
 *
 * @api private
 */
function transformCoupons(model) {
    logger.info('transformCoupons');
    var description = currentBasket.getCouponDescription(model.getCode());
    return {
        title : 'Coupon',
        coupon_code : model.getCode(),
        description : description ? description : ''
    };
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleApplyCoupon - apply the coupon
 *
 * @api private
 */
function handleApplyCoupon() {
    var couponCode = $.coupon.value;
    if (couponCode != '') {
        $.coupon.blur();
        if (currentBasket.hasCoupon(couponCode)) {
            notify(String.format(_L('Coupon \'%s\' is already in your cart.'), couponCode));
        } else {
            // put the coupon onto the basket. The listenTo('sync change:coupon_items') above will cause initCouponLineItems to be called on success of currentBasket.addCoupon()
            var promise = currentBasket.addCoupon(couponCode);
            Alloy.Router.showActivityIndicator(promise);
            promise.fail(function(model) {
                var message;
                var faultType = model.getFaultType();
                if (faultType === 'InvalidCouponItemException' || faultType === 'InvalidCouponCodeException') {
                    message = String.format(_L('Coupon \'%s\' is invalid.'), couponCode);
                } else {
                    message = model.getFaultMessage();
                    if (!message) {
                        message = String.format(_L('Coupon \'%s\' could not be applied.'), couponCode);
                    }
                }
                notify(String.format(message, couponCode), {
                    preventAutoClose : true
                });
            });
        }
        $.coupon.setValue('');
    }
}

/**
 * handleDeleteCoupon - delete the coupon
 *
 * @api private
 */
function handleDeleteCoupon(event) {
    if (event.source.id === 'delete_coupon_button') {
        $.coupon.blur();
        var coupon = $.activeCoupons.at(event.index);
        var coupon_code = coupon.getCode();
        Alloy.Dialog.showConfirmationDialog({
            messageString : String.format(_L('Do you really want to delete this coupon?'), coupon_code),
            titleString : _L('Delete Coupon'),
            okButtonString : _L('Delete'),
            okFunction : function() {
                logger.info('removing coupon ' + coupon_code);
                var promise = currentBasket.removeCoupon(coupon_code);
                Alloy.Router.showActivityIndicator(promise);
                promise.done(function() {
                    $.coupon_table.removeAllChildren();
                    initCouponLineItems();
                }).fail(function() {
                    notify(_L('Could not remove coupon.'), {
                        preventAutoClose : true
                    });
                });
            }
        });
    }
}

/**
 * onHideAuxViews - called to hide auxillary views and need to remove the keyboard
 *
 * @api private
 */
function onHideAuxViews() {
    $.coupon.blur();
}

//---------------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * onCheckoutStatusChange - checkout status has changed
 *
 * @api private
 */
function onCheckoutStatusChange() {
    if (currentBasket.getCheckoutStatus() == 'cart') {
        this.getView().show();
        this.getView().setHeight('auto');
    } else {
        this.getView().hide();
        this.getView().setHeight(0);
    }
}
