// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/productPriceAdjustments.js - Controller for product price overrides
 */

//----------------------------------------------
// ## VARIABLES

var currentAssociate = Alloy.Models.associate;
var currentBasket = Alloy.Models.basket;
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var toCurrency = require('EAUtils').toCurrency;
var doingManagerAuthorization = false;
var associatePermissions = null;
var isRemovingOverride = false;
var selectedOverride = null;
var index = null;
var pli = null;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.apply_button.addEventListener('click', onApplyClick);

$.cancel_button.addEventListener('click', onCancelClick);

$.listenTo($.overrides, 'enableApply', onEnableApply);

// the manager logged in, so use those permissions for the override
$.listenTo($.overrides, 'managerLoggedIn', onManagerLoggedIn);

// need to do a manager authorization, so set up the UI for that
$.listenTo($.overrides, 'needManagerAuthorization', onNeedManagerAuthorization);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args
 * @return {Deferred} promise
 * @api public
 */
function init(args) {
    var deferred = new _.Deferred();
    pli = args.pli;
    index = args.index;
    $.show_overrides.hide();
    // if there's a manager override, need to remove it
    if (pli && pli.price_override === 'true' && pli.manager_employee_id) {
        $.manager_override_already_exists.show();
        $.apply_button.setTitle(_L('Remove'));
        isRemovingOverride = true;
        $.apply_button.setEnabled(true);
        deferred.resolve();
    } else {
        // just show the regular override controls
        $.manager_override_already_exists.hide();
        isRemovingOverride = false;
        resetToApplyButton();
        initOverrides(deferred);
    }
    // show the product
    if (pli) {
        $.product_name_label.setText(pli.product_name);
        $.original_price_label.setText(toCurrency(pli.base_price));
        Alloy.Globals.getImageViewImage($.product_image, pli.image);
    }
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.apply_button.removeEventListener('click', onApplyClick);
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.stopListening($.overrides, 'enableApply', onEnableApply);
    $.stopListening($.overrides, 'managerLoggedIn', onManagerLoggedIn);
    $.stopListening($.overrides, 'needManagerAuthorization', onNeedManagerAuthorization);
    $.overrides.deinit();
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * initOverrides - initialize the overrides
 *
 * @param {Deferred} deferred to resolve when complete
 * @api private
 */
function initOverrides(deferred) {
    var assoc = currentAssociate;
    if (isKioskManagerLoggedIn()) {
        assoc = Alloy.Kiosk.manager;
    }

    var permissions = {
        allowByAmount : assoc.getPermissions().allowItemPriceOverrideByAmount,
        allowByPercent : assoc.getPermissions().allowItemPriceOverrideByPercent,
        allowFixed : assoc.getPermissions().allowItemPriceOverrideFixedPrice
    };

    var selectedOverride = {
        product_id : pli.product_id,
        price_override_type : 'none',
        price_override_value : 0,
        price_override_reason_code : null
    };
    if (pli && pli.price_override === 'true') {
        selectedOverride = {
            price_override_type : pli.price_override_type,
            price_override_value : pli.price_override_value,
            price_override_reason_code : pli.price_override_reason_code,
            manager_employee_id : pli.manager_employee_id
        };
    }

    // initialize the common overrides controller
    $.overrides.init({
        basePrice : pli.base_price,
        permissions : permissions,
        maxPercentOff : assoc.getPermissions().itemPriceOverrideMaxPercent,
        selectedOverride : selectedOverride,
        adjustmentReasons : Alloy.CFG.product_override_reasons,
        leftJustifyManager : true
    });
    $.show_overrides.show();
    if (deferred) {
        deferred.resolve();
    }
}

/**
 * resetToApplyButton - reset to default apply button
 *
 * @api private
 */
function resetToApplyButton() {
    $.apply_button.setTitle(_L('Apply'));
    $.apply_button.setBackgroundImage(Alloy.Styles.primaryButtonImage);
    $.apply_button.setColor(Alloy.Styles.color.text.white);
}

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('productOverride:dismiss');
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onApplyClick happens when the apply button is clicked on the dialog
 *
 * @api private
 */
function onApplyClick() {
    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    $.overrides.hideDropdown();
    // remove the override
    if (isRemovingOverride) {
        if (pli.manager_employee_id) {
            var overrideToSet = {
                lineItem_id : pli.item_id,
                product_id : pli.product_id,
                price_override_type : 'none',
                index : index,
                kiosk_mode : isKioskMode()
            };
            currentBasket.setProductPriceOverride(overrideToSet, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }).done(function() {
                var plis = currentBasket.getProductItems();
                if (plis.length > 0) {
                    pli = plis[index].attributes;
                    initOverrides();
                    $.manager_override_already_exists.hide();
                    isRemovingOverride = false;
                    resetToApplyButton();
                }
            }).fail(function() {
                notify(_L('Unable to remove product price override'), {
                    preventAutoClose : true
                });
            }).always(function() {
                deferred.resolve();
            });
        } else {
            dismiss();
            deferred.resolve();
        }
    } else if (doingManagerAuthorization) {
        // do the manager authorization
        $.overrides.doManagerAuthorization().always(function() {
            deferred.resolve();
        });
    } else {
        // apply the override
        var override = $.overrides.getOverride();
        if (override) {
            var overrideToSet = {
                lineItem_id : pli.item_id,
                product_id : pli.product_id,
                price_override_value : override.price_override_value,
                price_override_type : override.price_override_type,
                price_override_reason_code : override.price_override_reason_code,
                index : index,
                kiosk_mode : isKioskMode(),
                employee_id : Alloy.Models.associate.getEmployeeId(),
                employee_passcode : Alloy.Models.associate.getPasscode(),
                store_id : Alloy.CFG.store_id
            };

            // if the kiosk manager is logged in or the manager is logged in (not in kiosk mode),
            // add the manager_employee_id, manager_employee_password, kiosk_mode, and manager_allowLOBO
            // properties to the override object. This data is needed on the server to apply the override.
            if (override.manager_employee_id) {
                overrideToSet.manager_employee_id = override.manager_employee_id;
                overrideToSet.manager_employee_passcode = override.manager_employee_passcode;
                overrideToSet.manager_allowLOBO = override.manager_allowLOBO;
            } else if (isKioskManagerLoggedIn()) {
                overrideToSet.manager_employee_id = getKioskManager().getEmployeeId();
                overrideToSet.manager_employee_passcode = getKioskManager().getPasscode();
                overrideToSet.manager_allowLOBO = getKioskManager().getPermissions().allowLOBO;
            }
            currentBasket.setProductPriceOverride(overrideToSet, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }).done(function(model, params, options) {
                dismiss();
            }).fail(function() {
                notify(_L('Unable to apply a product price override'), {
                    preventAutoClose : true
                });
            }).always(function() {
                deferred.resolve();
            });
        } else {
            dismiss();
            deferred.resolve();
        }
    }
}

