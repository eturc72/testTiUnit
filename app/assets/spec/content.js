// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var th = require('testhelper');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Content Model', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            it.eventually('fetches about-us content', function(done) {
                var aboutus = th.newContentModel('about-us');
                aboutus.fetch().fail(function() {
                    th.failure();
                }).done(function() {
                    th.equals(aboutus.get('name'), 'About Us');
                }).always(function() {
                    done();
                });
            });
        });
    });
};
