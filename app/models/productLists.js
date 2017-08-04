// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/productLists.js - model definition for product lists
 *
 * @api public
 */

/**
 * queryParams - returns the the params required for the request
 * @return {Object}
 */
function queryParams() {
    var params = _.extend({
        email : this.customer.getEmail()
    }, this.requestParamObj);
    delete this.requestParamObj;
    return params;
}

/**
 * ItemCRUDModel - Single product list item model class for creating, reading, updating and deleting product list item
 */
var ItemCRUDModel = Backbone.Model.extend({
    config : {
        secure : true,
        model_name : 'CRUDProductListItem',
        cache : false
    },

    /**
     * hasFlash - return true is property flash exists, false otherwise
     * @return {Boolean}
     */
    hasFlash : function() {
        return this.has('_flash');
    },

    /**
     * hasFault - return true is property flash exists, false otherwise
     * @return {Boolean}
     */
    hasFault : function() {
        return this.has('fault');
    }
});

exports.definition = {
    config : {
        model_name : 'productLists',
        adapter : {
            type : 'ocapi',
            collection_name : 'productLists'
        },

    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/product_lists',

            relations : [{
                type : Backbone.Many,
                key : 'customer_product_list_items',
                relatedModel : require('alloy/models/' + ucfirst('productListItems')).Model
            }],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getId - return product list id
             * @return {String}
             */
            getId : function() {
                return this.get('id');
            },

            /**
             * getName - return product list name
             * @return {String}
             */
            getName : function() {
                return this.get('name');
            },

            /**
             * getTitle - return product list name
             * @return {String}
             */
            getTitle : function() {
                return this.get('title');
            },

            /**
             * getType - return product list type
             * @return {String}
             */
            getType : function() {
                return this.get('type');
            },

            /**
             * isPublic - return product list public property
             * @return {Boolean}
             */
            isPublic : function() {
                this.get('public');
            },

            /**
             * getLink - return link to product list
             * @return {String}
             */
            getLink : function() {
                return this.get('link');
            },

            /**
             * getListItems - returns the items in the product list
             * @return {String}
             */
            getListItems : function() {
                return this.get('items');
            },

            /**
             * deleteItem - delete a product from product list
             * @param {String} customerId - the id of the customer
             * @param {String} listId - the id of the product list
             * @param {String} itemId - the item to remove
             * @param {Object} opt - other options to add to request
             * @return {Deferred} promise
             */
            deleteItem : function(customerId, listId, itemId, opt) {
                var deferred = new _.Deferred();
                var self = this;

                var url = '/customers/' + customerId + this.urlRoot + '/' + listId + '/items/' + itemId;
                var itemDelete = new ItemCRUDModel();
                var onSuccess = function(response) {
                    itemDelete.set(response);
                };
                var options = _.extend({}, {
                    success : onSuccess,
                    error : onSuccess
                }, opt);

                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'DELETE',
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    self.apiCall(itemDelete, params, options).done(function() {
                        if (itemDelete.hasFlash()) {
                            deferred.reject(itemDelete);
                        } else {
                            var responseOptions = {
                                delete : true,
                                update : false
                            };
                            var list = self.get('items');
                            var item = list.where({
                                id : itemId
                            });
                            list.remove(item);
                            self.trigger('item:deleted');
                            deferred.resolve(itemDelete, responseOptions);
                        }

                    }).fail(function() {
                        deferred.reject(itemDelete);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * addItem - add product to product list
             * @param {String} customerId - the id of the customer
             * @param {String} listId - product list Id
             * @param {Object} product - must contain product_id and quantity properties
             * @param {Object} opt - other options to add to request
             * @return {Deferred} promise
             */
            addItem : function(customerId, listId, product, opt) {
                var deferred = new _.Deferred();
                var self = this;
                var itemAdd = new ItemCRUDModel();
                var onSuccess = function(response) {
                    itemAdd.set(response);
                };
                var options = _.extend({}, {
                    success : onSuccess,
                    error : onSuccess,
                    dontincludeid : true
                }, opt);

                var data = {
                    type : 'product',
                    quantity : product.quantity || 1,
                    priority : 1,
                    public : true,
                    product_id : product.product_id
                };
                data = JSON.stringify(data);

                var url = '/customers/' + customerId + this.urlRoot + '/' + listId + '/items';
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : data,
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    self.apiCall(itemAdd, params, options).done(function() {
                        if (itemAdd.hasFlash()) {//product already exist, so update it
                            self.updateItem(customerId, product, listId, itemAdd.get('id')).done(function(model, options) {
                                deferred.resolve(model, options);
                            }).fail(function(model) {
                                deferred.reject(model);
                            });
                        } else {
                            var responseOptions = {
                                update : false
                            };
                            itemAdd.set('product_name', itemAdd.get('product_details_link').title);
                            var item = Alloy.createModel('productListItems', itemAdd.toJSON());
                            var list = self.get('items');
                            list.add(item);
                            deferred.resolve(item, responseOptions);
                            self.trigger('item:added');
                        }

                    }).fail(function() {
                        deferred.reject(itemAdd);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * updateItem - update item in product list
             * @param {String} customerId - the id of the customer
             * @param {Object} product - must contain product_id and quantity properties
             * @param {String} listId - product list Id
             * @param {String} itemId - id of item to be updated
             * @param {Object} opt - other options to add to request
             * @return {Deferred} promise
             */
            updateItem : function(customerId, product, listId, itemId, opt) {
                var deferred = new _.Deferred();
                var self = this;
                var itemUpdate = new ItemCRUDModel();
                var onSuccess = function(response) {
                    itemUpdate.set(response);
                };
                var options = _.extend({}, {
                    success : onSuccess,
                    error : onSuccess
                }, opt);
                data = {
                    type : 'product',
                    quantity : product.quantity || 1,
                    priority : 1,
                    public : true,
                    product_id : product.product_id
                };
                data = JSON.stringify(data);
                var url = '/customers/' + customerId + this.urlRoot + '/' + listId + '/items/' + itemId;
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : data,
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    self.apiCall(itemUpdate, params, options).done(function() {
                        if (itemUpdate.hasFlash()) {
                            deferred.reject(itemUpdate);
                        } else {
                            var responseOptions = {
                                update : true
                            };
                            var list = self.get('items');
                            var item = list.where({id:itemId})[0];
                            itemUpdate.set('product_name', itemUpdate.get('product_details_link').title);
                            item.set(itemUpdate.toJSON());
                            self.trigger('item:updated');
                            deferred.resolve(item, responseOptions);
                        }
                    }).fail(function() {
                        deferred.reject(itemUpdate);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },
        });

        return Model;
    },

    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/product_lists',
            queryParams : queryParams,

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * initialize - instantiate a productListItems collection that will hold all the items in a certain list and attach it to this collection
             */
            initialize : function() {
                this.mail = Alloy.createModel('emailProductList');
            },

            /**
             * setCustomer - set the customer details
             * @param {Object} customer
             */
            setCustomer : function(customer) {
                this.customer = customer;
            },

            /**
             * customerLoggedIn - checks if the customer is logged in
             * @return {Boolean}
             */
            customerLoggedIn : function() {
                return this.customer ? this.customer.isLoggedIn() : false;
            },

            /**
             * getCount - return total number of lists
             * @return {Number}
             */
            getCount : function() {
                return this.length;
            },

            /**
             * getTotal - return total number of lists
             * @return {Number}
             */
            getTotal : function() {
                return this.length;
            },

            /**
             * getAllTitles - return name of each list in the collection
             * @return {Array}
             */
            getAllTitles : function() {
                return this.pluck('title');
            },

            /**
             * getAllNames - return name of each list in the collection
             * @return {Array}
             */
            getAllNames : function() {
                return this.pluck('name');
            },

            /**
             * getAllLinks - return link to of each list in the collection
             * @return {Array}
             */
            getAllLinks : function() {
                return this.pluck('link');
            },

            /**
             * getAllIds - return id of each list in the collection
             * @return {Array}
             */
            getAllIds : function() {
                var ids = [];
                this.each(function(model) {
                    ids.push(model.getId());
                });
                return ids;
            },

            /**
             * getAllWishLists - return all list models of type wish_list
             * @return {Array}
             */
            getAllWishLists : function() {
                return this.where({
                    type : 'wish_list'
                });
            },

            /**
             * getWishListCount - return number of wish list
             * @return {Number}
             */
            getWishListCount : function() {
                return this.where({
                    type : 'wish_list'
                }).length;
            },

            /**
             * getAllShoppingLists - return all list models of type shopping_list
             * @return {Array}
             */
            getAllShoppingLists : function() {
                return this.where({
                    type : 'shopping_list'
                });
            },

            /**
             * getAllGiftRegistries - return all list models of type gift_registry
             * @return {Array}
             */
            getAllGiftRegistries : function() {
                return this.where({
                    type : 'gift_registry'
                });
            },

            /**
             * getListsByType - return all list models of type passed in the argument
             * @return {Array}
             */
            getListsByType : function(type) {
                if (type) {
                    return this.where({
                        type : type
                    });
                }
                return [];
            },

            /**
             * getSelectorObjects - return all lists ids and names
             * @return {Array}
             */
            getSelectorObjects : function() {
                var obj = [];
                this.each(function(model) {
                    obj.push({
                        listId : model.getId(),
                        listName : model.getName()
                    });
                });
                return obj;
            },

            /**
             * getWishListSelectorObjects - return all wish lists ids and names
             * @return {Array}
             */
            getWishListSelectorObjects : function() {
                var obj = [];
                this.each(function(model) {
                    if (model.getType() == 'wish_list') {
                        obj.push({
                            wishListId : model.getId(),
                            wishListName : model.getName() ? model.getName() : _L('Wish List Title')
                        });
                    }
                });
                return obj;
            },

            /**
             * getFirstWishListId - return the first wish list id, null otherwise
             * @return {String}
             */
            getFirstWishListId : function() {
                var firstWishList = this.where({
                    type : 'wish_list'
                });
                if (firstWishList.length > 0) {
                    return firstWishList[0].getId();
                }
                return null;
            },

            /**
             * getListNameById - return the name of the product list based on the id provided, null otherwise
             * @return {String}
             */
            getListNameById : function(listId) {
                var data = this.where({
                    id : listId
                });
                if (data.length > 0) {
                    return data[0].getName();
                }
                return null;
            },

            /**
             * getListById - get the product list with the given list id
             * @return {ProductList}
             */
            getListById : function(id) {
                var lists = this.where({
                    id : id
                });
                if (lists.length > 0) {
                    return lists[0];
                }
                return null;
            },

            /**
             * getListItems - get the product list items for a given product list
             * @return {Collection}
             */
            getListItems : function(id) {
                var list = this.getListById(id);
                if (list) {
                    return list.getListItems();
                } else {
                    return null;
                }
            },

            /**
             * getTotalQuantity - return total quantity of items in the colection
             * @return {Number}
             */
            getTotalQuantity : function() {
                var total = 0;
                this.each(function(model) {
                    _.each(model.get('items').models, function(list) {
                        total += list.getQuantity();
                    });
                });
                return total;
            },

            /**
             * addItem - add an item to a wish list
             * @return {Promise}
             */
            addItem : function(wishListId, product) {
                var list = this.getListById(wishListId);
                var self = this;
                var deferred = new _.Deferred();
                if (this.customerLoggedIn()) {
                    var promise = list.addItem(this.customer.getCustomerId(), wishListId, product);
                    promise.done(function(newItem, options) {
                        self.trigger('reset');
                        deferred.resolve(newItem, options);
                    }).fail(function() {
                        deferred.reject();
                    });
                } else {
                    deferred.reject();
                }
                return deferred.promise();
            },

            /**
             * deleteItem - delete an item from a wish list
             * @return {Promise}
             */
            deleteItem : function(listId, productId) {
                var list = this.getListById(listId);
                var self = this;
                var promise = list.deleteItem(this.customer.getCustomerId(), listId, productId);
                promise.done(function(newList) {
                    self.trigger('reset');
                });
                return promise;
            },

            /**
             * parse - parse array response (mainly for placing the id property on each model since it is not added by ocapi)
             * @return {Array}
             */
            parse : function(collection) {
                var parsedData = [];
                var self = this;
                if (collection && collection.length > 0) {
                    _.each(collection, function(list) {
                        var link = list.items_link.link.split('/');
                        link = link[link.length - 1].split('?');
                        link = link[0];
                        if (!list.name) {
                            list.name = _L('Wish List Title');
                        }
                        // list.id = link;
                        var items = Alloy.createCollection('productListItems');
                        items.reset(self.parseProductListItems(list.customer_product_list_items));
                        list.items = items;
                        if (list.type == 'wish_list') {
                            if (Alloy.CFG.show_private_wish_list) {
                                parsedData.push(list);
                            } else if (!Alloy.CFG.show_private_wish_list && list.public == true) {
                                parsedData.push(list);
                            }
                        } else {
                            parsedData.push(list);
                        }

                    });
                }
                return parsedData;
            },

            /**
             * parseProductListItems - parse the product list items within a product list
             * @return {Array}
             */
            parseProductListItems : function(collection) {
                var parsedData = [];
                if (collection && collection.length > 0) {
                    _.each(collection, function(item) {
                        if (item.product_details_link) {
                            item.product_name = item.product_details_link.title;
                            if (Alloy.CFG.show_private_product_list_item) {
                                parsedData.push(item);
                            } else if (!Alloy.CFG.show_private_product_list_item && item.public == true) {
                                parsedData.push(item);
                            }
                        }
                    });
                }
                parsedData.reverse();
                return parsedData;
            },

            /**
             * getCollection - fetch product list collection
             * @param {Object} currentCustomer
             * @return {Deferred} promise
             */
            getCollection : function(currentCustomer) {
                var deferred = new _.Deferred();
                var self = this;
                if ((currentCustomer && currentCustomer.isLoggedIn()) || this.customerLoggedIn()) {
                    this.customer = currentCustomer;
                    this.url = '/customers/' + currentCustomer.getCustomerId() + this.urlRoot;
                    Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                        self.authorization = 'Bearer ' + Alloy.Models.authorizationToken.getToken();
                        self.fetch().done(function() {
                            deferred.resolve();
                        }).fail(function(model) {
                            deferred.reject();
                        });
                    }).fail(function() {
                        deferred.reject();
                    });
                } else {
                    deferred.reject();
                }
                return deferred.promise();
            },

            /**
             * clearData - clear collection data and subsequent dependent models and collections
             */
            clearData : function() {
                this.reset();
                this.id = null;
            }
        });

        return Collection;
    }
};
