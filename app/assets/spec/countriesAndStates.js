// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var baskethelper = require('spec/baskethelper');

describe('Country and State Retrieval', function() {

    var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
    var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
    baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
        expect(associate.isLoggedIn()).toBe(true);

        // should log out to start tests
        var countries = Alloy.createModel('storeCountries');

        it.eventually('should get the list of countries', function(countryRetrievalComplete) {
            var callback = countryRetrievalComplete;
            countries.fetch().done(function() {

                var theseCountries = countries.get('countries');
                expect(theseCountries.length).toBe(3);
                callback();

                // test a single customer by email
                var caStates = Alloy.createModel('storeStates');
                it.eventually('should get the list of states in Canada', function(statesRetrievalComplete) {
                    var callback = statesRetrievalComplete;

                    caStates.getStates({
                        country : 'CA'
                    }).fail(function() {
                        expect(true).toBe(false);
                        callback();
                    }).done(function() {
                        var theseStates = caStates.get('states');
                        expect(theseStates.length).toBe(13);
                        callback();
                    });
                });

            });
        });
    });
});
