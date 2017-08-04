// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 * 1. Login as Associate
 * 2. Add product to the basket
 * 3. login as customer
 * 4. Logout as Customer. At this point, the current basket items should be moved to saved products
 * 5. login again as Customer and check for saved products
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Customer Logout tests', function() {

        it.eventually('execute customer logout model tests', function(done) {
            var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
            var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);

                // run the basket helper method to get an empty basket and add a product with the given id
                var productId = Alloy.CFG.modelTestsConfiguration.productId;
                var quantity = 1;
                baskethelper.newBasketAddProduct(productId, quantity, associateId, Alloy.CFG.modelTestsConfiguration.storeId, false, function(basket) {
                    //login as customer
                    var email = Alloy.CFG.modelTestsConfiguration.customerEmail;
                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                        helper.isTrue(customer.isLoggedIn());
                        customer.syncSavedProducts(basket, {
                            c_employee_id : associateId
                        }).done(function() {
                            //logout customer
                            baskethelper.logoutCustomer(customer, basket, associateId, function() {
                                // get a new basket
                                baskethelper.newBasket(false, associateId, function(basket) {
                                    //login as customer
                                    var email = Alloy.CFG.modelTestsConfiguration.customerEmail;
                                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                                        helper.isTrue(customer.isLoggedIn());

                                        //check if the product exists
                                        helper.equals(customer.getSavedProducts()[0].getProductId(), Alloy.CFG.modelTestsConfiguration.productId);
                                        // remove the saved product
                                        baskethelper.removeSavedProduct(customer, customer.getSavedProducts()[0]).done(function() {
                                            helper.equals(customer.getSavedProducts().length, 0);
                                            baskethelper.logoutCustomer(customer, basket, associateId, function() {

                                            });
                                        });
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
