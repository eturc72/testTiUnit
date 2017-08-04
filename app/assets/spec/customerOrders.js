// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('CustomerOrders Model', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            baskethelper.newBasket(true, function(basket) {
                var email = Alloy.CFG.modelTestsConfiguration.customerEmail;

                baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                    helper.isTrue(customer.isLoggedIn());
                    it.eventually('get orders for this customer', function(done) {
                        var customerOrders = Alloy.createCollection('customerOrder');
                        customerOrders.search({
                            customerId : customer.getCustomerNumber()
                        }).fail(function() {
                            helper.failure();
                        }).done(function() {
                            helper.equals(customerOrders.models.length, 0);
                            baskethelper.logoutCustomer(customer, function() {
                                it.eventually('get orders by email', function(done) {
                                    customerOrders.search({
                                        customerEmail : email
                                    }).fail(function() {
                                        helper.failure();
                                    }).done(function() {
                                        helper.equals(customerOrders.models.length, 0);
                                    }).always(function() {
                                        done();
                                    });
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
};
