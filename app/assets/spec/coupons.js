// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Coupon Tests', function() {

        it.eventually('execute coupon model tests', function(done) {
            var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
            var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);

                // run the basket helper method to get an empty basket and add a product with the given id
                var productId = Alloy.CFG.modelTestsConfiguration.productId;
                var quantity = 2;
                baskethelper.newBasketAddProduct(productId, quantity, associateId, Alloy.CFG.modelTestsConfiguration.storeId, false, function(basket) {
                    it.eventually('add a coupon', function(done) {
                        basket.addCoupon('abc').fail(function() {
                            helper.failure();
                        }).done(function() {
                            helper.isTrue(basket.hasCoupon(Alloy.CFG.modelTestsConfiguration.coupon_name));
                            helper.equals(basket.getCouponItems()[0].get('code'), Alloy.CFG.modelTestsConfiguration.coupon_name);

                            //login as customer and check if the coupon still exists
                            var email = Alloy.CFG.modelTestsConfiguration.customerEmail;
                            baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                                helper.isTrue(customer.isLoggedIn());
                                helper.equals(basket.getCouponItems()[0].get('code'), Alloy.CFG.modelTestsConfiguration.coupon_name);
                                //remove coupon
                                it.eventually('remove coupon', function(done) {
                                    basket.removeCoupon(Alloy.CFG.modelTestsConfiguration.coupon_name).fail(function() {
                                        helper.failure();
                                    }).done(function() {
                                        helper.isFalse(basket.hasCoupon(Alloy.CFG.modelTestsConfiguration.coupon_name));
                                        helper.equals(basket.getCouponItems().length, 0);
                                        //remove product
                                        it.eventually('remove product from basket', function(done) {
                                            basket.replaceProduct({
                                                product_id : basket.getProductItems()[0].getProductId(),
                                                quantity : 0
                                            }, basket.getProductItems()[0].getItemId(), {
                                                c_employee_id : associateId
                                            }).fail(function(error) {
                                                helper.failure(error.get('fault'));
                                            }).done(function() {
                                                helper.equals(basket.getProductItems().length, 0);
                                            }).always(function() {
                                                done();
                                            });
                                        });
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
