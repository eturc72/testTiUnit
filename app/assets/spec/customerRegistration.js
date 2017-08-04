// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Customer Registration Model', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        var storeId = Alloy.CFG.modelTestsConfiguration.storeId;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            baskethelper.newBasket(false, associateId, function(basket) {
                expect(associate.isLoggedIn()).toBe(true);
                it.eventually('register new user', function(done) {
                    var newCustomer = helper.newCustomerModel();
                    var d = new Date();
                    var login = Alloy.CFG.customerRegistrationConfiguration.emailPrefix + d.getTime();
                    var customer = Alloy.CFG.customerRegistrationConfiguration.customer;
                    customer.login = login;
                    newCustomer.register({
                        customer : customer
                    }, {
                        c_employee_id : associateId,
                        c_employee_passcode : associatePasscode,
                        c_store_id : storeId
                    }).fail(function(error) {
                        helper.failure(error);
                    }).done(function() {
                        it.eventually('get new user', function(done) {
                            baskethelper.loginCustomerWithEmail(login, basket, false, function(customer) {
                                helper.equals(customer.get('first_name'), Alloy.CFG.customerRegistrationConfiguration.customer.first_name);
                                baskethelper.logoutCustomer(customer, basket, associateId, function() {
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
};