/**
 * onCancelClick - when the cancel button is clicked on the dialog
 *
 * @api private
 */
function onCancelClick() {
    $.overrides.hideDropdown();
    if (doingManagerAuthorization) {
        // if the associate cannot do any overrides, dismiss the dialog
        if (associatePermissions && associatePermissions.permissions === 'none') {
            dismiss();
        }
        $.product_overrides_label.setText(_L('Price Overrides'));
        // cancel the request for a manager override
        $.overrides.cancelOverride();
        doingManagerAuthorization = false;
    } else {
        dismiss();
    }
}

/**
 * onEnableApply - triggered when we need to enable the apply button
 *
 * @param {Object} enable if it should be enabled or not
 * @api private
 */
function onEnableApply(enable) {
    if (!isRemovingOverride) {
        $.apply_button.setEnabled(enable.valid);
    }
}

/**
 * onManagerLoggedIn - triggered when manager is logged in and need to check those permissions
 *
 * @param {Object} manager new manager that logged in
 * @api private
 */
function onManagerLoggedIn(manager) {
    var permissions = {
        allowByAmount : manager.getPermissions().allowItemPriceOverrideByAmount,
        allowByPercent : manager.getPermissions().allowItemPriceOverrideByPercent,
        allowFixed : manager.getPermissions().allowItemPriceOverrideFixedPrice,
        maxPercentOff : manager.getPermissions().itemPriceOverrideMaxPercent,
    };
    doingManagerAuthorization = false;
    $.overrides.resetPermissions(permissions);
    $.product_overrides_label.setText(_L('Price Overrides'));
}

/**
 * onNeedManagerAuthorization is trigged when the manager authorization is needed
 *
 * @param {Object} permissions for the associate
 * @api private
 */
function onNeedManagerAuthorization(permissions) {
    $.product_overrides_label.setText(_L('Manager Authorization'));
    doingManagerAuthorization = true;
    associatePermissions = permissions;
    $.apply_button.setEnabled(true);
}
