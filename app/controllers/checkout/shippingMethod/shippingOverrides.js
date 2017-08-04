// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/shippingMethod/shippingOverrides.js - Controller for shipping price overrides
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var currentAssociate = Alloy.Models.associate;
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var price_override_type = 'none';
var price_override_value = null;
var selectedShippingMethod = null;
var selectedShippingOverride = null;
var overrideReason = null;

var doingManagerAuthorization = false;
var associatePermissions = null;
var isRemovingOverride = false;

var isValid = false;

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.cancel_button.addEventListener('click', onCancelClick);

$.apply_button.addEventListener('click', onApplyClick);

$.listenTo($.overrides, 'enableApply', onEnableApply);

// manager successfully logged in, so record the manager permissions. These are the permissions
// that will be used for the override
$.listenTo($.overrides, 'managerLoggedIn', onManagerLoggedIn);

// the type of override being applied needs manager authorization, so set up the UI for that
$.listenTo($.overrides, 'needManagerAuthorization', onNeedsManagerAuthorization);

//----------------------------------------------
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
    selectedShippingOverride = args.selectedOverride;
    selectedShippingMethod = args.selectedMethod;
    // if there's a manager override, it needs to first be removed
    if (selectedShippingOverride && selectedShippingOverride.manager_employee_id) {
        isRemovingOverride = true;
        $.manager_override_already_exists.show();
        $.show_overrides.hide();
        $.apply_button.setTitle(_L('Remove'));
        isRemovingOverride = true;
        $.apply_button.setEnabled(true);
        deferred.resolve();
    } else {
        // no manager override, so show the regular override UI
        $.manager_override_already_exists.hide();
        $.show_overrides.show();
        isRemovingOverride = false;
        initOverrides(deferred);
    }
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api private
 */
function deinit() {
    $.overrides.deinit();
    $.cancel_button.removeEventListener('click', onCancelClick);
    $.apply_button.removeEventListener('click', onApplyClick);
    $.stopListening($.overrides, 'enableApply', onEnableApply);
    $.stopListening($.overrides, 'managerLoggedIn', onManagerLoggedIn);
    $.stopListening($.overrides, 'needManagerAuthorization', onNeedsManagerAuthorization);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * initOverrides - initialize the overrides
 *
 * @param {Deferred} deferred
 * @api private
 */
function initOverrides(deferred) {
    var assoc = currentAssociate;
    if (isKioskManagerLoggedIn()) {
        assoc = Alloy.Kiosk.manager;
    }

    var permissions = {
        allowByAmount : assoc.getPermissions().allowShippingOverrideByAmount,
        allowByPercent : assoc.getPermissions().allowShippingOverrideByPercent,
        allowFixed : assoc.getPermissions().allowShippingOverrideFixed
    };

    $.overrides.init({
        basePrice : selectedShippingMethod.getBasePrice(),
        surcharge : selectedShippingMethod.getSurcharge(),
        permissions : permissions,
        maxPercentOff : assoc.getPermissions().shippingPriceOverrideMaxPercent,
        selectedOverride : selectedShippingOverride,
        adjustmentReasons : Alloy.CFG.shipping_override_reasons
    });
    if (deferred) {
        deferred.resolve();
    }
}

/**
 * dismiss - dismiss the dialog
 *
 * @api private
 */
function dismiss() {
    $.trigger('shippingOverride:dismiss');
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCancelClick - user has tapped on the cancel button
 *
 * @api private
 */
function onCancelClick() {
    $.overrides.hideDropdown();
    // if we're in the mode of doing manager authorization
    if (doingManagerAuthorization) {
        // associate can't do any override, so dismiss the dialog
        if (associatePermissions && associatePermissions.permissions === 'none') {
            dismiss();
        }
        // otherwise cancel the request to do a manager override and let the associate apply an override
        $.shipping_overrides_label.setText(_L('Shipping Overrides'));
        $.overrides.cancelOverride();
        doingManagerAuthorization = false;
    } else {
        // dismiss the dialog
        dismiss();
    }
}

/**
 * onApplyClick - user has tapped on apply button
 *
 * @api private
 */
function onApplyClick() {
    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    $.overrides.hideDropdown();
    // if in the middle of removing an override, remove it
    if (isRemovingOverride) {
        currentBasket.setShippingPriceOverride({
            shipping_method_id : selectedShippingMethod.id,
            price_override_type : 'none',
            employee_id : Alloy.Models.associate.getEmployeeId(),
            employee_passcode : Alloy.Models.associate.getPasscode(),
            store_id : Alloy.CFG.store_id
        }, {
            c_employee_id : Alloy.Models.associate.getEmployeeId()
        }).done(function() {
            selectedShippingOverride = {
                price_override_type : 'none'
            };
            initOverrides();
            $.manager_override_already_exists.hide();
            $.show_overrides.show();
            isRemovingOverride = false;
            $.apply_button.setTitle(_L('Apply'));
        }).always(function() {
            deferred.resolve();
        });
    } else if (doingManagerAuthorization) {
        // do the manager authorization if necessary
        $.overrides.doManagerAuthorization().always(function() {
            deferred.resolve();
        });
    } else {
        // otherwise, apply the override if there is one to apply
        var override = $.overrides.getOverride();
        if (override) {
            override.shipping_method_id = selectedShippingMethod.id;
            override.employee_id = Alloy.Models.associate.getEmployeeId();
            override.employee_passcode = Alloy.Models.associate.getPasscode();
            override.store_id = Alloy.CFG.store_id;
            if (!override.manager_employee_id && isKioskManagerLoggedIn()) {
                override.manager_employee_id = getKioskManager().getEmployeeId();
                override.manager_employee_passcode = getKioskManager().getPasscode();
                override.manager_allowLOBO = getKioskManager().getPermissions().allowLOBO;
            }
            override.kiosk_mode = isKioskMode();
            currentBasket.setShippingPriceOverride(override, {
                c_employee_id : Alloy.Models.associate.getEmployeeId()
            }).done(function() {
                dismiss();
            }).fail(function() {
                notify(_L('Unable to apply a shipping price override'), {
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
 * onEnableApply - trigger from the overrides view to enable the apply button
 *
 * @api private
 */
function onEnableApply(enable) {
    if (!isRemovingOverride) {
        $.apply_button.setEnabled(enable.valid);
    }
}

/**
 * onManagerLoggedIn - manager successfully logged in, so record the manager permissions. These are the permissions
 * that will be used for the override
 *
 * @param {Object} manager
 * @api private
 */
function onManagerLoggedIn(manager) {
    var permissions = {
        allowByAmount : manager.getPermissions().allowShippingOverrideByAmount,
        allowByPercent : manager.getPermissions().allowShippingOverrideByPercent,
        allowFixed : manager.getPermissions().allowShippingOverrideFixed,
        maxPercentOff : manager.getPermissions().shippingPriceOverrideMaxPercent,
    };
    doingManagerAuthorization = false;
    $.overrides.resetPermissions(permissions);
    $.shipping_overrides_label.setText(_L('Shipping Overrides'));
}

/**
 * onNeedsManagerAuthorization - the type of override being applied needs manager authorization, so set up the UI for that
 *
 * @param {Object} permissions
 * @api private
 */
function onNeedsManagerAuthorization(permissions) {
    $.shipping_overrides_label.setText(_L('Manager Authorization'));
    doingManagerAuthorization = true;
    associatePermissions = permissions;
    $.apply_button.setEnabled(true);
}
