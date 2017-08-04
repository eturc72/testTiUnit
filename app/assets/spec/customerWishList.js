// ©2016-2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. Get a new basket
 * 3. Login test configurations specified customer
 * 4. Load customer product lists
 * 5. Load customer test configurations specified wish list
 * 6. verify if product already exist in wish list
 * 7. Add test configurations specified product to wish list
 * 8. Reload wish list
 * 9. Verify if product is added to wish list
 * 10. Update quantity of previously added product to wish list
 * 11. Reload wish list
 * 12. Verify if updated product has expected quantity
 * 13. Delete  from wish list
 * 14. Reload wish list
 * 15. Verify if product is gone from wish list
 * 16. Logout customer
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');
var wishListConfigs = Alloy.CFG.customerWishListConfiguration;
exports.define = function() {
    describe('CustomerWishList Model', function() {
        it.eventually('execute CustomerWishList model tests', function(done) {
            var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
            var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);
                baskethelper.newBasket(false, associateId, function(basket) {
                    var email = wishListConfigs.customer_email;
                    baskethelper.loginCustomerWithEmail(email, basket, false, function(customer) {
                        helper.isTrue(customer.isLoggedIn());

                        it.eventually('Get all product lists for this customer', function(done) {
                            customer.productLists.getCollection(customer).fail(function() {
                                helper.failure();
                            }).done(function() {
                                if (customer.productLists.getWishListCount() > 0) {
                                    var wishlistIndex = wishListConfigs.wishlistIndex;
                                    it.eventually('Get wish list at index ' + wishlistIndex, function(done) {
                                        var wishLists = customer.productLists.getAllWishLists();
                                        var listId = getWishListId(customer);
                                        var wishListItems = customer.productLists.getListItems(listId);

                                        var productInfo = wishListConfigs.productDeleteAdd;

                                        var item = wishListItems.findItemByProductId(productInfo.product_id);
                                        helper.equals(item, null);
                                        var def = testAddToWishList(customer, null);
                                        def = testReloadWishList(customer, def);
                                        def.done(function() {
                                            wishListItems = customer.productLists.getListItems(listId);
                                            var item = wishListItems.findItemByProductId(productInfo.product_id);
                                            helper.equals(item.getQuantity(), productInfo.quantity);
                                        });
                                        def = testUpdateWishList(customer, def);
                                        def = testReloadWishList(customer, def);
                                        def.done(function() {
                                            wishListItems = customer.productLists.getListItems(listId);
                                            var item = wishListItems.findItemByProductId(productInfo.product_id);
                                            helper.equals(item.getQuantity(), wishListConfigs.updateQuantity);
                                        });
                                        def = testDeleteFromWishList(customer, def);
                                        def = testReloadWishList(customer, def);
                                        def.done(function() {
                                            wishListItems = customer.productLists.getListItems(listId);
                                            var item = wishListItems.findItemByProductId(productInfo.product_id);
                                            helper.equals(item, null);
                                            logoutCustomer(customer, basket, associateId);
                                        });

                                    });

                                } else {
                                    helper.failure('\'This customer has no wish lists\'', '\'This customer wish list count is greater than 0\'');
                                }
                            }).always(function() {
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * testReloadWishList - Reload the current wish list and run next function
 * @param {Object} customer
 * @param {Deferred} deferred
 */
function testReloadWishList(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Reloading products from current wish list', function(done) {
            customer.productLists.getCollection(customer).fail(function() {
                helper.failure();
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

/**
 * testAddToWishList - add product to the current wish list and run next function
 * @param {Object} customer
 * @param {Deferred} deferred
 */
function testAddToWishList(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Adding product to wish list', function(done) {
            var productInfo = wishListConfigs.productDeleteAdd;
            customer.productLists.addItem(getWishListId(customer), productInfo).fail(function() {
                helper.failure();
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

/**
 * testUpdateWishList - Update product in the current wish list and run next function
 * @param {Object} customer
 * @param {Deferred} deferred
 */
function testUpdateWishList(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Updating product from wish list', function(done) {
            var listId = getWishListId(customer);
            var wishListItems = customer.productLists.getListItems(listId);
            var productInfo = wishListConfigs.productDeleteAdd;
            var item = wishListItems.findItemByProductId(productInfo.product_id);
            customer.productLists.addItem(listId, {
                product_id : productInfo.product_id,
                quantity : wishListConfigs.updateQuantity
            }).fail(function() {
                helper.failure();
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

/**
 * testDeleteFromWishList - Delete product from the current wish list and run next function
 * @param {Object} customer
 * @param {Deferred} deferred
 */

function testDeleteFromWishList(customer, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('Deleting product from wish list', function(done) {
            var productInfo = wishListConfigs.productDeleteAdd;
            var listId = getWishListId(customer);
            var wishListItems = customer.productLists.getListItems(listId);
            var productInfo = wishListConfigs.productDeleteAdd;
            var item = wishListItems.findItemByProductId(productInfo.product_id);
            customer.productLists.deleteItem(listId, item.getItemId()).fail(function() {
                helper.failure();
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

/**
 * getWishListId - returns the current wish list id
 * @param {Object} customer
 */
function getWishListId(customer) {
    return customer.productLists.getFirstWishListId();
}

/**
 * logoutCustomer - Lougout the current customer
 * @param {Object} customer
 */
function logoutCustomer(customer, basket, associateId) {
    baskethelper.logoutCustomer(customer, basket, associateId, function() {
    });
}