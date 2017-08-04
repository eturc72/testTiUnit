// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var metadata = require('dw/shop/metadata/product');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Product Recommendations', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            it.eventually('calls product recommendations', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.recommendationsConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.isNotNull(prod.recommendations);

                    it.eventually('calls product recommendations', function(done) {
                        prod.recommendations.getRecommendations(Alloy.CFG.recommendationsConfiguration.prodID).fail(function() {
                            helper.failure();
                        }).done(function() {
                            var rec = prod.recommendations.getRecommendedItems();
                            helper.equals(rec.length, Alloy.CFG.recommendationsConfiguration.recommendationLength);
                        }).always(function() {
                            done();
                        });
                    });
                }).always(function() {
                    done();
                });
            });
        });
    });
};

