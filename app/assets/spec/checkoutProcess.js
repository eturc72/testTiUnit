// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket and add product into it
 * 3. Create product model
 * 4. fetch product recommendations
 * 5. Apply product price override
 * 6. Add another product to the basket
 * 7. Apply coupon to the basket
 * 8. Add shipping address
 * 9. Get available shipping methods
 * 10. Set shipping method
 * 11. Set shipping price override
 * 12. Set billing address
 * 13. set customer email address
 * 14. Update product quantity in the basket
 * 15. create new order
 * 16. send email to the customer
 * 17. Authorize credit card
 * 18. Register new user
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var productId = Alloy.CFG.checkoutProcessConfiguration.prodID;
var newProductId = Alloy.CFG.modelTestsConfiguration.newProductId;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;
var managerEmployeeId = Alloy.CFG.modelTestsConfiguration.managerEmployeeId;
var managerEmployeePasscode = Alloy.CFG.modelTestsConfiguration.managerEmployeePasscode;

var coupon = Alloy.CFG.modelTestsConfiguration.coupon;
var newCustomer;

var productModelId = Alloy.CFG.checkoutProcessConfiguration.modelID;
var recommendationType = Alloy.CFG.checkoutProcessConfiguration.recommendationType;
var expectedRecommendations = Alloy.CFG.checkoutProcessConfiguration.expectedRecommendations;
var overrideValue = Alloy.CFG.checkoutProcessConfiguration.overrideValueAmountOff;
var overrideType = Alloy.CFG.checkoutProcessConfiguration.productOverrideType;
var overrideReason = Alloy.CFG.checkoutProcessConfiguration.productOverrideReason;

var shippingOverrideType = Alloy.CFG.checkoutProcessConfiguration.shippingOverrideType;
var shippingOverrideReason = Alloy.CFG.checkoutProcessConfiguration.shippingOverrideReason;

var recommendationsProductId = Alloy.CFG.checkoutProcessConfiguration.recommendationsProductId;

var expectedAmount = Alloy.CFG.checkoutProcessConfiguration.expectedAmount;
var basketTotal = Alloy.CFG.checkoutProcessConfiguration.basketTotal;
var productTotal = Alloy.CFG.checkoutProcessConfiguration.productTotal;
var productsCount = 2;
var newProductQuantity = 2;
var expectedShippingPrice = Alloy.CFG.checkoutProcessConfiguration.expectedShippingPrice;
var priceAfterOverrideAmount = Alloy.CFG.checkoutProcessConfiguration.priceAfterOverrideAmount;
var amountOverride = Alloy.CFG.checkoutProcessConfiguration.amountOverride;
var firstName = Alloy.CFG.checkoutProcessConfiguration.firstName;
var lastName = Alloy.CFG.checkoutProcessConfiguration.lastName;
var dob = Alloy.CFG.checkoutProcessConfiguration.dob;
var locale = Alloy.CFG.checkoutProcessConfiguration.locale;
var gender = Alloy.CFG.checkoutProcessConfiguration.gender;
var username = Alloy.CFG.checkoutProcessConfiguration.username;
var password = Alloy.CFG.checkoutProcessConfiguration.password;
var emailAddress = Alloy.CFG.checkoutProcessConfiguration.emailAddress;
var product;
var shippingMethodId = Alloy.CFG.modelTestsConfiguration.shippingMethodId;

exports.define = function() {
    describe('Basket Model', function() {
        it.eventually('Basket model tests', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {

                    helper.equals(basket.getProductItems().length, 1);

                    var def = createProductModel(productModelId, def);
                    def = fetchProductRecommendations(product, def);

                    def = baskethelper.setProductPriceOverride(basket, productId, 0, overrideValue, overrideType, overrideReason, associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedAmount, def);

                    def = addProductToBasket(basket, newProductId, newProductQuantity, productsCount, associateId, storeId, productTotal, basketTotal, def);
                    def = baskethelper.addCouponTest(basket, coupon, def);
                    def = baskethelper.setShippingAddressAndEmail(basket, associateId, null, emailAddress, def);
                    def = baskethelper.getBasketShippingMethods(basket, associateId, def);
                    def = baskethelper.setBasketShippingMethod(basket, shippingMethodId, associateId, expectedShippingPrice, def);
                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, amountOverride, shippingOverrideType, shippingOverrideReason, associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideAmount, def);

                    def = baskethelper.setBillingAddress(basket, associateId, def);
                    newProductQuantity = 1;
                    def = updateProductQuantity(basket, basket.getProductItems()[0].getProductId(), basket.getProductItems()[0].getItemId(), newProductQuantity, productsCount, def);

                    def = baskethelper.createNewOrder(basket, def);
                    def = baskethelper.sendEmail(basket, def);
                    def = baskethelper.checkGiftcardBalance(basket, def);
                    def = baskethelper.authorizeGiftCard(basket, def);
                    def = baskethelper.removeGiftCard(basket, def);
                    def = baskethelper.authorizeCreditCard(basket, 10, def);
                    def = registerNewUser(username, password, firstName, lastName, emailAddress, associateId, associatePasscode, storeId, def);
                    def = baskethelper.abandonOrder(basket, associateId, associatePasscode, storeId, null, null, null, def);

                });
            });
        });
    });
};

// create a new Product Model
function createProductModel(productModelId, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('calls product recommendations', function(done) {
            product = helper.newProductModel(recommendationsProductId);
            product.fetch().fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isNotNull(product.recommendations);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// fetch product recommendations
function fetchProductRecommendations(product, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('fetch product recommendations', function(done) {
            product.recommendations.getRecommendations(product.getId()).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var rec = product.recommendations.getRecommendedItems();
                helper.equals(rec.length, expectedRecommendations);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// add another product to basket
function addProductToBasket(basket, newProductId, newProductQuantity, productsItemsCount, employeeId, storeId, productCost, basketTotal, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('add a product to the basket', function(done) {
            basket.addProduct({
                product_id : newProductId,
                quantity : newProductQuantity
            }, {
                c_employee_id : employeeId,
                c_store_id : storeId
            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.getProductItems().length, productsItemsCount);
                helper.equals(basket.getProductItemsCollection().models[1].getQuantity(), newProductQuantity);
                helper.equals(basket.getProductItemsCollection().models[1].getPrice(), productCost);
                helper.equals(basket.get('product_total'), basketTotal);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// update product quantity
function updateProductQuantity(basket, product_id, item_id, newProductQuantity, productsItemsCount, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('update quantity of item in cart from 2 to 1', function(done) {
            basket.replaceProduct({
                product_id : product_id,
                quantity : newProductQuantity
            }, item_id, {
                c_employee_id : associateId
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var productItems = basket.getProductItems();
                helper.equals(productItems.length, productsItemsCount);
                var product = _.find(productItems, function(productItem) {
                    return productItem.get('product_id') == product_id;
                });
                helper.equals(product.getQuantity(), newProductQuantity);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// register new user
function registerNewUser(username, password, firstName, lastName, emailAddress, associateId, associatePasscode, storeId, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('register new user', function(done) {
            var newCustomer = helper.newCustomerModel();
            var d = new Date();
            newCustomer.register({
                customer : {
                    first_name : firstName,
                    last_name : lastName,
                    email : emailAddress,
                    login : username + d.getTime()
                }
            }, {
                c_employee_id : associateId,
                c_employee_passcode : associatePasscode,
                c_store_id : storeId
            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

