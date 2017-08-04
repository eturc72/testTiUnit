// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
var behave = require('behave').andSetup(this);
var helper = require('testhelper');
var metadata = require('dw/shop/metadata/category');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Category Model', function() {

        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            // test all the dynamically generated functions for category model
            it.eventually('executes tests for all dynamically created functions for category model', function(done) {
                var cat = helper.newCategoryModel('root');
                cat.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.runDynamicMethodTestsForChildObject(metadata, cat);
                }).always(function() {
                    done();
                });
            });

        });
    });
};
