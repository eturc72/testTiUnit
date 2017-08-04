// ©2013-2017 salesforce.com, inc. All rights reserved.
//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');
var productId = Alloy.CFG.modelTestsConfiguration.productId;
var coupon = Alloy.CFG.modelTestsConfiguration.coupon;
var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

exports.define = function() {
    describe('Basket Model - Coupon', function() {
        it.eventually('Basket Coupons Model tests', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                var quantity = 2;
                baskethelper.newBasketAddProduct(productId, quantity, associateId, storeId, false, function(basket) {
                    var def = baskethelper.addCouponTest(basket, coupon);
                    def = removeCouponTest(basket, coupon, def);
                    baskethelper.removeProductTest(basket, 0, def);
                });
            });
        });
    });
};

// run the removeCoupon test
function removeCouponTest(basket, coupon, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('remove coupon', function(done) {
            basket.removeCoupon(coupon).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isFalse(basket.hasCoupon(coupon));
                it('check no coupon items', function() {
                    helper.equals(basket.getCouponItems().length, 0);
                });
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}