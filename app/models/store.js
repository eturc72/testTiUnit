// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/store.js - model definition for store
 *
 * @api public
 */
var ShopAPI = require('dw/shop/index');

var StoreModel = ShopAPI.Store;

var getAddressStringFromAddressDataOrderAndType = require('EAUtils').getAddressStringFromAddressDataOrderAndType;

exports.definition = {
    config : {
        adapter : {
            type : 'ocapi',
            collection_name : 'store'
        },
        superClass : StoreModel,
        model_name : 'store',
        cache : false
    },

    // **extendModel**
    extendModel : function(Model) {

        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * constructDetailedStoreAddress - returns the store detailed address
             * @return {Object}
             */
            constructDetailedStoreAddress : function() {
                var storeAddress = {
                    id : this.getId(),
                    name : this.get('name'),
                    address1 : this.get('address1'),
                    address2 : this.get('address2'),
                    city : this.get('city'),
                    state_code : this.get('stateCode'),
                    country_code : this.get('countryCode'),
                    postal_code : this.get('postalCode'),
                    city_state_postal_code : this.get('city') + ', ' + this.get('state_code') + " " + this.get('postal_code'),
                    phone : this.get('phone'),
                    inventory_id : this.get('inventory_id'),
                    distance : this.get('distance'),
                    distance_unit : this.get('distance_unit'),
                    distance_text : this.getTextualDistance(),
                    email : this.get('email'),
                    fax : this.get('fax'),
                    image : this.get('image'),
                    latitude : this.get('latitude'),
                    longitude : this.get('longitude'),
                    store_hours : this.get('store_hours'),
                    store_events : this.get('store_events')
                };
                if (this.get('address2')) {
                    storeAddress.address2 = this.get('address2');
                }
                return storeAddress;
            },

            /**
             * constructStoreAvailability - returns the store availabiity for a product
             * @return {Object}
             */
            constructStoreAvailability : function() {
                var storeInfo = this.constructDetailedStoreAddress();
                storeInfo = _.extend({
                    availability_message : this.get('availability_message'),
                    availability_color : this.get('availability_color'),
                    availability_stock_level : this.get('availability_stock_level')
                }, storeInfo);

                return storeInfo;
            },

            /**
             * constructStoreAddress - returns the store information
             * @param {Object} id
             * @return {Object}
             */
            constructStoreAddress : function(id) {
                var storeAddress = {
                    first_name : ' ',
                    last_name : this.get('name'),
                    address1 : this.get('address1'),
                    city : this.get('city'),
                    state_code : this.get('stateCode'),
                    country_code : this.get('countryCode'),
                    postal_code : this.get('postalCode'),
                    phone : this.get('phone')
                };
                if (this.get('address2')) {
                    storeAddress.address2 = this.get('address2');
                }
                return storeAddress;
            },

            /**
             * constructStoreAddressForDifferentStorePickup - returns the store information formatted for different store pickup
             * @param {Object} firstName the first name to use for the address (will be customer's first name)
             * @param {Object} lastName the last name to use for the address (will be customer's last name)
             * @return {Object}
             */
            constructStoreAddressForDifferentStorePickup : function(firstName, lastName) {
                var storeAddress = {
                    first_name : firstName,
                    last_name : lastName,
                    address1 : this.get('name'), // the store name
                    address2 : this.get('address1') + (this.get('address2') ? '   ' + this.get('address2') : ''),
                    city : this.get('city'),
                    state_code : this.get('stateCode'),
                    country_code : this.get('countryCode'),
                    postal_code : this.get('postalCode'),
                    phone : this.get('phone')
                };
                return storeAddress;
            },

            /**
             * getAddressDisplay - returns address display based on address form order
             * @return {String}
             */
            getAddressDisplay : function() {
                return getAddressStringFromAddressDataOrderAndType(this.constructStoreAddress(), require(Alloy.CFG.addressform).getAddressOrder(), 'shipping');
            },

            /**
             * getId - returns the id
             * @return {String}
             */
            getId : function() {
                return this._get('id');
            },

            /**
             * getPhone - returns the phone number
             * @return {String}
             */
            getPhone : function() {
                return this._get('phone');
            },

            /**
             * getLatitude - returns the latitude
             * @return {String}
             */
            getLatitude : function() {
                return this._get('latitude');
            },

            /**
             * getLongitude - returns the longitude
             * @return {String}
             */
            getLongitude : function() {
                return this._get('longitude');
            },

            /**
             * getStore - returns the store details
             * @param {Object} storeId
             * @return {Deferred} promise
             */
            getStore : function(storeId) {
                this.set({
                    id : storeId
                });
                return this.fetch();
            },

            /**
             * getInventoryId - returns the inventory id
             * @return {String}
             */
            getInventoryId : function() {
                return this._get('inventory_id') || this._get('c_inventoryListId');
            },

            /**
             * getTextualDistance - get the distance to the store
             * @return {String}
             */
            getTextualDistance : function() {
                var dist = this.get('distance');
                var text = dist + " ";

                switch (this.get('distance_unit')) {
                case 'mi':
                    if (dist == 1) {
                        text += _L('Mile');
                    } else {
                        text += _L('Miles');
                    }
                    break;
                case 'km':
                    if (dist == 1) {
                        text += _L('Kilometer');
                    } else {
                        text += _L('Kilometers');
                    }
                    break;
                default:
                    text += '???';
                    break;
                }
                return text;
            },

            /**
             * setAvailabilityDetails - set the store availability details
             * @param {Object} message
             * @param {Object} color
             * @param {Object} stockLevelMsg
             * @return {Array}
             */
            setAvailabilityDetails : function(message, color, stockLevelMsg) {
                this.set({
                    availability_message : message,
                    availability_color : color,
                    availability_stock_level : stockLevelMsg
                });

            },

            /**
             * setBasketInventoryAvailabilty - set basket availability and unavalable items ids when the basket is not available
             * @param  {Boolean} availability
             * @param  {Array} unavailableItems
             */
            setBasketInventoryAvailabilty : function(availability, unavailableItems) {
                this.set({
                    basket_inventory_available : availability,
                    unavailable_basket_items : unavailableItems || []
                }, {
                    silent : true
                });
            },

            /**
             * isBasketAvailable - return basket_inventory_available
             * @return {Boolean}
             */
            isBasketAvailable : function() {
                return this.get('basket_inventory_available');
            },

            /**
             * getUnavailableBasketItemIdsOnly - return unavailableBasketItem ids
             * @return {Array} array of product ids
             */
            getUnavailableBasketItemIdsOnly : function() {
                var data = [];
                _.each(this.get('unavailable_basket_items'), function(item) {
                    data.push(item.id);
                });
                return data;
            },

            /**
             * getAllUnavailableBasketItems - return unavailable_basket_items property value
             * @return {Array} array of unavailable product item data
             */
            getAllUnavailableBasketItems : function() {
                return this.get('unavailable_basket_items');
            },

            /**
             * setSelected - set selected store
             * @param {Boolean} value
             */
            setSelected : function(value) {
                // this is a custom flag
                this.set({
                    selected : value
                }, {
                    silent : true
                });
            },

            /**
             * isSelected - return selected value
             * @return {Boolean}
             */
            isSelected : function() {
                return (this.get('selected') === true);
            }
        });
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * url - return url for collection
             * @return {String} URL
             */
            url : function() {
                // Loop through Models and gather IDs
                var ids = this.ids || _.pluck(this.models, 'id') || [];
                if (ids.length == 0) {
                    return '/stores';
                }

                return '/stores/(' + ids.join(',') + ')';
            },

            /**
             * queryParams - query params for the url
             * @return {Object} params
             */
            queryParams : function() {
                var params = {
                    country_code : this.country_code || Alloy.Models.storeInfo.getCountryCode(), // two letter ISO country code
                    postal_code : this.postal_code || Alloy.Models.storeInfo.getPostalCode(),
                    max_distance : this.max_distance || Alloy.CFG.store_availability.max_distance_search,
                    distance_unit : this.distance_unit || Alloy.CFG.store_availability.distance_unit // can be 'mi' or 'km' for miles and kilometers
                };
                if (_.isNumber(this.count) && _.isNumber(this.start)) {
                    params.count = this.count;
                    params.start = this.start;
                }
                return params;
            },

            /**
             * parse - parse model results
             * @param {Object} in_json
             * @return {Array}
             */
            parse : function(in_json) {
                if (in_json && ('data' in in_json)) {
                    // from cache
                    return in_json.data;
                } else if (in_json) {
                    // from request
                    return in_json;
                } else {
                    return [];
                }
            },

            /**
             * getAllStores - returns all the stores for the site
             * @return {Deferred} promise
             */
            getAllStores : function() {
                return this.fetch();
            },

            /**
             * getStoresWithPagination - Fetch more stores without resetting the collection if add is true
             * @param  {Object} params - parameters to use for URL
             * @param  {Boolean} add
             * @param  {Boolean} removeCurrentStore
             * @return {Deferred} Promise
             */
            getStoresWithPagination : function(params, add, removeCurrentStore) {
                var deferred = new _.Deferred();
                add = (_.isBoolean(add) ? add : false);
                _.extend(this, (params || {}));

                this.fetch({
                    add : add,
                    update : add,
                    remove : !add,
                    silent : true
                }).done(function(){
                    if(removeCurrentStore){
                        this.filterOutCurrentStore();
                         deferred.resolve();
                    }
                }.bind(this))
                .fail(function(){
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * getNextNStores - get the next n stores from the start
             * @param {Object} start
             * @param {Object} n
             * @return {Object}
             */
            getNextNStores : function(start, n) {
                var end = ((start + n > this.length) ? this.length : start + n);
                return this.models.slice(start, end);
            },

            /**
             * getInventory - returns the inventory details for the store
             * @param {Object} product
             * @param {Object} start
             * @param {Object} count
             * @return {Deferred} promise
             */
            getInventory : function(product, start, count) {
                var stores = this.getNextNStores(start, count);
                var storeInventoryIds = [];
                _.each(stores, function(store) {
                    var inv = store.getInventoryId();
                    if (inv) {
                        storeInventoryIds.push(inv);
                    }
                });

                var v = Alloy.createModel('product', {
                    id : product.getProductId(),
                    expand : 'availability',
                    inventory_ids : storeInventoryIds
                });

                var promise = v.fetch({
                    cache : false
                });

                promise.done(function(model) {
                    product.set({
                        inventory : model._get('inventory'),
                        inventories : model._get('inventories'),
                    }, {
                        silent : true
                    });
                });
                return promise;
            },

            /**
             * getAllInventoryIds - get store inventory ids for all stores
             * @return {Array}
             */
            getAllInventoryIds : function() {
                var storeInventoryIds = [];
                this.each(function(store) {
                    var inv = store.getInventoryId();
                    if (inv) {
                        storeInventoryIds.push(inv);
                    }
                });
                return storeInventoryIds;
            },

            /**
             * getInventoryIdsByStartEndIndex - get store inventory ids for all stores
             * @param {Number} start
             * @param {Number} end
             * @return {Array}
             */
            getInventoryIdsByStartEndIndex : function(start, end) {
                return this.getAllInventoryIds().splice(start, end);
            },

            /**
             * getStoreByInventoryId - return store based on inventory id
             * @param  {String} inventoryId
             * @return {Object}  Model
             */
            getStoreByInventoryId : function(inventoryId) {
                return this.find(function(store) {
                    return store.getInventoryId() === inventoryId;
                });
            },

            /**
             * setBasketInventoryAvailabilty - Check basket availabity by store
             * @param  {Object} basketItemsCollection - Backbone collection
             * @param  {Number} start - First store index in collection
             * @param  {Number} end  - End store index in collection
             */
            setBasketInventoryAvailabilty : function(basketItemsCollection, start, end) {
                if (_.isNumber(start) && _.isNumber(end)) {
                    for (var idx = start; idx <= end; idx++) {
                        var store = this.at(idx);
                        if (store) {
                            store.setBasketInventoryAvailabilty(basketItemsCollection.checkAvailabilityInStoreInventory(store.getInventoryId()), basketItemsCollection.getUnavailableItems(store.getInventoryId()));
                        }
                    }
                } else {
                    this.each(function(store) {
                        store.setBasketInventoryAvailabilty(basketItemsCollection.checkAvailabilityInStoreInventory(store.getInventoryId()), basketItemsCollection.getUnavailableItems(store.getInventoryId()));
                    });
                }
                this.trigger('change');
            },

            /**
             * setSelectedStore - set selected store
             * @param {Number} index - index of selected store
             */
            setSelectedStore : function(index) {
                this.each(function(store, idx) {
                    if (idx === index) {
                        store.setSelected(true);
                    } else {
                        store.setSelected(false);
                    }
                });
            },

            /**
             * getSelectedStore - return selected store model
             * @return {Object}
             */
            getSelectedStore : function() {
                return this.find(function(store) {
                    return store.isSelected() === true;
                });
            },

            /**
             * getAllIds - return all Ids
             * @return {Array}
             */
            getAllIds : function() {
                return this.pluck('id');
            },

            /**
             * filterOutCurrentStore - filter out the current sotre from the list
             */
            filterOutCurrentStore: function(){
                this.remove(Alloy.Models.storeInfo.getId(), {silent:true});
            }
        });
        return Collection;
    }
};
