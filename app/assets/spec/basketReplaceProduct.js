// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');
var productId = Alloy.CFG.basketReplaceConfiguration.prod1ID,
    newProductId = Alloy.CFG.basketReplaceConfiguration.prod2ID;
var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;

exports.define = function() {
    describe('Basket Model -  Replace Product', function() {
        // login the associate
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            var quantity = 2;
            // run the basket helper method to get an empty basket and add a product with the given id
            baskethelper.newBasketAddProduct(productId, quantity, associateId, storeId, false, function(basket) {
                helper.equals(basket.getProductItems().length, 1);
                // run the replace product test
                var def = replaceProduct(basket, 0, newProductId);
                // cleanup - run the remove product test
                removeProduct(basket, 0, newProductId, def);
            });
        });
    });
};

// run the replaceProduct test
function replaceProduct(basket, index, newProductId, deferred) {
    var thisDeferred = new _.Deferred();
    var toExecute = function() {
        it.eventually('replace product', function(done) {
            basket.replaceProduct({
                product_id : newProductId,
                quantity : 5
            }, basket.getProductItems()[index].getItemId(), {
                c_employee_id : associateId
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var prd = basket.getProductItems()[index];
                helper.equals(prd.getProductId(), newProductId);
                it('check quantity after replace', function() {
                    helper.equals(prd.getQuantity(), 5);
                });
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(toExecute) : toExecute();
    return thisDeferred.promise();
}

// run the removeProduct test
function removeProduct(basket, index, newProductId, deferred) {
    var thisDeferred = new _.Deferred();
    var toExecute = function() {
        it.eventually('remove the product', function(done) {
            var prd = basket.getProductItems()[index];
            basket.removeItem(prd.get('item_id')).fail(function() {
                helper.failure();
            }).done(function() {
                helper.equals(basket.getProductItems().length, 0);
            }).always(function() {
                done();
                thisDeferred.resolve();
            });
        });
    };
    deferred ? deferred.done(toExecute) : toExecute();
    return thisDeferred.promise();
}