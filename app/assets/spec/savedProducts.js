// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

exports.define = function() {
    describe('Saved Products Tests', function() {

        it.eventually('should login as Associate', function(done) {
            var callback = done;
            baskethelper.loginAssociateWithCredentials(Alloy.CFG.modelTestsConfiguration.associateId, Alloy.CFG.modelTestsConfiguration.associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                callback();

                baskethelper.newBasket(true, associateId, function(basket) {
                    //login as customer
                    var email = Alloy.CFG.modelTestsConfiguration.customerEmail;
                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                        helper.isTrue(customer.isLoggedIn());

                        // run the basket helper method to get an empty basket and add a product with the given id
                        var productId = Alloy.CFG.savedProductConfiguration.prodID;
                        var quantity = 2;
                        var prodAmount = Alloy.CFG.savedProductConfiguration.prodAmount;
                        var prodAmountOf2 = (prodAmount + prodAmount);
                        var prodAmountAfterOverride = +((prodAmountOf2 - 20).toFixed(2));
                        baskethelper.addProduct(basket, productId, quantity, associateId, storeId, false, function(basket) {
                            //check if the product exists
                            helper.equals(basket.getProductItems().length, 1);
                            helper.equals(basket.getProductItemsCollection().models[0].getPrice(), prodAmountOf2);

                            //apply product override
                            it.eventually('set product price override', function(done) {
                                var callback = done;
                                basket.setProductPriceOverride({
                                    product_id : Alloy.CFG.savedProductConfiguration.prodID,
                                    price_override_value : Alloy.CFG.savedProductConfiguration.overrideAmount,
                                    price_override_type : Alloy.CFG.savedProductConfiguration.overrideType,
                                    reason_code : Alloy.CFG.savedProductConfiguration.overrideReason,
                                    manager_employee_id : Alloy.CFG.modelTestsConfiguration.managerEmployeeId,
                                    manager_employee_passcode : Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode,
                                    employee_id : associateId,
                                    employee_passcode : Alloy.CFG.modelTestsConfiguration.associatePasscode,
                                    store_id : Alloy.CFG.store_id,
                                    index : 0
                                }, {
                                    c_employee_id : associateId
                                }).fail(function(error) {
                                    helper.failure(error.get('fault'));
                                }).done(function() {
                                    helper.equals(basket.getProductItemsCollection().models[0].getPrice(), prodAmountAfterOverride);
                                    //move products to saved items
                                    var currentBasketItems = basket.getProductItems();
                                    customer.addSavedProduct({
                                        product_id : currentBasketItems[0].getProductId(),
                                        quantity : currentBasketItems[0].getQuantity()
                                    }, {
                                        c_employee_id : associateId,
                                        c_store_id : storeId
                                    }).fail(function(error) {
                                        helper.failure(error.get('fault'));
                                    }).done(function() {
                                        //check if the product exists
                                        helper.equals(customer.getSavedProducts().length, 1);
                                        callback();
                                        helper.equals(customer.getSavedProducts()[0].getPrice(), prodAmountOf2);
                                        baskethelper.removeSavedProduct(customer, customer.getSavedProducts()[0]).done(function() {
                                            // clear out tke basket
                                            baskethelper.removeProductTest(basket, 0).done(function() {
                                                // logout the customer to clean up the basket
                                                baskethelper.logoutCustomer(customer, basket, associateId);
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
