// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Customer Model', function() {
        it.eventually('execute customer profile update', function(done) {

            var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
            var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                var email = Alloy.CFG.modelTestsConfiguration.emailAddress;
                baskethelper.newBasket(true, associateId, function(basket) {
                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                        helper.isTrue(customer.isLoggedIn());
                        it.eventually('get profile information', function(done) {
                            helper.equals(customer.getFirstName(), Alloy.CFG.customerInfoConfiguration.firstName);
                            it.eventually('set profile information', function(done) {
                                customer.setProfile({
                                    fax : Alloy.CFG.customerInfoConfiguration.fax
                                }).fail(function(error) {
                                    helper.failure(error);
                                }).done(function() {
                                    helper.equals(customer.getFax(), Alloy.CFG.customerInfoConfiguration.fax);
                                    it.eventually('revert profile information', function(done) {
                                        customer.setProfile({
                                            fax : ''
                                        }).fail(function(error) {
                                            helper.failure(error);
                                        }).done(function() {
                                            helper.isUndefined(customer.getFax());
                                            baskethelper.logoutCustomer(customer, basket, associateId, function() {
                                            });
                                        }).always(function() {
                                            done();
                                        });
                                    });
                                }).always(function() {
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};