// ©2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as manager
 * 2. Obtain expiration date of store BM user
 * 3. Check on number of days for expiration date
 * 4. Change BM password with password that doesn't meet requirements
 * 5. Change BM password with password that has existed before
 * 6. Change BM password with bad old password
 * 7. Change BM password with good password
 * 8. Logout customer
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var baskethelper = require('spec/baskethelper');
var helper = require('testhelper');
var storePasswordConfigs = Alloy.CFG.storePasswordConfiguration;
exports.define = function() {
    describe('Store BM User Model', function() {
        it.eventually('execute StorePassword model tests', function(done) {
            var managerId = storePasswordConfigs.managerLogin;
            var managerPasscode = storePasswordConfigs.managerPassword;
            baskethelper.loginAssociateWithCredentials(managerId, managerPasscode, false, function(manager) {
                expect(manager.isLoggedIn()).toBe(true);
                var users = Alloy.createModel('users');
                users.fetchExpiration().done(function() {
                    expect(users.getStoreUsername()).toBe(storePasswordConfigs.storeUsername);
                    expect(users.getExpirationDays()).toBe(storePasswordConfigs.daysToExpire);

                    // test password requirements
                    var oldPassword = storePasswordConfigs.oldPassword;
                    var newPassword = storePasswordConfigs.newPasswordShort;
                    var def = failChangePasswordTest(users, oldPassword, newPassword, 'PasswordPolicyViolationException', null);

                    // test password reuse
                    newPassword = storePasswordConfigs.newPasswordReuse;
                    def = failChangePasswordTest(users, oldPassword, newPassword, 'PasswordNotValidForReuseException', def);

                    // test old password wrong
                    oldPassword = storePasswordConfigs.oldPasswordWrong;
                    newPassword = storePasswordConfigs.newPasswordValid;
                    def = failChangePasswordTest(users, oldPassword, newPassword, 'InvalidPasswordException', def);

                    // valid password test
                    oldPassword = storePasswordConfigs.oldPassword;
                    changePasswordTest(users, oldPassword, newPassword, def).done(function() {
                        baskethelper.logoutAssociate(manager, function() {
                        });
                    });
                }).fail(function(error) {
                    helper.failure(error);
                });
            });
        });
    });
};

/**
 * failChangePasswordTest - test for unsucessful password change
 *
 * @param {Object} model
 * @param {Object} oldPassword
 * @param {Object} newPassword
 * @param {Object} testFor
 * @param {Object} deferred
 * @return {Deferred} promise
 */
function failChangePasswordTest(model, oldPassword, newPassword, testFor, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('fail change password test for ' + testFor, function(done) {
            changeStorePassword(model, oldPassword, newPassword).done(function() {
                helper.failure();
                thisDeferred.reject();
            }).fail(function(error) {
                helper.equals(error.type, testFor);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

/**
 * changePasswordTest - test for successful password change
 *
 * @param {Object} model
 * @param {Object} oldPassword
 * @param {Object} newPassword
 * @param {Object} deferred
 * @return {Deferred} promise
 */
function changePasswordTest(model, oldPassword, newPassword, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('change password test', function(done) {
            changeStorePassword(model, oldPassword, newPassword).done(function() {
                thisDeferred.resolve();
            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

/**
 * changeStorePassword - change the store password
 *
 * @param {Object} model
 * @param {Object} oldPassword
 * @param {Object} newPassword
 * @return {Deferred} promise
 */
function changeStorePassword(model, oldPassword, newPassword) {
    var deferred = new _.Deferred();
    it.eventually('change associate password', function(done) {
        model.updateStorePassword(oldPassword, newPassword).done(function() {
            var customObjects = Alloy.createModel('customObjects');
            customObjects.updateStorePasswords(model.getStoreUsername(), newPassword).done(function() {
                deferred.resolve();
            }).fail(function(error) {
                deferred.reject(error);
            }).always(function() {
                done();
            });
        }).fail(function(error) {
            deferred.reject(error);
            done();
        });
    });
    return deferred.promise();
}