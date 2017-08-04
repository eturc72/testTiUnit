// ©2017 salesforce.com, inc. All rights reserved.

/**
 * Did not use product thats defined in config.json because it qualifies for free shipping
 *
 * Test Suite:
 * 1. login as associate
 * 2. create a basket and add a product to it
 * 3. set the shipping address
 * 4. get the shipping methods
 * 5. set the shipping method
 * 6. set the billing address
 * 7. set the customer email
 * 8. create an order
 * 9. cancel the order
 * 10. check if the order has the gift message(if assigned)
 * 11. check if the shipping method was the one that was selected
 * 12. check the shipping address was the one that was selected
 *
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

var newCustomer;

var expectedShippingPrice = Alloy.CFG.guestCheckoutCreateCustomerConfiguration.expectedShippingPrice;
var amountOverride = 5;
var percentOverride = 0.1;
var fixedAmountOverride = 5;
var priceAfterOverrideAmount = +((expectedShippingPrice - amountOverride).toFixed(2));
var priceAfterOverridePercent = +(expectedShippingPrice - (expectedShippingPrice * percentOverride)).toFixed(2);
var priceAfterOverrideFixedAmount = 5;
var productsCount = 1;

var coupon = Alloy.CFG.modelTestsConfiguration.coupon;

var overrideValue = Alloy.CFG.checkoutProcessConfiguration.overrideValueAmountOff;
var overrideType = Alloy.CFG.checkoutProcessConfiguration.productOverrideType;
var overrideReason = Alloy.CFG.checkoutProcessConfiguration.productOverrideReason;
var expectedAmount = Alloy.CFG.checkoutProcessConfiguration.expectedAmount;

var firstName = Alloy.CFG.checkoutProcessConfiguration.firstName;
var lastName = Alloy.CFG.checkoutProcessConfiguration.lastName;
var username = Alloy.CFG.checkoutProcessConfiguration.username;
var password = Alloy.CFG.checkoutProcessConfiguration.password;
var emailAddress = Alloy.CFG.checkoutProcessConfiguration.emailAddress;
var product;
var shippingMethodId = Alloy.CFG.modelTestsConfiguration.shippingMethodId;
var giftMessage = Alloy.CFG.modelTestsConfiguration.giftMessage;
var giftBoolean = Alloy.CFG.modelTestsConfiguration.giftBoolean;
exports.define = function() {
    describe('Basket Model', function() {
        it.eventually('Basket model tests', function(done) {
            var d = new Date();
            emailAddress = d.getTime() + emailAddress;

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                // run the basket helper method to get an empty basket and add a product with the given id
                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {

                    helper.equals(basket.getProductItems().length, 1);

                    var def = baskethelper.setShippingAddressAndEmail(basket, associateId, null, emailAddress, def);
                    def = baskethelper.getBasketShippingMethods(basket, associateId, def);
                    def = baskethelper.setBasketShippingMethod(basket, shippingMethodId, associateId, expectedShippingPrice, def);
                    def = baskethelper.setShippingPriceOverride(basket, shippingMethodId, productsCount, amountOverride, 'Amount', 'product not in store', associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedShippingPrice, priceAfterOverrideAmount, def);
                    def = baskethelper.setProductPriceOverride(basket, productId, 0, overrideValue, overrideType, overrideReason, associateId, associatePasscode, storeId, managerEmployeeId, managerEmployeePasscode, expectedAmount, def);
                    def = baskethelper.setBasketGiftMessage(basket, giftMessage, giftBoolean, def);
                    def = baskethelper.addCouponTest(basket, coupon, def);
                    def = baskethelper.setBillingAddress(basket, associateId, def);
                    var address = basket.getShippingAddress();

                    def = baskethelper.createNewOrder(basket, def);
                    def = baskethelper.abandonOrder(basket, associateId, associatePasscode, storeId, giftMessage, shippingMethodId, expectedShippingPrice, priceAfterOverrideAmount, expectedAmount, def);
                });
            });
        });
    });
};

// register new user
function registerNewUser(username, password, firstName, lastName, emailAddress, associateId, associatePasscode, storeId, basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('register new user', function(done) {
            var orderNumber = basket.getOrderNumber();
            var address = basket.getShippingAddress();
            var newCustomer = helper.newCustomerModel();
            var d = new Date();
            newCustomer.register({
                customer : {
                    first_name : firstName,
                    last_name : lastName,
                    email : emailAddress,
                    login : emailAddress
                }
            }, {
                c_employee_id : associateId,
                c_employee_passcode : associatePasscode,
                c_store_id : storeId,
                c_orderNo : orderNumber,
                c_address : address.toJSON()
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

function fetchOrderAndCheckCustomer(basket, customerEmail, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('check order for customer', function(done) {
            var orderNumber = basket.getOrderNumber();
            var customerOrder = Alloy.createModel('baskets');
            customerOrder.getOrder({
                order_no : orderNumber
            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customerEmail, customerOrder.get('customer_info').email);
            }).always(function() {
                done();
            });
        });
    };

    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

function findCustomer(firstName, lastName, customerEmail, basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('find customer', function(done) {
            var address = basket.getShippingAddress();
            var customers = Alloy.createCollection('customer');
            customers.fetch({
                attrs : {
                    email : customerEmail,
                    firstname : firstName,
                    lastname : lastName
                }
            }).fail(function() {
                helper.failure();
            }).done(function() {
                helper.equals(customers.models.length, 1);
                var customer = customers.models[0];
                getAddressesForThisCustomer(customer, 1, basket.getShippingAddress()).always(function() {
                    done();
                });
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

function getAddressesForThisCustomer(customer, length, address) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('get addresses for this customer', function(done) {
            customer.addresses.fetchAddresses(customer.getCustomerId()).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customerAddress.getAddresses().length, length);
                helper.compareAddresses(customerAddress.getAddresses()[0], address);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    func();
    return thisDeferred.promise();
}

