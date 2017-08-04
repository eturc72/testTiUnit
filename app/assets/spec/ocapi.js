// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var baskethelper = require('spec/baskethelper');

describe('Category Model', function() {
    var associateId = '0176321';
    var associatePasscode = '174821';
    baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
        expect(associate.isLoggedIn()).toBe(true);
        it.eventually('fetches the root category', function(done) {
            var callback = done;
            var rootCat = Alloy.createModel('category', {
                id : 'root'
            });
            rootCat.fetch().fail(function() {
                expect(false).toBe(true);
                callback();
            }).done(function() {
                var name = rootCat.get('name');
                expect(name).toBe('Storefront Catalog - EN');
                callback();
            });
        });

        it.eventually('category acts as deferred (done)', function(done) {
            var callback = done;
            var rootCat = Alloy.createModel('category', {
                id : 'root'
            });
            rootCat.fetch().fail(function() {
                expect(false).toBe(true);
                callback();
            }).done(function() {
                var name = rootCat.get('name');
                expect(name).toBe('Storefront Catalog - EN');
                callback();
            });
        });

        it.eventually('array of categories acts as deferred (_.when)', function(done) {
            var callback = done,
                mensCat = Alloy.createModel('category', {
                id : 'mens'
            });
            var rootCat = Alloy.createModel('category', {
                id : 'root'
            });

            _.when([rootCat.fetch(), mensCat.fetch()]).fail(function() {
                expect(false).toBe(true);
                callback();
            }).done(function() {
                var name = rootCat.get('name');
                var name2 = mensCat.get('name');
                expect(name).toBe('Storefront Catalog - EN');
                callback();

                it('should know the second category too', function() {
                    expect(name2).toBe('Mens');
                });
            });
        });

        it.eventually('fetches the root category with 6 subcategories', function(done) {
            var callback = done;
            var rootCat = Alloy.createModel('category', {
                id : 'root'
            });

            rootCat.fetch().fail(function() {
                expect(false).toBe(true);
                callback();
            }).done(function() {
                var subcats = rootCat.get('categories');
                expect(subcats.length).toBe(6);
                callback();
            });
        });

        it.eventually('fetches the root category with 2 levels of subcategories', function(done) {
            var callback = done;
            var rootCat = Alloy.createModel('category', {
                id : 'root'
            });
            rootCat.fetch().fail(function() {
                expect(false).toBe(true);
                callback();
            }).done(function() {
                var subcats = rootCat.get('categories');
                var subsubcats = rootCat.get('categories[0].categories');
                expect(subsubcats.at(0).get('id')).toBe('newarrivals-womens');
                callback();
            });
        });
    });
});
