// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 * Test Suite:
 * 1. Login as Associate
 * 2. Search for customer with invalid email
 * 3. search for customer with invalid first nad last names
 * 4. Logout Associate
 */

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
var invalidEmail = '*!@demandware.com';
var firstName = '*!';
var lastName = '!*@';

exports.define = function() {
    describe('Invalid Customer search results test', function() {
        it.eventually('Invalid customer search', function(done) {

            baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, true, function(associate) {
                expect(associate.isLoggedIn()).toBe(true);

                var def = invalidCustomerSearchResultsByEmail(invalidEmail, def);
                def = invalidCustomerSearchResultsByFirstAndLastName(firstName, lastName, def);
                baskethelper.logoutAssociatePromise(associate, def);
            });
        });
    });
};

// Search for customer by invalid email id
function invalidCustomerSearchResultsByEmail(invalidEmail, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('customer search by invalid email id', function(done) {
            var customers = Alloy.Collections.customer;
            customers.fetch({
                attrs : {
                    email : invalidEmail,
                    firstname : '',
                    lastname : ''
                }
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customers.models.length, 0);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// Search for customer by first and last name
function invalidCustomerSearchResultsByFirstAndLastName(firstName, lastName, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('customer search by invalid first and last name', function(done) {
            var customers = Alloy.Collections.customer;
            customers.fetch({
                attrs : {
                    email : '',
                    firstname : firstName,
                    lastname : lastName
                }
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customers.models.length, 0);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}
