// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket and add product into it
 * 3. login as customer
 * 4. Get addresses for the customer
 * 5. verify address fields
 * 6. create a new address
 * 7. edit the new address created
 * 8. delete the new address
 * 10. logout associate
 *
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;
var productId = Alloy.CFG.modelTestsConfiguration.productId;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;
var customerEmail = Alloy.CFG.customerAddressConfiguration.customer_email;
var addressToCreate = Alloy.CFG.customerAddressConfiguration.addressToCreate;
var addressToUpdate = Alloy.CFG.customerAddressConfiguration.addressToUpdate;

var customerAddress;
var currentAddress;

exports.define = function() {
    describe('Customer Address Tests', function() {
        it.eventually('Customer Addresses', function(done) {
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);

                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {
                    helper.equals(basket.getProductItems().length, 1);
                    baskethelper.loginCustomerWithEmail(customerEmail, basket, false, function(customer) {
                        var def = getAddressesForThisCustomer(customer, 0, 1, def);
                        def = verifyCurrentAddress(def);
                        def = createAnotherAddress(customer, def);
                        def = editCustomerAddress(customer, def);
                        def = deleteAddress(customer, def);
                        def = baskethelper.logoutCustomerWithPromise(customer, basket, associateId, def);
                        def = baskethelper.logoutAssociatePromise(associate, def);
                    });
                });
            });
        });
    });
};

// get address
function getAddressesForThisCustomer(customer, index, length, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('get addresses for this customer', function(done) {
            customer.addresses.fetchAddresses(customer.getCustomerId()).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                customerAddress = customer.addresses;
                currentAddress = customerAddress.getAddresses()[index];
                helper.equals(customerAddress.getAddresses().length, length);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// verify address
function verifyCurrentAddress(deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        var address1 = currentAddress.getAddress1();
        helper.equals(address1, Alloy.CFG.customerAddressConfiguration.address1);
        var address2 = currentAddress.getAddress2();
        helper.equals(address2, Alloy.CFG.customerAddressConfiguration.address2);
        var city = currentAddress.getCity();
        helper.equals(city, Alloy.CFG.customerAddressConfiguration.city);
        var country_code = currentAddress.getCountryCode();
        helper.equals(country_code, Alloy.CFG.customerAddressConfiguration.country_code);
        var first_name = currentAddress.getFirstName();
        helper.equals(first_name, Alloy.CFG.customerAddressConfiguration.first_name);
        var last_name = currentAddress.getLastName();
        helper.equals(last_name, Alloy.CFG.customerAddressConfiguration.last_name);
        var full_name = currentAddress.getFullName();
        helper.equals(full_name, Alloy.CFG.customerAddressConfiguration.full_name);
        var phone = currentAddress.getPhone();
        helper.equals(phone, Alloy.CFG.customerAddressConfiguration.phone);
        var postal_code = currentAddress.getPostalCode();
        helper.equals(postal_code, Alloy.CFG.customerAddressConfiguration.postal_code);
        var state_code = currentAddress.getStateCode();
        helper.equals(state_code, Alloy.CFG.customerAddressConfiguration.state_code);
        thisDeferred.resolve();
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// get address
function createAnotherAddress(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('create a new address', function(done) {
            customerAddress.createAddress(addressToCreate, customer.getCustomerId(), {
                c_employee_id : associateId
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                it.eventually('get customer addresses again', function(done) {
                    customerAddress.fetchAddresses(customer.getCustomerId()).fail(function() {
                        helper.failure();
                        thisDeferred.resolve();
                    }).done(function() {
                        helper.equals(customerAddress.getAddresses().length, 2);
                    });
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

// get address
function deleteAddress(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('delete the address it just added', function(done) {
            customerAddress.deleteAddress(addressToCreate.address_id, customer.getCustomerId()).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                it.eventually('get customer addresses again', function(done) {
                    customerAddress.fetchAddresses(customer.getCustomerId()).fail(function() {
                        helper.failure();
                        thisDeferred.reject();
                    }).done(function() {
                        helper.equals(customer.getAddresses().length, 1);
                        thisDeferred.resolve();
                    }).always(function() {
                        done();
                    });
                });
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// edit address
function editCustomerAddress(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('edit address for this customer', function(done) {
            customerAddress.updateAddress(addressToUpdate, customer.getCustomerId(), {
                c_employee_id : associateId
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                customerAddress.fetchAddresses(customer.getCustomerId()).fail(function() {
                    helper.failure();
                    thisDeferred.reject();
                }).done(function() {
                    helper.equals(customerAddress.getAddresses().length, 2);
                    thisDeferred.resolve();
                }).always(function() {
                    done();
                });
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

