// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/cart/productPriceOverrides.js - Common controller for product and shipping overrides
 */

//----------------------------------------------
// ## VARIABLES

var currentBasket = Alloy.Models.basket;
var currentAssociate = Alloy.Models.associate;

var price_override_type = 'none';
var price_override_value = null;
var toCurrency = require('EAUtils').toCurrency;
var EAUtils = require('EAUtils');

var overrideReason = null;

var isValid = false;
var authorizedManager = null;
var selectedOverride = null;
var basePrice;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// when the amount changes, calculate the final override price
$.amount_off_text.addEventListener('change', onAmountOffChange);

$.amount_off_text.addEventListener('focus', onAmountOffFocus);

// when the type of override changes, calculate the final override price
$.listenTo($.override_types, 'overridetype', onOverrideType);

// prepare to do a manager override
$.manager_authorization_label.addEventListener('click', onManagerClick);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.resetPermissions = resetPermissions;
exports.doManagerAuthorization = doManagerAuthorization;
exports.cancelOverride = cancelOverride;
exports.hideDropdown = hideDropdown;
exports.getOverride = getOverride;
exports.doManagerAuthorization = doManagerAuthorization;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(config) {
    authorizedManager = null;

    if (config.permissions) {
        // if associate doesn't have any permissions to do overrides, a manager authoriziation is required
        if (!config.permissions.alloyByAmount && !config.permissions.allowByPercent && !config.permissions.allowFixed) {
            setupManagerOverrides();
            $.trigger('needManagerAuthorization', {
                permissions : 'none'
            });
        }
        // hide the override types if the permission don't contain that permission
        $.override_types.hideOverrideByAmount(!config.permissions.allowByAmount);

        $.override_types.hideOverrideByPercent(!config.permissions.allowByPercent);

        $.override_types.hideOverrideFixedPrice(!config.permissions.allowFixed);
    }

    maxPercent = config.maxPercentOff - 0;
    basePrice = config.basePrice;
    $.new_price_calculated.setText(toCurrency(basePrice));

    // if an override was passed in, use it, otherwise set to no override
    if (config.selectedOverride) {
        selectPreviousOverride(config.selectedOverride);
        selectedOverride = config.selectedOverride;
    } else {
        selectPreviousOverride({
            price_override_type : 'none',
            price_override_value : 0,
            price_override_reason_code : null
        });
    }

    // set up the adjustment reasons
    initializeAdjustmentReasonPicker(config.adjustmentReasons, config.selectedOverride);

    // if the logged in associate can do manager overrides, don't need to show the manager override link
    if (currentAssociate.getPermissions().allowManagerOverrides || (isKioskManagerLoggedIn() && getKioskManager().canDoManagerOverrides())) {
        $.get_manager_authorization_container.hide();
    } else {
        $.get_manager_authorization_container.show();
        $.get_manager_authorization_container.setHeight(Ti.UI.SIZE);
        $.has_manager_approval_container.hide();
        $.has_manager_approval_container.setHeight(0);
        $.toolbar = Alloy.createController('components/nextPreviousToolbar');
        $.toolbar.setTextFields([$.manager_id, $.manager_password]);
    }

    if (config.leftJustifyManager) {
        $.enter_manager_authorization.setLeft(0);
    }

    // the price may have a surcharge, so display that if necessary
    if (config.surcharge) {
        $.surcharge.show();
        $.surcharge_price.setText(toCurrency(config.surcharge - 0));
    } else {
        $.surcharge.hide();
    }
    clearErrorMessage();
    enableApplyButton();
    if (EAUtils.isSymbolBasedLanguage()) {
        $.new_price_calculated.setFont(Alloy.Styles.headlineFont);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.override_types.deinit();
    if ($.toolbar) {
        $.toolbar.deinit();
    }
    $.amount_off_text.removeEventListener('change', onAmountOffChange);
    $.amount_off_text.removeEventListener('focus', onAmountOffFocus);
    $.manager_authorization_label.removeEventListener('click', onManagerClick);
    if ($.override_select_list) {
        removeAllChildren($.adjustment_reason_container);
        $.override_select_list.deinit();
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * resetPermission - update the permissions to use
 *
 * @param {Permissions} permissions
 * @api public
 */
function resetPermissions(permissions) {
    $.override_types.hideOverrideByAmount(!permissions.allowByAmount);
    $.override_types.hideOverrideByPercent(!permissions.allowByPercent);
    $.override_types.hideOverrideFixedPrice(!permissions.allowFixed);

    maxPercent = permissions.maxPercentOff;
    calculateOverride(price_override_type);
}

/**
 * doManagerAuthorization - do the manager authorization
 *
 * @return {Deferred} promise
 * @api public
 */
function doManagerAuthorization() {
    var deferred = new _.Deferred();
    $.manager_password.blur();
    $.manager_id.blur();
    var employee_id = $.manager_id.getValue();
    var passcode = $.manager_password.getValue();
    if (!employee_id || !passcode) {
        $.manager_error.setText(_L('You must provide manager code and pin.'));
        $.manager_error.show();
        deferred.resolve();
        return deferred.promise();
    }
    // get the permissions for the manager
    var manager = Alloy.createModel('associate');
    manager.fetchPermissions({
        employee_id : employee_id,
        passcode : passcode
    }).done(function(model) {
        // check if manager can do overrides
        if (manager.canDoManagerOverrides()) {
            $.trigger('managerLoggedIn', manager);
            $.enter_manager_authorization.hide();
            $.overrides_container.show();
            $.get_manager_authorization_container.hide();
            $.get_manager_authorization_container.setHeight(0);
            $.has_manager_approval_container.show();
            $.has_manager_approval_container.setHeight(Ti.UI.SIZE);
            $.manager_name_label.setText(manager.getFirstName() + ' ' + manager.getLastName());
            authorizedManager = manager;
            if (selectedOverride) {
                selectedOverride.manager_employee_id = authorizedManager.getEmployeeId();
                selectedOverride.manager_employee_passcode = authorizedManager.getPasscode();
                selectedOverride.manager_allowLOBO = authorizedManager.getPermissions().allowLOBO;
            }
        } else {
            $.manager_error.setText(_L('This manager is not allowed to do overrides'));
            $.manager_error.show();
        }
    }).fail(function(model) {
        if (model.get('httpStatus') != 200 && model.get('fault')) {
            $.manager_error.setText(model.get('fault').message);
        } else {
            $.manager_error.setText(_L('Error logging in manager'));
        }
        $.manager_error.show();
        $.manager_password.setValue('');
    }).always(function() {
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * cancelOverride - cancel the manager override
 *
 * @api public
 */
function cancelOverride() {
    $.enter_manager_authorization.hide();
    $.overrides_container.show();
    $.get_manager_authorization_container.show();
    $.get_manager_authorization_container.setHeight(Ti.UI.SIZE);
    $.has_manager_approval_container.hide();
    $.has_manager_approval_container.setHeight(0);
    enableApplyButton();
}

/**
 * getOverride - get the selected override
 *
 * @api public
 */
function getOverride() {
    return selectedOverride;
}

/**
 * hideDropdown - hide the adjustment reason dropdown
 *
 * @api public
 */
function hideDropdown() {
    $.override_select_list && $.override_select_list.dismiss();
}

/**
 * initializeAdjustmentReasonPicker - initialize the reasons for an override
 *
 *  @param {Collection} adjustmentReasons
 * @param {Override} selectedOverride
 * @api private
 */
function initializeAdjustmentReasonPicker(adjustmentReasons, selectedOverride) {
    var options = [];

    $.override_select_list = Alloy.createController('components/selectWidget', {
        values : adjustmentReasons,
        messageWhenNoSelection : _L('Adjustment Reason'),
        selectListTitleStyle : {
            accessibilityValue : 'adjustment_reason',
            width : 410,
            height : 55,
            left : 15,
            color : Alloy.Styles.color.text.black
        },
        selectListStyle : {
            width : 410,
            height : 55,
            top : 0,
            color : Alloy.Styles.color.text.black
        },
        selectedItem : selectedOverride ? selectedOverride.price_override_reason_code : null
    });
    $.override_select_list.setEnabled(selectedOverride && selectedOverride.price_override_type != 'none');
    $.adjustment_reason_container.add($.override_select_list.getView());

    $.listenTo($.override_select_list, 'itemSelected', onItemSelected);

    // close the keyboard when the drop down is selected
    $.listenTo($.override_select_list, 'dropdownSelected', onDropdownSelected);
}

/**
 * selectPreviousOverride - set up to the previous selected override
 *
 * @param {Override} selectedOverride
 * @api private
 */
function selectPreviousOverride(selectedOverride) {
    var type = selectedOverride.price_override_type;
    $.override_types.setSelection(type);
    var price = basePrice;
    switch (type) {
    case 'percent':
        $.amount_off_text.setValue((100 * selectedOverride.price_override_value).toFixed(2));
        handlePercentOff();
        $.amount_off_text.setEnabled(true);
        price = price - (price * selectedOverride.price_override_value );
        $.amount_off_label.setText(_L('Percentage Off'));
        break;
    case 'amount':
        $.amount_off_text.setValue((selectedOverride.price_override_value - 0).toFixed(2));
        handleAmountOff();
        $.amount_off_text.setEnabled(true);
        price = price - selectedOverride.price_override_value;
        $.amount_off_label.setText(_L('Amount Off'));
        break;
    case 'fixedPrice':
        handleFixedPrice();
        $.amount_off_text.setValue((selectedOverride.price_override_value - 0).toFixed(2));
        $.amount_off_text.setEnabled(true);
        price = selectedOverride.price_override_value - 0;
        $.amount_off_label.setText(_L('Price'));
        break;
    case 'none':
        $.amount_off_label.setText(' ');
        $.amount_off_text.setValue('');
        $.amount_off_text.setEnabled(false);
        $.get_manager_authorization_container.show();
        $.get_manager_authorization_container.setHeight(Ti.UI.SIZE);
        $.has_manager_approval_container.hide();
        $.has_manager_approval_container.setHeight(0);
        break;
    }
    price_override_type = type;
    price_override_value = selectedOverride.price_override_value;
    $.new_price_calculated.setText(toCurrency(price));
    setOverrideReason(selectedOverride.price_override_reason_code);
}

/**
 * setOverrideReason - set the chosen reason for the override
 *
 * @param {String} reason
 * @api private
 */
function setOverrideReason(reason) {
    overrideReason = reason;
}

/**
 * setOverride - set the selected override
 *
 * @api private
 */
function setOverride() {
    selectedOverride = {
        price_override_type : price_override_type,
        price_override_reason_code : overrideReason
    };
    if (price_override_value != undefined) {
        selectedOverride.price_override_value = price_override_value;
    }
    if (authorizedManager) {
        selectedOverride.manager_employee_id = authorizedManager.getEmployeeId();
        selectedOverride.manager_employee_passcode = authorizedManager.getPasscode();
        selectedOverride.manager_allowLOBO = authorizedManager.getPermissions().allowLOBO;
    }
    if ((price_override_type === 'amount' || price_override_type === 'percent') && price_override_value == 0) {
        selectedOverride.price_override_type = 'none';
    }
}

/**
 * calculateOverride - calculate the value of the override
 *
 * @param {String} overrideType
 * @api private
 */
function calculateOverride(overrideType) {
    var price = basePrice;
    if (overrideType === 'none') {
        price_override_type = 'none';
        $.amount_off_text.setEnabled(false);
        $.override_select_list.setEnabled(false);
        $.amount_off_label.setText(' ');
    } else {
        $.amount_off_text.setEnabled(true);
        var value;
        switch (overrideType) {
        case 'amount':
            value = handleAmountOff();
            price = price - value;
            $.amount_off_label.setText(_L('Amount Off'));
            break;
        case 'percent':
            value = handlePercentOff();
            price = price - (price * value);
            $.amount_off_label.setText(_L('Percentage Off'));
            break;
        case 'fixedPrice':
            value = handleFixedPrice();
            price = value;
            $.amount_off_label.setText(_L('Price'));
            break;
        }
        price_override_type = overrideType;
        price_override_value = value;
    }
    if (isNaN(price)) {
        $.new_price_calculated.setText('');
    } else {
        $.new_price_calculated.setText(toCurrency(price));
    }
    setOverride();
    enableApplyButton();
}

/**
 * clearErrorMessage - clear out the error message
 *
 * @api private
 */
function clearErrorMessage() {
    $.error_message_label.setVisible(false);
    $.error_message_label.setText('');
}

/**
 * handleAmountOff - deal with an amount off override
 *
 * @api private
 */
function handleAmountOff() {
    var value = $.amount_off_text.getValue().trim();
    value = value.replace(',', '.');
    var amount = value - 0;
    if (value == '') {
        amount = 0;
    }
    isValid = validateAmountOff(value);
    return amount;
}

/**
 * validateAmountOff - make sure the amount off override is valid
 *
 * @param {Double} value
 * @api private
 */
function validateAmountOff(value) {
    clearErrorMessage();
    if (isNaN(value)) {
        $.error_message_label.setVisible(true);
        $.error_message_label.setText(_L('Amount off must be a number'));
        return false;
    } else {
        if (parseInt(value) > parseInt(basePrice)) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(_L('Amount off cannot be greater than the base price'));
            return false;
        } else if (value / basePrice > maxPercent) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(String.format(_L('Percentage off cannot be greater than'), maxPercent * 100));
            return false;
        } else if (value < 0) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(_L('Please enter a number greater than 0'));
            return false;
        } else {
            return true;
        }
    }
}

/**
 * enableApplyButton - determine if the apply button should be enabled
 *
 * @api private
 */
function enableApplyButton() {
    if (price_override_type != 'none') {
        $.trigger('enableApply', {
            valid : isValid && $.amount_off_text.getValue().trim() != '' && overrideReason != null && overrideReason != 'null'
        });
    } else {
        $.trigger('enableApply', {
            valid : true
        });
    }
}

/**
 * handlePercentOff - deal with a percent off override
 *
 * @api private
 */
function handlePercentOff() {
    var value = $.amount_off_text.getValue().trim();
    value = value.replace(',', '.');
    var percent = (value - 0) / 100;
    if (value == '') {
        percent = 0;
    }
    isValid = validatePercentOff(percent);
    return percent;
}

/**
 * validatePercentOff - make sure a percent off override is valid. if not, show an error message
 *
 * @param {Double} value
 * @api private
 */
function validatePercentOff(value) {
    clearErrorMessage();
    if (isNaN(value)) {
        $.error_message_label.setVisible(true);
        $.error_message_label.setText(_L('Percentage off must be a number'));
        return false;
    } else {
        if (value > 1) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(_L('Percentage off cannot be greater than 100%'));
            return false;
        } else if (maxPercent && value > maxPercent) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(String.format(_L('Percentage off cannot be greater than'), maxPercent * 100));
            return false;
        } else if (value < 0) {
            $.error_message_label.setVisible(true);
            $.error_message_label.setText(_L('Please enter a number greater than 0'));
            return false;
        } else {
            return true;
        }
    }
}

/**
 * handleFixedPrice - deal with a fixed price override
 *
 * @api private
 */
function handleFixedPrice() {
    var value = $.amount_off_text.getValue().trim();
    value = value.replace(',', '.');
    var price = value - 0;
    if (value == '') {
        price = basePrice;
    }
    isValid = validateFixedPrice(price);
    return price;
}

/**
 * validateFixedPrice - make sure a fixed price override is valid. if not, show an error message
 *
 * @api private
 */
function validateFixedPrice(price) {
    clearErrorMessage();
    if (isNaN(price)) {
        $.error_message_label.setVisible(true);
        $.error_message_label.setText(_L('Fixed price must be a number'));
        return false;
    } else if (price < 0) {
        $.error_message_label.setVisible(true);
        $.error_message_label.setText(_L('Please enter a number greater than 0'));
        return false;
    } else {
        return true;
    }
}

/**
 * setupManagerOverride - setup the UI for manager authorization
 *
 * @api private
 */
function setupManagerOverrides() {
    $.manager_id.setValue('');
    $.manager_password.setValue('');
    $.manager_error.hide();
    $.enter_manager_authorization.show();
    $.overrides_container.hide();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onAmountOffChange - when the amount off field changes
 *
 * @api private
 */
function onAmountOffChange() {
    calculateOverride(price_override_type);
}

/**
 * onAmountOffFocus - when the amount off gains focus
 *
 * @api private
 */
function onAmountOffFocus() {
    $.override_select_list.dismiss();
}

/**
 * onOverrideType - when the override type has changed
 *
 * @param {Object} event
 * @api private
 */
function onOverrideType(event) {
    calculateOverride(event.overrideType);
    $.override_select_list.setEnabled(event.overrideType != 'none');
    $.override_select_list.dismiss();
    if (event.overrideType != 'none') {
        $.amount_off_text.focus();
    }
}

/**
 * onManagerClick - when the manager has been entered and needs validiation
 *
 * @api private
 */
function onManagerClick() {
    setupManagerOverrides();
    $.trigger('needManagerAuthorization');
}

/**
 * onItemSelected - when the override reason dropdown is selected
 *
 * @param {Object} event
 * @api private
 */
function onItemSelected(event) {
    setOverrideReason(event.item.value);
    setOverride();
    enableApplyButton();
}

/**
 * onDropdownSelected - hide the keyboard when the dropdown is selected
 *
 * @api private
 */
function onDropdownSelected() {
    $.amount_off_text.blur();
}
