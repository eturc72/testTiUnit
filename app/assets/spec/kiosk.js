// ©2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;
var kioskUserId = Alloy.CFG.kioskConfiguration.kioskUserId;
var kioskUserPassword = Alloy.CFG.kioskConfiguration.kioskUserPassword;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

exports.define = function() {
    describe('Kiosk', function() {
        it.eventually('get kiosk configuration data', function(done) {
            var cfgSettings = helper.newCFGSettingsModel();
            cfgSettings.loadServerConfigs(storeId).fail(function(err) {
                helper.failure(err);
            }).done(function() {
                var serverSettings = cfgSettings.getSettings();
                helper.isTrue(serverSettings.hasOwnProperty('kiosk_mode'));
                helper.isFalse(serverSettings.kiosk_mode.hasOwnProperty('username'));
                helper.isFalse(serverSettings.kiosk_mode.hasOwnProperty('password'));
                loginAndCheckKioskConfig(managerEmployeeId, managerEmployeePasscode);
            }).always(function() {
                done();
            });
        });

        it.eventually('get kiosk username and password without login', function(done) {
            var kioskCfgSettings = helper.newCFGSettingsModel();
            kioskCfgSettings.loadKioskServerConfigs(storeId).fail(function() {
                helper.isTrue(true); // we are expecting an error from this call
            }).done(function() {
                helper.isTrue(false); // if we are here then something is wrong
            }).always(function() {
                done();
            });
        });
    });
};

function loginAndCheckKioskConfig(employeeId, employeePasscode) {
    baskethelper.loginAssociateWithCredentials(employeeId, employeePasscode, true, function(manager) {
        helper.isTrue(manager.hasAdminPrivileges());
        it.eventually('get kiosk username and password', function(done) {
            var kioskCfgSettings = helper.newCFGSettingsModel();
            kioskCfgSettings.loadKioskServerConfigs(storeId).fail(function(error) {
                helper.failure(error);
            }).done(function() {
                var serverSettings = kioskCfgSettings.getSettings();
                helper.isTrue(serverSettings.kiosk_mode.hasOwnProperty('username'));
                helper.isTrue(serverSettings.kiosk_mode.hasOwnProperty('password'));
                helper.equals(serverSettings.kiosk_mode.username, kioskUserId);
                helper.equals(serverSettings.kiosk_mode.password, kioskUserPassword);
                baskethelper.logoutAssociate(manager, function() {});
            }).always(function() {
                done();
            });
        });
    });
}
