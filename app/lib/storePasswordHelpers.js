// ©2017 salesforce.com, inc. All rights reserved.
/**
 * lib/storePasswordHelpers.js - a collection of functions related to store password expiration
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('utils:showPasswordHelpers', 'app/lib/showPasswordHelpers');
var showActivityIndicator = require('dialogUtils').showActivityIndicator;

//---------------------------------------------------
// ## PUBLIC API

exports.checkStorePassword = checkStorePassword;
exports.checkStorePasswordWarning = checkStorePasswordWarning;
exports.isStorePasswordExpiring = isStorePasswordExpiring;
exports.showChangeStorePassword = showChangeStorePassword;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * checkStorePassword - checks the store password expiration
 *
 * @param {Boolean} fetch - (optional) forces the fetch to be triggered regardless of store_password_days_to_expire config
 * @return {Deferred} promise
 * @api public
 */
function checkStorePassword(fetch) {
    logger.info('checkStorePassword called');
    var deferred = new _.Deferred();
    fetch = fetch || false;
    if ((Alloy.CFG.store_password_days_to_expire && Alloy.CFG.store_password_days_to_expire > 0) || fetch) {
        Alloy.Models.storeUser = Alloy.Models.storeUser || Alloy.createModel('users');
        var promise = Alloy.Models.storeUser.fetchExpiration();
        if (Alloy.Router) {
            Alloy.Router.showActivityIndicator(promise);
        } else {
            showActivityIndicator(promise);
        }
        promise.done(function() {
            deferred.resolve();
        }).fail(function(error) {
            deferred.reject();
            notify( error ? error.message : _L('Unable to obtain store password expiration.'), {
                preventAutoClose : true
            });
        });
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * checkStorePasswordWarning - checks the store password expiration and displays notification
 *
 * @param isManager - if the associate is a manager or not
 * @return {Deferred} promise
 * @api public
 */
function checkStorePasswordWarning(isManager) {
    var deferred = new _.Deferred();
    checkStorePassword().done(function() {
        if (isStorePasswordExpiring()) {
            var expiration = Alloy.Models.storeUser.getExpirationDays();
            var formattedString = String.format(_L('The store password will expire in %d days. A Store Manager must change the password before it expires.'), expiration);
            Alloy.Dialog.showConfirmationDialog({
                messageString : formattedString,
                icon : Alloy.Styles.warningIcon,
                titleString : _L('Warning'),
                okButtonString : _L('Change'),
                cancelButtonString : _L('Dismiss'),
                cancelFunction : function() {
                    deferred.resolve();
                },
                okFunction : function() {
                    showChangeStorePassword({
                        isManager : isManager
                    }).always(function() {
                        deferred.resolve();
                    });
                }
            });
        } else {
            deferred.resolve();
        }
    }).fail(function() {
        // failure message is handled in checkStorePassword
        deferred.reject();
    });
    return deferred;
}

/**
 * isStorePasswordExpiring - has the store password expired, this must be called
 * after checkStorePassword* as this call does not fetch
 *
 * @return expiring - if password is expiring or not
 * @api public
 */
function isStorePasswordExpiring() {
    if (Alloy.CFG.store_password_days_to_expire && Alloy.CFG.store_password_days_to_expire > 0) {
        if (!Alloy.Models.storeUser) {
            logger.error('Alloy.Models.storeUser model hasn\'t been created yet, call checkStorePassword first');
            return false;
        }
        if (Alloy.CFG.store_password_days_to_expire >= Alloy.Models.storeUser.getExpirationDays()) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

/**
 * showChangeStorePassword - show change store password dialog
 *
 * @param {Object} options
 * @return {Deferred} promise
 * @api public
 */
function showChangeStorePassword(options) {
    logger.info('showChangeStorePassword');
    var deferred = new _.Deferred();
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'associate/storePassword',
        options : options,
        continueEvent : 'storePassword:dismiss',
        cancelFunction : function() {
            deferred.resolve();
        },
        continueFunction : function() {
            deferred.resolve();
        }
    });

    return deferred.promise();
}
