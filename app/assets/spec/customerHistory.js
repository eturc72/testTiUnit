// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var storeId = Alloy.CFG.modelTestsConfiguration.storeId;
var productId = Alloy.CFG.modelTestsConfiguration.productId;
var productQuantity = Alloy.CFG.modelTestsConfiguration.productQuantity;

var email = Alloy.CFG.customerHistoryConfiguration.email;
var order,
    order0,
    order1;

exports.define = function() {
    describe('Customer Order History', function() {
        it.eventually('Customer orders', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);

                baskethelper.newBasketAddProduct(productId, productQuantity, associateId, storeId, false, function(basket) {

                    helper.equals(basket.getProductItems().length, 1);

                    var order1Num = Alloy.CFG.customerHistoryConfiguration.order1Num;
                    var order1Date = Alloy.CFG.customerHistoryConfiguration.order1Date;
                    var order1Total = Alloy.CFG.customerHistoryConfiguration.order1Total;
                    var order1Status = Alloy.CFG.customerHistoryConfiguration.order1Status;

                    var order2Num = Alloy.CFG.customerHistoryConfiguration.order2Num;
                    var order2Date = Alloy.CFG.customerHistoryConfiguration.order2Date;
                    var order2Total = Alloy.CFG.customerHistoryConfiguration.order2Total;
                    var order2Status = Alloy.CFG.customerHistoryConfiguration.order2Status;

                    var customerOrders = Alloy.createCollection('customerOrder');

                    var def = loginCustomer(email, basket, false, def);
                    def = getCustomerOrders(customerOrders, def);
                    def = assignCurrentOrder(def);
                    def = verifyOrderDetails(order2Num, order2Date, order2Total, order2Status, def);
                });
            });
        });
    });
};

//login as customer
function loginCustomer(email, basket, clearCookies, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        baskethelper.loginCustomerWithEmail(email, basket, clearCookies, function(customer) {
            helper.isTrue(customer.isLoggedIn());
            thisDeferred.resolve();
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// retrieve customer orders
function getCustomerOrders(customerOrders, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('get orders for this customer', function(done) {
            customerOrders.fetch().fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customerOrders.models.length, 2);
                order0 = customerOrders.models[0];
                order1 = customerOrders.models[1];
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

function verifyOrderDetails(orderNum, orderDate, orderTotal, orderStatus, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        var orderNo = order.get('orderNo');
        var creationDate = order.get('creationDate');
        helper.equals(creationDate, orderDate);
        var totalNetPrice = order.get('totalNetPrice');
        helper.equals(totalNetPrice, orderTotal);
        var status = order.get('status');
        helper.equals(status, orderStatus);
        thisDeferred.resolve();
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// retrieve customer orders
function assignCurrentOrder(deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        order = order1;
        thisDeferred.resolve();
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}
