// ©2013-2017 salesforce.com, inc. All rights reserved.
require('behave').andSetup(this);

var helper = require('testhelper');

var baskethelper = require('spec/baskethelper');

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associateFirstName = Alloy.CFG.modelTestsConfiguration.associateFName;
var associateLastName = Alloy.CFG.modelTestsConfiguration.associateLName;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

exports.define = function() {
    describe('Associate Model - Login an associate', function() {
        it.eventually('Associate Login Model tests', function() {
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                associate.getAssociateInfo();
                var firstName = associate.getFirstName();
                helper.equals(firstName, associateFirstName);
                var lastName = associate.getLastName();
                helper.equals(lastName, associateLastName);
                var managerOverrides = associate.canDoManagerOverrides();
                helper.isFalse(managerOverrides);
                baskethelper.logoutAssociate(associate, function() {
                    var def = changePasswordTest();
                    failChangePasswordTest(def);
                });
            });
        });
    });
};

function changePasswordTest(deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Associate Change Password Model test', function() {
            baskethelper.loginAssociateWithCredentials(managerEmployeeId, managerEmployeePasscode, true, function(manager) {
                expect(manager.isLoggedIn()).toBe(true);
                expect(manager.hasAdminPrivileges()).toBe(true);
                changeAssociatePassword(manager, 'A' + associateId, '1234', storeId, function(manager) {
                    baskethelper.logoutAssociate(manager, function() {
                        baskethelper.loginAssociateWithCredentials(associateId, '1234', true, function(associate) {
                            expect(associate.isLoggedIn()).toBe(true);
                            baskethelper.logoutAssociate(associate, function() {
                                baskethelper.loginAssociateWithCredentials(managerEmployeeId, managerEmployeePasscode, true, function(manager) {
                                    expect(manager.isLoggedIn()).toBe(true);
                                    expect(manager.hasAdminPrivileges()).toBe(true);
                                    changeAssociatePassword(manager, 'A' + associateId, associatePasscode, storeId, function(manager) {
                                        baskethelper.logoutAssociate(manager, function() {
                                            thisDeferred.resolve();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

function failChangePasswordTest(deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Associate Change Password Model test (no assoc login)', function() {
            var manager = helper.newAssociateModel();
            changeAssociatePassword(manager, 'A' + associateId, '1234', storeId, function(manager) {
                helper.failure();
            }, function(error) {
                helper.isNotNull(error);
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

var changeAssociatePassword = function(manager, employeeId, newPassword, storeId, afterChangePasswordClosure, afterChangePasswordFailureClosure) {
    it.eventually('change associate password', function(done) {
        manager.changePassword({
            employee_id : employeeId,
            new_password : newPassword,
            store_id : storeId
        }).fail(function(error) {
            afterChangePasswordFailureClosure ? afterChangePasswordFailureClosure(error) : helper.failure(error);
        }).done(function() {
            afterChangePasswordClosure(manager);
        }).always(function() {
            done();
        });
    });
};

