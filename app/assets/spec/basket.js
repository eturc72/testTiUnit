// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket and add product into it
 * 3. Add shipping address
 * 4. Get available shipping methods
 * 5. Set shipping method
 * 6. Set billing address
 * 7. set customer email address
 * 8. create new order
 * 9. send email to the customer
 * 10. Authorize credit card
 * 11. Remove credit card
 * 12. Abandon order
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var productId = Alloy.CFG.modelTestsConfiguration.productId;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;

var expectedShippingPrice = Alloy.CFG.modelTestsConfiguration.expectedShippingPrice;

var shippingMethodId = Alloy.CFG.modelTestsConfiguration.shippingMethodId;

var email = Alloy.CFG.modelTestsConfiguration.customerEmail;

exports.define = function() {
    describe('Basket Model', function() {
        it.eventually('Basket model tests', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {

                    helper.equals(basket.getProductItems().length, 1);

                    var def = baskethelper.setShippingAddressAndEmail(basket, associateId, null, email, def);
                    def = baskethelper.getBasketShippingMethods(basket, associateId, def);
                    def = baskethelper.setBasketShippingMethod(basket, shippingMethodId, associateId, expectedShippingPrice, def);
                    def = baskethelper.setBillingAddress(basket, associateId, def);
                    def = baskethelper.createNewOrder(basket, def);
                    def = baskethelper.sendEmail(basket, def);
                    def = baskethelper.checkGiftcardBalance(basket, def);
                    def = baskethelper.authorizeGiftCard(basket, def);
                    def = baskethelper.removeGiftCard(basket, def);
                    def = baskethelper.authorizeCreditCard(basket, 10, def);
                    def = baskethelper.removeCreditCard(basket, def);
                    def = baskethelper.abandonOrder(basket, associateId, associatePasscode, storeId, null, null, null, def);
                    baskethelper.removeProductTest(basket, 0, def);
                });
            });
        });
    });
};
