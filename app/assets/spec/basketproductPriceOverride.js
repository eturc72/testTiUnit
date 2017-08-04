// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket and add product into it
 * 3. Set price override
 * 4. Login as customer and check if the price override exists
 * 5. Remove price override
 * 6. Continue applying and removing override with various override types and override reasons
 * 7. Logout the customer
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var productId = Alloy.CFG.productOverrideConfiguration.productId;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;
var productPrice = Alloy.CFG.productOverrideConfiguration.productPrice;

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;

var customerEmail = Alloy.CFG.modelTestsConfiguration.customerEmail;

var priceOverrideValue = 30;
var priceOverridePercent = .10;
var priceOverrideFixed = 100;

var priceAfterOverrideAmount = +((productPrice - priceOverrideValue).toFixed(2));
var priceAfterOverridePercent = +(productPrice - (productPrice * .1)).toFixed(2);

exports.define = function() {
    describe('Basket Model - Product Price Overrides', function() {
        it.eventually('Basket Product Price Overrides Model tests', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {
                    helper.equals(basket.getProductItems()[0].getPrice(), productPrice);
                    var customer = helper.newCustomerModel();

                    var def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = loginCustomerAndCheckOverride(customerEmail, customer, basket, false, def, priceAfterOverrideAmount, 'Amount', 'product not in store', priceOverrideValue);

                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'display product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'damaged product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'price match', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideValue, 'Amount', 'returned product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverrideAmount, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'display product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'damaged product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'price match', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverridePercent, 'percent', 'returned product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceAfterOverridePercent, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'display product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'damaged product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'price match', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, priceOverrideFixed, 'fixedPrice', 'returned product', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, priceOverrideFixed, def);
                    def = removeProductPriceOverride(basket, def);

                    baskethelper.logoutCustomerWithPromise(customer, basket, associateId, def);
                });
            });
        });
    });
};

//remove override test
function removeProductPriceOverride(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('remove product price override', function(done) {

            basket.setProductPriceOverride({
                product_id : productId,
                price_override_type : 'none',
                index : 0,
                employee_id : associateId,
                employee_passcode : associatePasscode,
                store_id : storeId,
            }, {
                c_employee_id : associateId
            }).fail(function(error) {
                helper.failure(error.get('fault'));
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.getProductItems()[0].getPrice(), productPrice);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

function loginCustomerAndCheckOverride(email, customer, basket, clearCookies, deferred, expectedAmount, overrideType, overrideReason, overrideValue) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        if (clearCookies) {
            Alloy.Globals.resetCookies();
        }
        it.eventually('login customer and check for override', function(done) {
            customer.loginCustomer({
                login : email
            }, basket).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.isTrue(customer.isLoggedIn());
                helper.equals(basket.getProductItems()[0].getPrice(), expectedAmount);
                helper.equals(basket.getProductItems()[0].getPriceOverrideType(), overrideType);
                helper.equals(basket.getProductItems()[0].getPriceOverrideReasonCode(), overrideReason);
                helper.equals(basket.getProductItems()[0].getPriceOverrideValue(), overrideValue);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}
