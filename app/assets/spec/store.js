// ©2017 salesforce.com, inc. All rights reserved.

/**
 *
 * Test Suite:
 * 1. Login as Associate
 * 2. fetch nearest stores
 * 3. Check total number of stores returned by the server based on our specification and on the fact that we filter out the current store we are in
 * 4. Check if first closest store is the one specified
 * 5. fetch products based on specified ids and inventory ids
 * 6. Set product availabilities details on all stores
 * 7. Check unavailable item id and in store stock level on the first closest store
 * 8. Fetch more stores
 * 9. Check the new total number of stores
 * 10. Select store
 * 11. Get selected store and check if it was the one selected previously
 */

//Setup module to run Behave tests
var behave = require('behave').andSetup(this);
var helper = require('testhelper');
var metadata = require('dw/shop/metadata/product');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Store Model/Collection', function() {
        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);

            //test store collection methods used with click and collect feature
            it.eventually('calls getStoresWithPagination, setBasketInventoryAvailabilty, getAllUnavailableBasketItems, \n getInventoryIdsByStartEndIndex, setSelectedStore and getSelectedStore on store collection', function(done) {
                var storeCollection = helper.newStoreCollection();
                var reqBody = {
                    ids : [],
                    country_code : Alloy.CFG.storeConfigurations.country_code,
                    postal_code : Alloy.CFG.storeConfigurations.postal_code,
                    max_distance : Alloy.CFG.storeConfigurations.max_distance,
                    count : Alloy.CFG.storeConfigurations.pagination_step,
                    start : 0
                };
                storeCollection.getStoresWithPagination(reqBody, false, true).then(function() {
                    helper.equals(storeCollection.length, 4);
                    helper.equals(storeCollection.at(0).getId(), Alloy.CFG.storeConfigurations.closest_store_id);
                    return fetchProducts(storeCollection.getInventoryIdsByStartEndIndex(storeCollection.start, (storeCollection.start - 1 + storeCollection.count)));
                }).then(function(products) {

                    storeCollection.setBasketInventoryAvailabilty(products, storeCollection.start, (storeCollection.start - 1 + storeCollection.count));
                    var unavailableItems = storeCollection.at(0).getAllUnavailableBasketItems();
                    helper.equals(unavailableItems.length, 1);
                    if (unavailableItems.length > 0) {
                        helper.equals(unavailableItems[0].id, Alloy.CFG.storeConfigurations.unavailable_item_id);
                        helper.equals(unavailableItems[0].stock_level, Alloy.CFG.storeConfigurations.unavailable_item_stock_level);
                    }
                    reqBody.start = storeCollection.length;
                    return storeCollection.getStoresWithPagination(reqBody, true, true);

                }).then(function() {
                    helper.equals(storeCollection.length, 8);
                    storeCollection.setSelectedStore(1);
                    helper.equals(storeCollection.getSelectedStore(1).getId(), storeCollection.at(1).getId());
                }).fail(function() {
                    helper.failure();
                }).always(function() {
                    done();
                });

            });
        });
    });
};

/**
 * fetchProducts - make server call to fetch product ids specified in specified inventory
 * @param {String} inventoryIds
 * @return {Object} promise
 *
 */
function fetchProducts(inventoryIds) {
    var deferred = new _.Deferred();
    var prodCollection = helper.newProductCollection();
    prodCollection.fetchModels(null, {
        ids : Alloy.CFG.productConfiguration.prodIDs,
        inventory_ids : inventoryIds
    }).fail(function() {
        deferred.reject();
    }).done(function() {
        prodCollection.setQuantities(Alloy.CFG.productConfiguration.quantities);
        deferred.resolve(prodCollection);
    });
    return deferred.promise();
}
