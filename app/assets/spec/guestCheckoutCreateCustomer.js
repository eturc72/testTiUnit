// ©2013-2017 salesforce.com, inc. All rights reserved.

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
 * 9. pay with a credit card
 * 10. register new user
 * 11. check the order has been assigned to the customer
 * 12. check the shipping address has been saved to the customer
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
var firstName = Alloy.CFG.checkoutProcessConfiguration.firstName;
var lastName = Alloy.CFG.checkoutProcessConfiguration.lastName;
var username = Alloy.CFG.checkoutProcessConfiguration.username;
var password = Alloy.CFG.checkoutProcessConfiguration.password;
var emailAddress = Alloy.CFG.checkoutProcessConfiguration.emailAddress;
var product;
var shippingMethodId = Alloy.CFG.modelTestsConfiguration.shippingMethodId;

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
                    def = baskethelper.setBillingAddress(basket, associateId, def);
                    var address = basket.getShippingAddress();

                    def = baskethelper.createNewOrder(basket, def);
                    def = baskethelper.authorizeCreditCard(basket, null, def);
                    // order is complete, so register the new user
                    def = registerNewUser(username, password, firstName, lastName, emailAddress, associateId, associatePasscode, storeId, basket, def);

                    // look up the order and make sure the customer has been assigned to it
                    def = fetchOrderAndCheckCustomer(basket, emailAddress, def);
                    // look up the customer and make sure the address was saved
                    findCustomer(firstName, lastName, emailAddress, basket, def);
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

