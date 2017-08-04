// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket and add product into it
 * 3. Add shipping address
 * 4. Get available shipping methods
 * 5. Set shipping method
 * 6. Set shipping price override
 * 7. Remove shipping override
 * 8. Continue applying and removing shipping override with various override types and override reasons
 * 9. Set billing address
 * 10. set customer email address
 * 11. create new order
 * 12. send email to the customer
 * 13. Authorize credit card
 * 14. Remove credit card
 * 15. Abandon order
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var productId = Alloy.CFG.shipPriceOverrideConfiguration.prodID;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;
var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;

var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;

var email = Alloy.CFG.modelTestsConfiguration.customerEmail;

var expectedShippingPrice = Alloy.CFG.shipPriceOverrideConfiguration.shipping_price;
var amountOverride = 5;
var percentOverride = 0.1;
var fixedAmountOverride = 5;
var priceAfterOverrideAmount = +((expectedShippingPrice - amountOverride).toFixed(2));
var priceAfterOverridePercent = +(expectedShippingPrice - (expectedShippingPrice * percentOverride)).toFixed(2);
var priceAfterOverrideFixedAmount = 5;
var productsCount = 1;
var shippingMethodId = Alloy.CFG.modelTestsConfiguration.shippingMethodId;

exports.define = function() {
    describe('Basket Model - Shipping Price Overrides', function() {
        it.eventually('Basket Shipping Price Overrides Model tests', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {

                    helper.equals(basket.getProductItems().length, 1);

                    var def = baskethelper.setShippingAddressAndEmail(basket, associateId, null, email, def);
                    def = baskethelper.getBasketShippingMethods(basket, associateId, def);
                    def = baskethelper.setBasketShippingMethod(basket, shippingMethodId, associateId, expectedShippingPrice, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, amountOverride, 'Amount', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideAmount, def);

                    def = baskethelper.removeShippingPriceOverride(basket, shippingMethodId, expectedShippingPrice, associateId, associatePasscode, storeId, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, amountOverride, 'Amount', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideAmount, def);

                    def = baskethelper.removeShippingPriceOverride(basket, shippingMethodId, expectedShippingPrice, associateId, associatePasscode, storeId, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, percentOverride, 'percent', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverridePercent, def);

                    def = baskethelper.removeShippingPriceOverride(basket, shippingMethodId, expectedShippingPrice, associateId, associatePasscode, storeId, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, percentOverride, 'percent', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverridePercent, def);

                    def = baskethelper.removeShippingPriceOverride(basket, shippingMethodId, expectedShippingPrice, associateId, associatePasscode, storeId, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, fixedAmountOverride, 'fixedPrice', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideFixedAmount, def);

                    def = baskethelper.removeShippingPriceOverride(basket, shippingMethodId, expectedShippingPrice, associateId, associatePasscode, storeId, def);

                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, fixedAmountOverride, 'fixedPrice', 'loyal customer', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideFixedAmount, def);

                    def = baskethelper.setBillingAddress(basket, associateId, def);
                    def = baskethelper.createNewOrder(basket, def);
                    def = baskethelper.checkGiftcardBalance(basket, def);
                    def = baskethelper.authorizeGiftCard(basket, def);
                    def = baskethelper.removeGiftCard(basket, def);
                    def = baskethelper.authorizeCreditCard(basket, 10, def);
                    def = baskethelper.removeCreditCard(basket, def);
                    baskethelper.abandonOrder(basket, associateId, associatePasscode, storeId, null, null, null, def);
                });
            });
        });
    });
};
