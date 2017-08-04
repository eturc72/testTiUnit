// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var orderNumber = Alloy.CFG.customerOrderConfiguration.orderNumber;
var orderTotal = Alloy.CFG.customerOrderConfiguration.orderTotal;
var email = Alloy.CFG.customerOrderConfiguration.customerEmail;
// this test is doing a customer order lookup to make sure the order can be found and it's the right order

exports.define = function() {
    describe('CustomerOrder Model', function() {
        it.eventually('execute CustomerOrder model tests', function(done) {
            var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
            var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                baskethelper.newBasket(true, associateId, function(basket) {
                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                        helper.isTrue(customer.isLoggedIn());
                        it.eventually('get an order for this customer', function(done) {
                            var customerOrder = helper.newBasketModel();
                            customerOrder.getOrder({
                                order_no : orderNumber
                            }).fail(function() {
                                helper.failure();
                            }).done(function() {
                                helper.equals(customerOrder.get('order_total'), orderTotal);
                                baskethelper.logoutCustomer(customer, basket, associateId, function() {
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
};
