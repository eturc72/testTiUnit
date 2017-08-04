// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/product.js - model definition for product
 *
 * @api public
 */

var ShopAPI = require('dw/shop/index');

var ProductModel = ShopAPI.Product;

exports.definition = {
    config : {
        adapter : {
            type : 'ocapi',
            collection_name : 'product'
        },
        superClass : ProductModel,
        model_name : 'product',
        cache : true
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getInventoryAvailability - Gets the inventory messaging for the product
             * Call getInventory prior to calling this
             * @param {Object} model - contains product and inventory information
             * @param {Object} inventoryListId optional id to get inventory from inventory list
             * @return {Object}
             */
            getInventoryAvailability : function(model, inventoryListId) {
                var that = this;
                if (model) {
                    that = model;
                }
                var msg = '',
                    levels = {},
                    quantity = this.get('quantity') || 1,
                    msgs = [];

                var inventory = null;
                if (inventoryListId) {
                    inventory = _.where(that.get('inventories').models, {
                        id : inventoryListId
                    }, true);
                    // find the first match
                } else {
                    inventory = that.get('inventory');
                }

                var isPerpetual = inventory && inventory.get('ats') == 999999;
                var type = that.get('type');

                if (isPerpetual) {
                    msg = _L('In Stock');
                    levels = {
                        stockLevel : 999999
                    };
                } else if ((type && type.get('master')) || !inventory) {
                    if (this.hasConfiguredVariant() && !this.hasSelectedVariant()) {
                        msg = _L('Invalid Attribute Combination');
                        levels.notAvailable = quantity;
                    } else {
                        msg = '';
                    }
                } else if ((type && type.get('set')) || !inventory) {
                    msg = '';
                } else {
                    var stockLevel = inventory.get('stock_level');
                    var preorderable = inventory.get('preorderable');
                    var backorderable = inventory.get('backorderable');
                    var allocation = inventory.get('ats') - stockLevel;
                    var inStockDate = inventory.get('in_stock_date');

                    levels = {
                        inStock : quantity <= stockLevel ? quantity : stockLevel,
                        stockLevel : stockLevel,
                        preorder : 0,
                        backorder : 0,
                        notAvailable : 0
                    };
                    var quantityLeft = quantity <= stockLevel ? 0 : quantity - stockLevel;
                    if (quantityLeft && preorderable) {
                        if (quantityLeft <= allocation) {
                            levels.preorder = quantityLeft;
                            quantityLeft = 0;
                        } else {
                            levels.preorder = allocation;
                            quantityLeft -= allocation;
                        }
                    }
                    if (quantityLeft && backorderable) {
                        if (quantityLeft <= allocation) {
                            levels.backorder = quantityLeft;
                            quantityLeft = 0;
                        } else {
                            levels.backorder = allocation;
                            quantityLeft -= allocation;
                        }
                    }
                    levels.notAvailable = quantityLeft;

                    // Construct message
                    if (levels.inStock > 0) {
                        if (levels.inStock == quantity) {
                            msgs.push(_L('In Stock'));
                        } else {
                            msgs.push(String.format(_L('%d Item(s) In Stock.'), levels.inStock));
                        }
                    }

                    if (levels.preorder > 0) {
                        if (levels.preorder == quantity) {
                            msgs.push(_L('Pre-Order'));
                        } else if (levels.notAvailable == 0) {
                            msgs.push(_L('The remaining items are available for pre-order.'));
                        } else {
                            msgs.push(String.format(_L('%d item(s) are available for pre-order.'), levels.preorder));
                        }
                    }

                    if (levels.backorder > 0) {
                        if (levels.backorder == quantity) {
                            msgs.push(_L('Back Order'));
                        } else if (levels.notAvailable == 0) {
                            msgs.push(_L('The remaining items are available on back order.'));
                        } else {
                            msgs.push(String.format(_L('Back Order %d item(s).'), levels.backorder));
                        }
                    }

                    if (levels.notAvailable > 0) {
                        if (levels.notAvailable == quantity) {
                            msgs.push(_L('This item is currently not available.'));
                        } else {
                            msgs.push(_L('The remaining items are currently not available. Please adjust the quantity.'));
                        }
                    }

                    if (inStockDate && levels.inStock < quantity) {
                        var moment = require('alloy/moment');
                        msgs.push(String.format(_L('The expected in-stock date is %s.'), moment(inStockDate).format('l')));
                        // localized format MM/dd/YYYY or dd/MM/YYYY
                    }
                    msg = msgs.join('\n');
                }

                return {
                    message : msg,
                    levels : levels
                };
            },

            /**
             * checkAvailabilityInStoreInventory - return true if all products are in the specified inventory
             * @param  {String} storeInventoryId
             * @return {Boolean}
             */
            checkAvailabilityInStoreInventory : function(storeInventoryId) {

                if (this.get('inventories')) {
                    var inventory = this.get('inventories').get(storeInventoryId);
                    if (inventory) {
                        if (inventory.get('stock_level') === 0 || inventory.get('stock_level') < this.get('quantity') || !inventory.get('orderable')) {
                            return false;
                        }
                        return true;
                    }
                }

                return false;
            },

            /**
             * checkAvailabilityInStoreInventory - return stock_level for inventory with id specified storeInventoryId
             * @param  {String} storeInventoryId
             * @return {Number}
             */
            getStockLevelByStoreInventoryId : function(storeInventoryId) {
                if (this.get('inventories') && this.get('inventories').get(storeInventoryId)) {
                    return this.get('inventories').get(storeInventoryId).get('stock_level');
                }

                return null;
            },

            /**
             * getPreviouslySetQuantity - return the previously set quantity property - (This is a client only custom property)
             * @return {Number}
             */
            getPreviouslySetQuantity : function() {
                return this.get('quantity');
            }
            
            
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * url - the url for collection
             * @return {String} url
             */
            url : function() {
                // Loop through Models and gather IDs
                var ids = this.ids || _.pluck(this.models, 'id') || [];

                // encode each id
                ids = _.map(ids, function(id) {
                    return encodeURIComponent(id);
                });

                return '/products/(' + ids.join(',') + ')';
            },

            /**
             * fetchModels - fetch the model for the product
             * @param {Object} options  query
             * @param {Object} inventoriesAndProductIds  product ids, and inventory ids
             * @return {Deferred} promise
             */
            fetchModels : function(options, inventoriesAndProductIds) {
                options = options || {};
                if (_.isObject(inventoriesAndProductIds) && inventoriesAndProductIds.ids && inventoriesAndProductIds.inventory_ids) {
                    _.extend(this, inventoriesAndProductIds);
                    _.extend(options, {
                        cache : false
                    });
                }
                return this.fetch(options);
            },

            /**
             * setIds : set the id of the product
             * @param {String} id
             */
            setIds : function(ids) {
                this.ids = ids;
            },

            /**
             * queryParams - returns the the params required for the request
             * @return {Object}
             */
            queryParams : function() {
                var defaultExpand = Alloy.CFG.product.default_expand || 'variations,availability,images,prices,options,promotions,set_products,bundled_products';
                if (this.inventory_ids) {
                    return {
                        expand : defaultExpand,
                        inventory_ids : this.inventory_ids.join(',')
                    };
                } else {
                    return {
                        expand : defaultExpand
                    };
                }
            },

            /**
             * setQuantities - set quantity for all products - (This is a client only custom property)
             * @param  {Array} qData
             *
             */
            setQuantities : function(qData) {
                if (_.isArray(qData)) {
                    _.each(qData, function(productQ) {
                        var prod = this.get(productQ.id);
                        if (prod) {
                            prod.set({
                                quantity : productQ.quantity
                            }, {
                                silent : true
                            });
                        }
                    }.bind(this));
                }
            },

            /**
             * checkAvailabilityInStoreInventory - check availability in the specified inventory
             * @param  {String} inventoryId
             * @return {Boolean}
             */
            checkAvailabilityInStoreInventory : function(inventoryId) {
                if (!inventoryId) {
                    return false;
                }
                var avail = true;
                this.each(function(prod) {
                    avail = avail && prod.checkAvailabilityInStoreInventory(inventoryId);
                });
                return avail;
            },

            /**
             * getUnavailableItems - return unavailable products in the specified invetory
             * @param {String} inventoryId
             * @return {Array}
             */
            getUnavailableItems : function(inventoryId) {
                var ids = [];
                if (inventoryId) {
                    this.each(function(prod) {
                        if (!prod.checkAvailabilityInStoreInventory(inventoryId)) {
                            ids.push({
                                id : prod.getId(),
                                stock_level : prod.getStockLevelByStoreInventoryId(inventoryId)
                            });
                        }
                    });
                }
                return ids;
            }
        });
        return Collection;
    }
};

var mixinImageServiceMethods = require('imageServiceMethods');
mixinImageServiceMethods(ProductModel);

var variationAttributeValue = ProductModel.prototype.modelHash['variation_attribute'].prototype.modelHash['variation_attribute_value'];
mixinImageServiceMethods(variationAttributeValue);
