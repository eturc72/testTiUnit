// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Customer Search Model', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            it.eventually('customer search', function(done) {
                var customers = Alloy.Collections.customer;
                customers.fetch({
                    attrs : {
                        email : Alloy.CFG.modelTestsConfiguration.emailAddress,
                        firstname : Alloy.CFG.customerInfoConfiguration.firstName,
                        lastname : Alloy.CFG.customerInfoConfiguration.lastName
                    }
                }).fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(customers.models.length, 0);
                    baskethelper.logoutAssociate(associate, function() {
                    });
                }).always(function() {
                    done();
                });
            });
        });
    });
};
