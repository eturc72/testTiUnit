// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * models/baskets.js - model definition for baskets
 *
 * @api public
 */

var logger = require('logging')('models:baskets', 'app/models/baskets');

/**
 * addSuccessCallback - success callback for requests to server
 *
 * @params {Object} options
 * @params {Object} basket
 * @params {Object} toRestore
 * @api public
 */
function addSuccessCallback(options, basket, toRestore) {
    var success = options.success;
    var checkoutStatus = basket.getCheckoutStatus();
    var lastCheckoutStatus = basket.getLastCheckoutStatus();
    var enableCheckout = basket.canEnableCheckout();
    var shipToStore = basket.getShipToStore();
    var differentStorePickup = basket.getDifferentStorePickup();
    var differentStorePickupMessage = basket.getDifferentStorePickupMessage();

    /**
     * success function to call after request
     */
    options.success = function(model, resp, options) {
        if (model.etag) {
            // Update Basket Etag
            basket.etag = model.etag;
        }
        basket.clear({
            silent : true
        });
        if (!model.set(basket.parse(resp, options), options)) {
            return false;
        }
        if (!basket.set(basket.parse(resp, options), options)) {
            return false;
        }
        basket.set('checkout_status', checkoutStatus, {
            silent : true
        });
        basket.set('last_checkout_status', lastCheckoutStatus, {
            silent : true
        });
        if (enableCheckout != undefined) {
            basket.set('enable_checkout', enableCheckout, {
                silent : true
            });
        }
        basket.set('ship_to_store', shipToStore, {
            silent : true
        });
        basket.set('different_store_pickup', differentStorePickup, {
            silent : true
        });
        basket.set('different_store_pickup_message', differentStorePickupMessage, {
            silent : true
        });
        if (toRestore) {
            _.each(toRestore, function(item) {
                basket.set(item, toRestore[item], {
                    silent : true
                });
            });
        }
        if (success) {
            success(model, resp, options);
        }
    };
}

var BasketModel = Backbone.Model.extend({
    config : {
        secure : true,
        cache : false
    },

    /**
     * setModelName - set the model name
     * @param {String} name of model
     */
    setModelName : function(name) {
        this.config.model_name = name;
    }
});

var StorefrontHelperSecure = require('dw/instore/StorefrontHelperSecure');

var BasketStorefrontModel = StorefrontHelperSecure.extend({
    /**
     * setUrlRoot - update the url root
     * @param {String} urlRoot - new URL
     */
    setUrlRoot : function(urlRoot) {
        this.urlRoot = urlRoot;
    }
});

var BasketGiftCardBalance = BasketStorefrontModel.extend({
    urlRoot : '/EACheckout-GiftCardBalance',

    /**
     * getBalance - get gift card balance
     * @return {String} balance
     */
    getBalance : function() {
        return this.get('gift_card_balance');
    },

    /**
     * getMaskedCode - get masked gift card code
     * @return {String} code
     */
    getMaskedCode : function() {
        return this.get('masked_gift_card_code');
    }
});

/**
 * Model definitions
 */
exports.definition = {
    /**
     * config for the model
     */
    config : {
        model_name : 'baskets',
        secure : true,
        cache : false,
        adapter : {
            type : 'ocapi'
        }
    },

    /**
     * Model extensions
     * @param {Object} Model
     */
    extendModel : function(Model) {
        _.extend(Model.prototype, {

            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/baskets',

            /**
             * Model relations
             */
            relations : [{
                type : Backbone.Many,
                key : 'product_items',
                relatedModel : require('alloy/models/' + ucfirst('productItem')).Model
            }, {
                type : Backbone.One,
                key : 'billing_address',
                relatedModel : require('alloy/models/' + ucfirst('billingAddress')).Model
            }, {
                type : Backbone.Many,
                key : 'shipments',
                relatedModel : require('alloy/models/' + ucfirst('shipment')).Model
            }, {
                type : Backbone.Many,
                key : 'coupon_items',
                relatedModel : require('alloy/models/' + ucfirst('couponItem')).Model
            }, {
                type : Backbone.Many,
                key : 'order_price_adjustments',
                relatedModel : require('alloy/models/' + ucfirst('orderPriceAdjustment')).Model
            }],

            idAttribute : 'basket_id',
            id : 'this',
            checkoutStates : [],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * syncOnEtagFailure - handling of etag errors that happen on the basket
             * and attempts to fetch the basket again to get a new etag
             * @param {Function} method to call after the fetch basket is done
             * @return {Deferred} promise
             */
            syncOnEtagFailure : function(method) {
                // For the given method, this will check for etag issue and sync the basket to resolve.
                // A request could have been made to the server that resulted in an etag change,
                // but the client never got the response or etag so it is out of date.
                var deferred = new _.Deferred();
                var self = this;
                method().fail(function(failModel, params, options) {
                    var fault = failModel.get('fault');
                    // This is an etag error type
                    if (fault && fault.type && (fault.type === 'PreconditionFailedException' || fault.type === 'InvalidIfMatchException')) {
                        // etag error so sync basket to get new etag
                        logger.info('Calling sync basket to resolve etag error');
                        self.fetchBasket(self.get('basket_id')).done(function() {
                            // sync was a success in resolving etag issue so now make the original request
                            method().done(function(rspModel, params, options) {
                                deferred.resolveWith(rspModel, [rspModel, params, options]);
                            }).fail(function(failModel, params, options) {
                                // Still have a failure, the user will have to try again
                                deferred.rejectWith(failModel, [failModel, params, options]);
                            });
                        }).fail(function(failModel, params, options) {
                            // Sync basket had a problem, the user can try again
                            deferred.rejectWith(failModel, [failModel, params, options]);
                        });
                    } else {
                        // some other failure occurred so reject the request
                        deferred.rejectWith(failModel, [failModel, params, options]);
                    }
                }).done(function(rspModel, params, options) {
                    // sucess on request
                    deferred.resolveWith(rspModel, [rspModel, params, options]);
                });
                return deferred.promise();
            },

            /**
             * save - Override Model save function to detect etag issues for a sync basket call
             * @param {Object} attrs
             * @param {Object} options
             * @return {Deferred} promise
             */
            save : function(attrs, options) {
                logger.info('save override called');
                var self = this;
                var method = function() {
                    return Backbone.Model.prototype.save.call(self, attrs, options);
                };
                return this.syncOnEtagFailure(method);
            },

            /**
             * apiCallInt - Internal apiCall function that calls sync adapter apiCall and detects etag issues for a sync basket
             * @param {Object} model
             * @param {Object} params
             * @param {Object} options
             * @return {Deferred} promise
             */
            apiCallInt : function(model, params, options) {
                logger.info('apiCallInt override called');
                var self = this;
                var method = function() {
                    if (params && self.etag) {
                        // update the etag for the new request
                        if (params.headers) {
                            params.headers = _.extend(params.headers, {
                                'If-Match' : self.etag
                            });
                        } else {
                            params = _.extend(params, {
                                headers : {
                                    'If-Match' : self.etag
                                }
                            });
                        }
                    }
                    return self.apiCall(model, params, options);
                };
                return this.syncOnEtagFailure(method);
            },

            /**
             * url - function to return url for basket
             * @return {String} url
             */
            url : function() {
                var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
                if (this.isNew()) {
                    return base;
                }
                return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + 'this';
            },

            /**
             * standardHeaders - standard header to use for basket
             * @return {Object} json to use for header
             */
            standardHeaders : function() {
                return {
                    'content-type' : 'application/json',
                    Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken(),
                    'If-Match' : this.etag
                };
            },

            /**
             * standardOptions - standard options for basket
             * @param {Object} options what will be extended with the new standard options
             * @return {Object} new options with standards
             */
            standardOptions : function(options) {
                return _.extend({}, {
                    wait : true,
                    cache : false,
                    dontincludeid : true,
                    error : function() {
                    }
                }, options);
            },

            /**
             * getBasket - obtains the basket from the server
             * @param {Object} basket
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            getBasket : function(basket, customData, options) {
                var deferred = new _.Deferred();
                var self = this;
                basket = basket || {};
                var url = this.url().replace('baskets/this', 'baskets');
                basket = _.extend(basket, customData);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify(basket),
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self);
                    var getBasket = new BasketModel();
                    getBasket.setModelName('getBasket');
                    self.apiCall(getBasket, params, options).done(function() {
                        if (Alloy.CFG.siteCurrency != Alloy.CFG.appCurrency) {
                            self.updateCurrency({
                                currency : Alloy.CFG.appCurrency
                            }, {
                                silent : true
                            }).done(function() {
                                deferred.resolve();
                            }).fail(function() {
                                deferred.reject();
                            });
                        } else {
                            deferred.resolve();
                        }
                    }).fail(function() {
                        deferred.reject();
                    });
                });
                return deferred.promise();
            },
            getCurrencyCode : function() {
                return this.get('currency');
            },
            /**
             * fetchBasket - fetch a particular basket based on id
             * @param {String} id of the basket
             * @return {Deferred} promise
             */
            fetchBasket : function(id) {
                var self = this;
                var deferred = new _.Deferred();
                var url = this.url().replace('baskets/this', 'baskets/' + id);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'GET',
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    var options = self.standardOptions();
                    addSuccessCallback(options, self);
                    var fetchBasket = new BasketModel();
                    fetchBasket.setModelName('fetchBasket');
                    self.apiCall(fetchBasket, params, options).done(function() {
                        deferred.resolve();
                    }).fail(function() {
                        deferred.reject();
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * deleteBasket - delete the basket
             * @return {Deferred} promise
             */
            deleteBasket : function() {
                var self = this;
                var deferred = new _.Deferred();
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id'));
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'DELETE',
                        headers : self.standardHeaders()
                    });
                    var options = self.standardOptions();
                    addSuccessCallback(options, self);
                    var deleteBasket = new BasketModel();
                    deleteBasket.setModelName('deleteBasket');
                    var deleteBasketPromise = self.apiCallInt(deleteBasket, params, options);
                    deleteBasketPromise.done(function() {
                        deferred.resolve();
                        self.trigger('sync');
                    }).fail(function() {
                        deferred.reject();
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * setBasket - set data on the basket
             * @param {Object} basket_info data to put in basket
             * @param {Object} options
             * @return {Deferred} promise
             */
            setBasket : function(basket_info, options) {
                var self = this;
                var deferred = new _.Deferred();
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id'));
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : JSON.stringify(basket_info),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, options.toRestore ? options.toRestore : {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });
                    var setBasket = new BasketModel();
                    setBasket.setModelName('setBasket');
                    self.apiCallInt(setBasket, params, options).done(function() {
                        deferred.resolve();
                    }).fail(function() {
                        deferred.reject();
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * replaceBasket - replace current basket with new data
             * @param {Object} basket_info to replace in basket
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            replaceBasket : function(basket_info, customData, options) {
                var self = this;
                var deferred = new _.Deferred();
                options = options || {};
                var checkoutStatus = this.getCheckoutStatus();
                var lastCheckoutStatus = this.getLastCheckoutStatus();
                var basketUpdate = {
                    type : 'basket_replace',
                    data : {
                        product_items : basket_info.product_items || [],
                        shipments : basket_info.shipments || []
                    }
                };
                _.extend(basketUpdate.data, customData);
                var basketPatch = {
                    product_items : new Backbone.Collection([]),
                    coupon_items : basket_info.coupon_items,
                    c_patchInfo : JSON.stringify(basketUpdate)
                };
                _.extend(basketPatch, customData);
                this.setBasket(basketPatch, options).done(function(model, params, resultOptions) {
                    self.set('checkout_status', checkoutStatus);
                    self.set('last_checkout_status', lastCheckoutStatus, {
                        silent : true
                    });
                    deferred.resolveWith(model, [model, params, resultOptions]);
                    if (options && !options.silent) {
                        self.trigger('basket_sync');
                    }
                }).fail(function(model, params, options) {
                    deferred.rejectWith(model, [model, params, options]);
                });
                return deferred.promise();
            },

            /**
             * addProduct - adds a single product to the basket
             * @param {Object} product_info to add in basket
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            addProduct : function(product_info, customData, options) {
                _.extend(product_info, customData);
                var products = [];
                products.push(product_info);
                return this.addProducts(products, options);
            },

            /**
             * addProducts - adds an array of products to the basket
             * @param {Array} products to add in basket
             * @param {Object} options
             * @return {Deferred} promise
             */
            addProducts : function(products, options) {
                var self = this;
                var deferred = new _.Deferred();
                var addProduct = new BasketModel(products);
                addProduct.setModelName('addProduct');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/items');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify(products),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });
                    var addProductPromise = self.apiCallInt(addProduct, params, options);
                    addProductPromise.done(function(model) {
                        if (addProduct.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            self.trigger('change:product_items');
                            self.trigger('basket_sync');

                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },

            /**
             * validateCartForCheckout - validates the basket in order to proceed in checkout process past cart
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            validateCartForCheckout : function(customData, options) {
                var deferred = new _.Deferred();
                var self = this;

                var basketUpdate = {
                    type : 'validate_cart_for_checkout'
                };
                var basketPatch = {
                    c_patchInfo : JSON.stringify(basketUpdate)
                };
                _.extend(basketPatch, customData);

                self.setBasket(basketPatch, options).done(function(model, params, resultOptions) {
                    self.trigger('basket_sync');
                    deferred.resolveWith(model, [model, params, resultOptions]);
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },

            /**
             * replaceProduct - replaces a single product in the basket
             * @param {Object} product_info to replace in basket
             * @param {String} item_id to replace in the basket
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            replaceProduct : function(product_info, item_id, customData, options) {
                var self = this;
                _.extend(product_info, customData);
                var deferred = new _.Deferred();

                var replaceProduct = new BasketModel(product_info);
                replaceProduct.setModelName('replaceProduct');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/items/' + item_id);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {

                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : JSON.stringify(product_info),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });

                    var checkoutStatus = self.getCheckoutStatus();
                    var lastCheckoutStatus = self.getLastCheckoutStatus();

                    var replaceProductPromise = self.apiCallInt(replaceProduct, params, options);

                    replaceProductPromise.done(function(model) {
                        self.set('checkout_status', checkoutStatus);
                        self.set('last_checkout_status', lastCheckoutStatus, {
                            silent : true
                        });
                        deferred.resolveWith(model, [model, params, options]);
                        self.trigger('basket_sync');
                        self.trigger('change:checkout_status');
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * removeItem - removes a single item from the basket
             * @param {String} item_id to remove from the basket
             * @param {Object} options
             * @return {Deferred} promise
             */
            removeItem : function(item_id, options) {
                var self = this;
                var deferred = new _.Deferred();
                var removeItem = new BasketModel();
                removeItem.setModelName('removeItem');
                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/items/' + item_id);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'DELETE',
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });

                    var checkoutStatus = self.getCheckoutStatus();
                    var lastCheckoutStatus = self.getLastCheckoutStatus();
                    var removeItemPromise = self.apiCallInt(removeItem, params, options);

                    // Deferreds execute in guaranteed order, so this will execute first
                    removeItemPromise.done(function(model) {
                        self.set('checkout_status', checkoutStatus);
                        self.set('last_checkout_status', lastCheckoutStatus, {
                            silent : true
                        });
                        deferred.resolveWith(model, [model, params, options]);
                        self.trigger('basket_sync');
                        self.trigger('change:checkout_status');

                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * setProductPriceOverride - sets a product price override
             * @param {Object} override_info
             * @param {Object} customData
             * @param {Object} origOptions
             * @return {Deferred} promise
             */
            setProductPriceOverride : function(override_info, customData, origOptions) {
                var self = this;
                var options = _.extend({}, {
                    wait : true,
                    silent : true
                }, origOptions);
                origOptions = origOptions || {};
                var deferred = new _.Deferred();
                var basketUpdate = {
                    type : 'product_price_override',
                    data : override_info
                };
                var basketPatch = {
                    product_items : new Backbone.Collection(),
                    c_patchInfo : JSON.stringify(basketUpdate)
                };
                _.extend(basketPatch, customData);

                // product price overrides are done via a basket patch
                this.setBasket(basketPatch, options).done(function(model, params, updateOptions) {
                    deferred.resolveWith(model, [model, params, updateOptions]);
                    if (!origOptions.silent) {
                        self.trigger('basket_sync');
                    }
                }).fail(function(model, params, options) {
                    deferred.rejectWith(model, [model, params, options]);
                });

                return deferred.promise();
            },

            /**
             * setShippingMethod - sets the shipping method on the basket
             * @param {Object} method_info
             * @param {Object} patch
             * @param {Object} customData
             * @param {Object} origOptions
             * @return {Deferred} promise
             */
            setShippingMethod : function(method_info, patch, customData, origOptions) {
                var self = this;
                if (patch) {
                    method_info.c_patchInfo = patch;
                }
                _.extend(method_info, customData);

                var deferred = new _.Deferred();
                // Sub-resource
                var shippingMethod = new BasketModel(method_info);
                shippingMethod.setModelName('basketShippingMethod');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/shipments/me/shipping_method');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'PUT',
                        data : JSON.stringify(shippingMethod.toJSON()),
                        headers : self.standardHeaders()
                    });
                    var options = self.standardOptions(origOptions);
                    options.silent = true;
                    addSuccessCallback(options, self);
                    var shippingMethodPromise = self.apiCallInt(shippingMethod, params, options);

                    shippingMethodPromise.done(function(model, params, options) {
                        if (shippingMethod.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            if (!origOptions || !origOptions.silent) {
                                self.trigger('basket_sync');
                                self.trigger('change:shipments');
                            }
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },

            /**
             * updateShipment - updates the shipping method on the basket
             * @param {Object} shipment_info
             * @param {Object} origOptions
             * @return {Deferred} promise
             */
            updateShipment : function(shipment_info, origOptions) {
                var self = this;
                // Sub-resource
                var shippingMethod = new BasketModel(shipment_info);
                shippingMethod.setModelName('updateShipment');

                var deferred = new _.Deferred();
                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/shipments/me');

                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : JSON.stringify(shippingMethod.toJSON()),
                        headers : self.standardHeaders()
                    });
                    var options = self.standardOptions(origOptions);
                    options.silent = true;
                    addSuccessCallback(options, self);
                    var shippingMethodPromise = self.apiCallInt(shippingMethod, params, options);

                    shippingMethodPromise.done(function(model, params, options) {
                        if (shippingMethod.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            if (!origOptions || !origOptions.silent) {
                                self.trigger('basket_sync');
                                self.trigger('change:shipments');
                            }
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * setShippingPriceOverride - sets a shipping price override
             * @param {Object} override_info
             * @param {Object} customData
             * @param {Object} origOptions
             * @return {Deferred} promise
             */
            setShippingPriceOverride : function(override_info, customData, origOptions) {
                var basketUpdate = {
                    type : 'shipping_price_override',
                    data : override_info
                };
                // shipping overrides are done via a beforeSetShippingMethod hook on the server
                return this.setShippingMethod({
                    id : this.getShippingMethod().get('id')
                }, basketUpdate, customData, origOptions);
            },

            /**
             * getShippingMethods - obtain available shipping methods
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            getShippingMethods : function(customData, options) {
                var self = this;
                var deferred = new _.Deferred();

                var basketUpdate = {
                    type : 'get_shipping_method_list'
                };

                options = options || {};
                options.silent = true;
                var basketPatch = {
                    c_patchInfo : JSON.stringify(basketUpdate)
                };

                _.extend(basketPatch, customData);
                self.setBasket(basketPatch, options).done(function() {
                    var shippingMethods = Alloy.createCollection('availableShippingMethod', self.get('shipping_methods'));
                    self.shippingMethods = shippingMethods.models;
                    self.trigger('basket_shipping_methods');
                    deferred.resolve();
                });

                return deferred.promise();
            },

            updateCurrency : function(basketInfo, options) {
                var self = this;
                var deferred = new _.Deferred();
                self.setBasket(basketInfo, options).done(function() {
                    self.trigger('basket_sync');
                    deferred.resolve();
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },
            /**
             * getShippingMethodPrice - obtain shipping method price
             * @param {String} shipping_method_id
             * @return {number} price
             */
            getShippingMethodPrice : function(shipping_method_id) {
                if (this.shippingMethods) {
                    var methods = this.shippingMethods || [];
                    for (var m = 0; m < methods.length; ++m) {
                        method = methods[m];
                        if (method.getID() === shipping_method_id) {
                            var price = parseFloat(method.getBasePrice());
                            if (method.getSurcharge()) {
                                price += parseFloat(method.getSurcharge());
                            }
                            return price;
                        }
                    }
                }
                return 0;
            },

            /**
             * getShippingMethodBasePrice - obtain shipping method base price
             * @param {String} shipping_method_id
             * @return {number} price
             */
            getShippingMethodBasePrice : function(shipping_method_id) {
                if (this.shippingMethods) {
                    var methods = this.shippingMethods || [];
                    for (var m = 0; m < methods.length; ++m) {
                        method = methods[m];
                        if (method.getID() === shipping_method_id) {
                            return parseFloat(method.getBasePrice());
                        }
                    }
                }
                return 0;
            },

            /**
             * setShippingAddress - set shipping address on basket
             * @param {Object} address_info
             * @param {Boolean} verify flag to verify address on server
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            setShippingAddress : function(address_info, verify, customData, options) {
                var self = this;
                var deferred = new _.Deferred();

                // The default should be to skip verify address validation unless specifically want verification
                if (!verify) {
                    address_info.c_skipVerify = true;
                }
                _.extend(address_info, customData);

                // Sub-resource
                var shippingAddress = new BasketModel(address_info);
                shippingAddress.setModelName('basketShipping');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/shipments/me/shipping_address');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'PUT',
                        data : JSON.stringify(shippingAddress.toJSON()),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    options.silent = true;
                    addSuccessCallback(options, self);
                    var shippingAddressPromise = self.apiCallInt(shippingAddress, params, options);

                    shippingAddressPromise.done(function(model, params, options) {
                        if (shippingAddress.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            self.trigger('basket_sync');
                            self.trigger('change:shipments');
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },

            /**
             * setBillingAddress - set billing address on basket
             * @param {Object} billing_address
             * @param {Boolean} verify flag to verify address on server
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            setBillingAddress : function(billing_address, verify, customData, options) {
                var self = this;
                var deferred = new _.Deferred();
                billing_address = billing_address.toJSON ? billing_address.toJSON() : billing_address;
                var address = this.get('billing_address');
                if (address && address.first_name == billing_address.first_name && address.last_name == billing_address.last_name && address.address1 == billing_address.address1 && address.address2 == billing_address.address2 && address.city == billing_address.city && address.state_code == billing_address.state_code && address.country_code == billing_address.country_code && address.postal_code == billing_address.postal_code) {
                    deferred.resolve();
                } else {
                    // The default should be to skip verify address validation unless specifically want verification
                    if (!verify) {
                        billing_address.c_skipVerify = true;
                    }

                    _.extend(billing_address, customData);

                    // Sub-resource
                    var billingAddress = new BasketModel(billing_address);
                    billingAddress.setModelName('basketBilling');

                    // Get base URL & client id for free ...
                    var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/billing_address');
                    Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                        // Pass along success & error handlers, etc., with no-ops by default
                        var params = _.extend({}, {
                            url : url,
                            type : 'PUT',
                            data : JSON.stringify(billingAddress.toJSON()),
                            headers : self.standardHeaders()
                        });
                        options = self.standardOptions(options);
                        addSuccessCallback(options, self);

                        var billingAddressPromise = self.apiCallInt(billingAddress, params, options);
                        // Deferreds execute in guaranteed order, so this will execute first
                        billingAddressPromise.done(function(model, params, options) {
                            if (billingAddress.etag) {
                                deferred.resolveWith(model, [model, params, options]);
                                self.trigger('basket_sync');
                            }
                        }).fail(function(model, params, options) {
                            deferred.rejectWith(model, [model, params, options]);
                        });
                    }).fail(function() {
                        deferred.reject();
                    });
                }

                return deferred.promise();
            },

            /**
             * setCustomerInfo - set customer info on basket
             * @param {Object} customer_info
             * @param {Object} options
             * @return {Deferred} promise
             */
            setCustomerInfo : function(customer_info, options) {
                var self = this;
                var deferred = new _.Deferred();
                // Sub-resource
                var customerInfo = new BasketModel(customer_info);
                customerInfo.setModelName('basketCustomerInfo');
                // Initialize ETag
                customerInfo.etag = this.etag;

                // Get base URL & client id for free ...
                var url = self.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/customer');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'PUT',
                        data : JSON.stringify(customerInfo.toJSON()),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self);

                    var customerInfoPromise = self.apiCallInt(customerInfo, params, options);

                    customerInfoPromise.done(function(model, params, options) {
                        if (customerInfo.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();
            },

            /**
             * setShippingAddressAndEmail - set shipping address and email on basket
             * @param {Object} address_info
             * @param {Object} customer_info
             * @param {Boolean} verify flag to verify address on server
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            setShippingAddressAndEmail : function(address_info, customer_info, verify, customData, options) {
                var self = this;
                var deferred = new _.Deferred();
                address_info = address_info.toJSON ? address_info.toJSON() : address_info;
                // Sub-resource for customer info
                var customerInfo = new BasketModel(customer_info);
                customerInfo.setModelName('basketCustomerInfo');
                // Initialize ETag
                customerInfo.etag = self.etag;
                var customerInfoUrl = self.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/customer');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {

                    // Pass along success & error handlers, etc., with no-ops by default
                    var customerInfoParams = _.extend({}, {
                        url : customerInfoUrl,
                        type : 'PUT',
                        data : JSON.stringify(customerInfo.toJSON()),
                        headers : self.standardHeaders()
                    });

                    options = self.standardOptions(options);
                    addSuccessCallback(options, self);
                    var customerInfoPromise = self.apiCallInt(customerInfo, customerInfoParams, options);

                    // Deferreds execute in guaranteed order, so this will execute first
                    customerInfoPromise.done(function() {
                        if (customerInfo.etag) {
                            // Update Basket Etag
                            self.etag = customerInfo.etag;
                            // Update Basket attributes (response is modified Basket)
                            self.set(customerInfo.toJSON(), {
                                silent : true
                            });
                            self.setShippingAddress(address_info, verify, customData, options).done(function(model, params, options) {
                                if (model.etag) {
                                    deferred.resolveWith(model, [model, params, options]);
                                    self.trigger('change:customer_info');
                                }
                            }).fail(function(model, params, options) {
                                deferred.rejectWith(model, [model, params, options]);
                            });
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * createOrder - create order from basket
             * @param {Object} options
             * @return {Deferred} promise
             */
            createOrder : function(options) {
                var self = this;
                var deferred = new _.Deferred();
                var submitBasket = new BasketModel();
                submitBasket.setModelName('submitBasket');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'orders');

                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify({
                            basket_id : self.get('basket_id')
                        }),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });

                    var submitBasketPromise = self.apiCallInt(submitBasket, params, options);

                    // Deferreds execute in guaranteed order, so this will execute first
                    submitBasketPromise.done(function(model) {
                        if (submitBasket.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            self.trigger('change:product_items');
                            self.trigger('basket_sync');
                        }
                    }).fail(function(model, params, options) {
                        var basket = Alloy.createModel('baskets', model.toJSON());
                        deferred.rejectWith(basket, [basket, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });

                return deferred.promise();

            },

            /**
             * applyCreditCard - apply credit card to the basket
             * @param {Object} credit_card_data
             * @return {Deferred} promise
             */
            applyCreditCard : function(credit_card_data) {
                var self = this;

                var applyCreditCard = new BasketStorefrontModel();
                applyCreditCard.setUrlRoot('/EACheckout-ApplyCreditCard');
                applyCreditCard.setModelName('applyCreditCard');
                var savePromise = applyCreditCard.save(credit_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * removeCreditCard - remove credit card from basket
             * @param {Object} credit_card_data
             * @return {Deferred} promise
             */
            removeCreditCard : function(credit_card_data) {
                var self = this;

                var removeCreditCard = new BasketStorefrontModel();
                removeCreditCard.setUrlRoot('/EACheckout-RemoveCreditCard');
                removeCreditCard.setModelName('removeCreditCard');
                var savePromise = removeCreditCard.save(credit_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * authorizeCreditCard - authorize credit card on the basket
             * @param {Object} credit_card_data
             * @return {Deferred} promise
             */
            authorizeCreditCard : function(credit_card_data) {
                var self = this;

                var authorizeCreditCard = new BasketStorefrontModel();
                authorizeCreditCard.setUrlRoot('/EACheckout-AuthorizeCreditCard');
                authorizeCreditCard.setModelName('authorizeCreditCard');
                var savePromise = authorizeCreditCard.save(credit_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * giftCardBalance - get the gift card balance
             * @param {Object} gift_card_data
             * @return {Deferred} promise
             */
            giftCardBalance : function(gift_card_data) {
                var giftCardBalance = new BasketGiftCardBalance();
                giftCardBalance.setModelName('giftCardBalance');
                var savePromise = giftCardBalance.save(gift_card_data, {
                    silent : true
                });
                return savePromise;
            },

            /**
             * applyGiftCard - apply gift card to the basket
             * @param {Object} gift_card_data
             * @return {Deferred} promise
             */
            applyGiftCard : function(gift_card_data) {
                var self = this;

                var applyGiftCard = new BasketStorefrontModel();
                applyGiftCard.setUrlRoot('/EACheckout-ApplyGiftCard');
                applyGiftCard.setModelName('applyGiftCard');
                var savePromise = applyGiftCard.save(gift_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * removeGiftCard - remove gift card from the basket
             * @param {Object} gift_card_data
             * @return {Deferred} promise
             */
            removeGiftCard : function(gift_card_data) {
                var self = this;

                var removeGiftCard = new BasketStorefrontModel();
                removeGiftCard.setUrlRoot('/EACheckout-RemoveGiftCard');
                removeGiftCard.setModelName('removeGiftCard');
                var savePromise = removeGiftCard.save(gift_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * authorizeGiftCard - authorize gift card for the basket
             * @param {Object} gift_card_data
             * @return {Deferred} promise
             */
            authorizeGiftCard : function(gift_card_data) {
                var self = this;

                var authorizeGiftCard = new BasketStorefrontModel();
                authorizeGiftCard.setUrlRoot('/EACheckout-AuthorizeGiftCard');
                authorizeGiftCard.setModelName('authorizeGiftCard');
                var savePromise = authorizeGiftCard.save(gift_card_data, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * authorizePayment - authorize payment for the basket
             * @return {Deferred} promise
             */
            authorizePayment : function() {
                var self = this;

                var authorizePayment = new BasketStorefrontModel();
                authorizePayment.setUrlRoot('/EACheckout-AuthorizePayment');
                authorizePayment.setModelName('authorizePayment');
                var savePromise = authorizePayment.save({
                    order_no : this.get('order_no')
                }, {
                    silent : true
                });
                savePromise.done(function(model) {
                    self.mergePaymentInformation(model);
                });
                return savePromise;
            },

            /**
             * addCoupon - add coupon to the basket
             * @param {Object} coupon_code
             * @param {Object} options
             * @return {Deferred} promise
             */
            addCoupon : function(coupon_code, options) {
                var self = this;
                var deferred = new _.Deferred();
                var addCoupon = new BasketModel({
                    code : coupon_code
                });
                addCoupon.setModelName('addCoupon');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/coupons');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify({
                            code : coupon_code
                        }),
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });

                    var addCouponPromise = self.apiCallInt(addCoupon, params, options);

                    addCouponPromise.done(function(model) {
                        if (addCoupon.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            self.trigger('basket_sync');

                        }
                    }).fail(function(model, params, options) {
                        var m = Alloy.createModel('baskets', model.toJSON());
                        deferred.rejectWith(m, [m, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();

            },

            /**
             * removeCoupon - remove coupon from the basket
             * @param {Object} coupon_code
             * @param {Object} options
             * @return {Deferred} promise
             */
            removeCoupon : function(coupon_code, options) {
                var self = this;
                var deferred = new _.Deferred();
                var foundCoupon = _.find(self.get('coupon_items').models, function(coupon) {
                    return coupon.get('code') === coupon_code;
                });

                var removeCoupon = new BasketModel({
                    code : coupon_code
                });
                removeCoupon.setModelName('removeCoupon');

                // Get base URL & client id for free ...
                var url = this.url().replace('baskets/this', 'baskets/' + this.get('basket_id') + '/coupons/' + foundCoupon.get('coupon_item_id'));
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var params = _.extend({}, {
                        url : url,
                        type : 'DELETE',
                        headers : self.standardHeaders()
                    });
                    options = self.standardOptions(options);
                    addSuccessCallback(options, self, {
                        shipments : self.get('shipments'),
                        billing_address : self.getBillingAddress()
                    });

                    var removeCouponPromise = self.apiCallInt(removeCoupon, params, options);

                    removeCouponPromise.done(function(model) {
                        if (removeCoupon.etag) {
                            deferred.resolveWith(model, [model, params, options]);
                            self.trigger('basket_sync');
                            self.trigger('change:coupon_items');
                        }
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * simpleAbandonOrder - abandon order via storefront
             * @return {Deferred} promise
             */
            simpleAbandonOrder : function() {
                var abandonOrder = new BasketStorefrontModel();
                abandonOrder.setUrlRoot('/EACheckout-AbandonOrder');
                abandonOrder.setModelName('abandonOrder');
                return abandonOrder.save({
                    order_no : this.get('order_no')
                }, {
                    silent : true
                });
            },

            /**
             * abandonOrder - abandon order and clear out the basket
             * @param {Object} employeeId
             * @param {Object} employeePasscode
             * @param {Object} storeId
             * @return {Deferred} promise
             */
            abandonOrder : function(employeeId, employeePasscode, storeId) {
                var self = this;

                var deferred = new _.Deferred();
                var savePromise = this.simpleAbandonOrder();
                var basket = Alloy.createModel('baskets');
                basket.set('product_items', self.get('product_items'), {
                    silent : true
                });
                _.each(basket.get('product_items').models, function(product_item) {
                    product_item.unset('price_override');
                    product_item.unset('price_override_value');
                    product_item.unset('price_override_type');
                    product_item.unset('price_override_reason_code');
                    product_item.unset('manager_employee_id');
                    product_item.unset('base_price_override');
                    product_item.unset('thumbnailUrl');
                    product_item.unset('message');
                });
                basket.set('billing_address', self.get('billing_address'), {
                    silent : true
                });
                basket.set('customer_info', self.get('customer_info'), {
                    silent : true
                });
                basket.set('coupon_items', self.get('coupon_items'), {
                    silent : true
                });
                var shipments = self.get('shipments');
                var giftMessage = null;
                if (shipments && shipments.at(0) && shipments.at(0).get('gift')) {
                    giftMessage = {
                        is_gift : 'true',
                        message : shipments.at(0).get('gift_message')
                    };
                }
                var shippingMethod = (shipments && shipments.at(0)) ? shipments.at(0).get('shipping_method') : '';
                var shippingOverride = null;
                if (self.hasShippingPriceOverride()) {
                    shippingOverride = {
                        price_override : shippingMethod.get('price_overrride'),
                        price_override_type : shippingMethod.get('price_override_type'),
                        price_override_value : shippingMethod.get('price_override_value'),
                        price_override_reason_code : shippingMethod.get('price_override_reason_code'),
                        base_price : shippingMethod.get('base_price'),
                        base_price_override : shippingMethod.get('base_price_override'),
                        employee_id : employeeId,
                        employee_passcode : employeePasscode,
                        store_id : storeId
                    };
                }
                shippingMethod.unset('price_override');
                shippingMethod.unset('price_override_type');
                shippingMethod.unset('price_override_value');
                shippingMethod.unset('price_override_reason_code');
                shippingMethod.unset('base_price');
                shippingMethod.unset('base_price_override');
                shippingMethod.unset('manager_employee_id');
                var customer_info = this.get('customer_info');
                savePromise.always(function() {
                    self.unset('channel_type');
                    self.getBasket(basket, {
                        c_eaEmployeeId : employeeId
                    }, {
                        silent : true
                    }).done(function() {
                        // put back the shipping override and gift message if needed. Calling this will also ensure the channel type is set correctly
                        var basketUpdate = {
                            type : 'after_abandon_order',
                            data : {}
                        };
                        if (shippingOverride) {
                            basketUpdate.data.shipping_override = shippingOverride;
                        }
                        // gift messages don't persist, so put them back
                        if (giftMessage) {
                            basketUpdate.data.gift_message = giftMessage;
                        }
                        if (Alloy.CFG.appCurrency) {
                            basketUpdate.data.currency = Alloy.CFG.appCurrency;
                        }
                        basketUpdate.data.shipments = shipments;
                        self.setBasket({
                            c_patchInfo : JSON.stringify(basketUpdate),
                            c_employee_id : employeeId
                        }, {
                            toRestore : {}
                        }).done(function(model, params, resultOptions) {
                            self.setCustomerInfo(customer_info).done(function() {
                                self.trigger('basket_sync');
                                deferred.resolveWith(model, [model, params, resultOptions]);
                            });
                        }).fail(function() {
                            deferred.reject();
                        });
                    }).fail(function() {
                        deferred.reject();
                    });
                });
                return deferred.promise();
            },

            /**
             * emailOrder - email the order
             * @param {number} order_no
             * @return {Deferred} promise
             */
            emailOrder : function(order_no) {
                var emailOrder = new BasketStorefrontModel();
                emailOrder.setUrlRoot('/EAOrder-SendEmail');
                emailOrder.setModelName('emailOrder');
                var savePromise = emailOrder.save({
                    order_no : order_no
                }, {
                    silent : true
                });
                return savePromise;
            },

            /**
             * mergePaymentInformation - merge payment information in this basket
             * @param {Object} model
             */
            mergePaymentInformation : function(model) {
                this.set('payment_details', model.get('payment_details'));
                this.set('confirmation_status', model.get('confirmation_status'));
                this.set('payment_balance', model.get('payment_balance'));
            },

            /**
             * calculateBalanceDue - determine balance due after existing payments
             * @return {number} balance
             */
            calculateBalanceDue : function() {
                var balance = 0;
                if (this.has('order_total')) {
                    var balance = this.get('order_total') - 0;
                    if (this.get('payment_details')) {
                        var details = this.get('payment_details');
                        var paymentsApplied = 0;
                        _.each(details, function(detail) {
                            paymentsApplied += (detail.amt_auth - 0);
                        });
                        balance -= paymentsApplied;
                    }
                }
                return balance;
            },

            /**
             * getOrder - get the order based on the order number
             * @param {Object} data - contains order_no
             * @param {Object} params
             * @param {Object} options
             * @return {Deferred} promise
             */
            getOrder : function(data, params, options) {
                var self = this;
                var deferred = new _.Deferred();
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    self.authorization = 'Bearer ' + Alloy.Models.authorizationToken.getToken();
                    self.url = function() {
                        return '/orders/' + data.order_no;
                    };
                    self.fetch({
                        dontincludeid : true
                    }).done(function(model) {
                        deferred.resolveWith(model, [model, params, options]);
                    }).fail(function() {
                        deferred.reject();
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * transform - transform basket data
             * @return {Object} basket transformed
             */
            transform : function() {
                var shippingMethod = this.get('shipments') ? this.get('shipments').at(0).get('shipping_method') : null;
                var shippingCost = shippingMethod ? shippingMethod.get('base_price') || shippingMethod.get('price') : null;
                // the shipping_total in the basket is the shipping cost - the shipping discount, so we can calculate the shipping discount.
                var shippingDiscount = shippingMethod ? this.get('shipping_total') - shippingCost : null;
                // if the shipping discount is 0, we're not going to display that value at all
                if (shippingDiscount && shippingDiscount == 0) {
                    shippingDiscount = null;
                }
                // calculate the order discount. the basket's product_total already includes the order discount but product_sub_total does not include order discount
                var orderDiscount = this.get('product_total') ? this.get('product_sub_total') - this.get('product_total') : null;
                if (orderDiscount && orderDiscount == 0) {
                    orderDiscount = null;
                }
                var toCurrency = require('EAUtils').toCurrency;

                var moment = require('alloy/moment');
                var toReturn = {
                    product_sub_total : this.get('product_sub_total') == 0 ? '' : toCurrency(this.get('product_sub_total')),
                    order_discount : orderDiscount ? toCurrency(orderDiscount) : '----',
                    shipping_total : shippingCost ? toCurrency(shippingCost - 0) : '----',
                    shipping_discount : shippingDiscount ? toCurrency(shippingDiscount) : '----',
                    tax_total : this.get('tax_total') ? toCurrency(this.get('tax_total') - 0) : '----',
                    order_total : this.get('order_total') ? toCurrency(this.get('order_total')) : '----',
                    creation_date : moment(this.get('creation_date')).format('LL'),
                    status : this.get('c_eaStatus'),
                    order_no : this.get('order_no')
                };
                return toReturn;
            },

            /**
             * getCouponDescription - get coupon description from coupon_code
             * @param {String} coupon_code
             * @return {String} description
             */
            getCouponDescription : function(coupon_code) {
                var coupons = this.get('coupons');
                if (coupons) {
                    for (var i = 0; i < coupons.length; i++) {
                        var coupon = coupons[i];
                        if (coupon_code == coupon.coupon_code) {
                            var description = null;
                            if (!coupon.coupon_applied) {
                                description = _L('Not Applied');
                            } else if (coupon.coupon_price_adjustments && (coupon.coupon_price_adjustments.length > 0)) {
                                description = coupon.coupon_price_adjustments[0].item_text;
                            }
                            return description;
                        }
                    }
                }
                return null;
            },

            /**
             * getShipments - get shipments on basket
             * @return {Array} shipments
             */
            getShipments : function() {
                return this.get('shipments') || [];
            },

            /**
             * getAddress - get address based on type
             * @param {Object} addressType - either billing or shipping
             * @return {Object} address
             */
            getAddress : function(addressType) {
                var address;
                if (addressType === 'billing') {
                    address = this.getBillingAddress();
                } else {
                    address = this.getShippingAddress();
                }
                return address;
            },

            /**
             * getShippingAddress - get shipping address on basket
             * @return {Object} address
             */
            getShippingAddress : function() {
                if (this.has('shipments') && this.get('shipments').length > 0 && this.get('shipments[0]').get('shipping_address')) {
                    return this.get('shipments[0]').get('shipping_address');
                }
                return null;
            },

            /**
             * getPaymentBalance - get payment balance
             * @return {number} balance
             */
            getPaymentBalance : function() {
                var balance = 0;
                if (this.has('payment_balance')) {
                    balance = this.get('payment_balance');
                }
                return balance;
            },

            /**
             * hasBillingAddress - returns if has billing address on basket
             * @return {Boolean} billing_address found
             */
            hasBillingAddress : function() {
                return this.has('billing_address');
            },

            /**
             * getBillingAddress - get billing address on basket
             * @return {Object} billing_address
             */
            getBillingAddress : function() {
                return this.get('billing_address');
            },

            /**
             * doesPaymentRequireSignature - returns if payment requires signature
             * @return {Boolean} requires signature
             */
            doesPaymentRequireSignature : function() {
                var payments = this.getPaymentInstruments();
                for (var p = 0; p < payments.length; ++p) {
                    var payment = payments[p];
                    // if any of the payment instruments require a signature, return true
                    if (payment.c_eaRequireSignature) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * isOrderConfirmed - order has been confirmed
             * @return {Boolean} confirmed
             */
            isOrderConfirmed : function() {
                return this.has('confirmation_status') && this.get('confirmation_status') === 'CONFIRMED';
            },

            /**
             * getStatus - get status of the basket
             * @return {Object} status
             */
            getStatus : function() {
                return this.get('status');
            },
            /**
             * isStatusCreated - see if the status is 'created'
             * @return {Boolean}
             */
            isStatusCreated : function() {
                var status = this.getStatus();
                return status && status.toLowerCase() === 'created';
            },
            /**
             * getShippingMethod - get shipping method selected on basket
             * @return {Object} shipping method
             */
            getShippingMethod : function() {
                if (this.has('shipments') && this.get('shipments').length > 0 && this.get('shipments[0]').has('shipping_method')) {
                    return this.get('shipments[0]').get('shipping_method');
                }
                return null;
            },

            /**
             * getCustomerInfo - get customer info on basket
             * @return {Object} customer info
             */
            getCustomerInfo : function() {
                return this.get('customer_info');
            },

            /**
             * getCustomerEmail - get customer email from basket
             * @return {Object} customer email
             */
            getCustomerEmail : function() {
                var info = this.getCustomerInfo();
                if (info) {
                    return info.email;
                } else if (this.has('shipments') && this.get('shipments').length > 0 && this.get('shipments[0]').has('customer_info')) {
                    return this.get('shipments[0]').get('customer_info').email;
                } else {
                    return null;
                }
            },

            /**
             * canEnableCheckout - return if checkout can be enabled
             * @return {Boolean} enable checkout
             */
            canEnableCheckout : function() {
                return this.get('enable_checkout');
            },

            /**
             * getAvailableShippingMethods - get available shipping methods
             * @return {Object} shipping methods
             */
            getAvailableShippingMethods : function() {
                return this.shippingMethods;
            },

            /**
             * getShippingTotal - get shipping total
             * @return {Object} shipping total
             */
            getShippingTotal : function() {
                return this.get('shipping_total');
            },

            /**
             * getShippingTotalBasePrice - get shipping total base price
             * @return {number} base price
             */
            getShippingTotalBasePrice : function() {
                return this.get('shipping_total_base_price');
            },

            /**
             * getProductTotal - get product total
             * @return {number} product total
             */
            getProductTotal : function() {
                return this.get('product_total');
            },

            /**
             * getProductSubtotal - get product subtotal
             * @return {number} product sub total
             */
            getProductSubtotal : function() {
                return this.get('product_sub_total');
            },

            /**
             * getOrderTotal - get order total
             * @return {number} order total
             */
            getOrderTotal : function() {
                return this.get('order_total');
            },

            /**
             * getTaxTotal - get tax total
             * @return {number} tax total
             */
            getTaxTotal : function() {
                return this.get('tax_total');
            },

            /**
             * getCurrency - get currency of basket
             * @return {String} currency
             */
            getCurrency : function() {
                return this.get('currency');
            },

            /**
             * getCountry - get country of basket
             * @return {String} country
             */
            getCountry : function() {
                return this.get('c_eaCountry');
            },

            /**
             * hasProductItems - has product items on basket
             * @return {Boolean} has items
             */
            hasProductItems : function() {
                return this.has('product_items') && this.get('product_items').length > 0;
            },

            /**
             * hasShippingPriceOverride - has shipping price override on basket
             * @return {Boolean} has shipping override
             */
            hasShippingPriceOverride : function() {
                return this.has('shipments') && this.get('shipments[0]').has('shipping_method') && this.get('shipments[0]').get('shipping_method').has('price_override') && this.get('shipments[0]').get('shipping_method').get('price_override') === 'true' && this.get('shipments[0]').get('shipping_method').get('price_override_type') !== 'none';
            },

            /**
             * getShippingPriceOverride - get shipping price override
             * @return {Object} shipping override
             */
            getShippingPriceOverride : function() {
                if (this.hasShippingPriceOverride()) {
                    return {
                        price_override_type : this.get('shipments[0]').get('shipping_method').get('price_override_type'),
                        price_override_value : this.get('shipments[0]').get('shipping_method').get('price_override_value')
                    };
                }
                return null;
            },

            /**
             * getCouponItems - get coupon items on basket
             * @return {Object} coupon items
             */
            getCouponItems : function() {
                return (this.has('coupon_items') && this.get('coupon_items').models) ? this.get('coupon_items').models : [];
            },

            /**
             * getOrderNo - get order number
             * @return {number} order no
             */
            getOrderNo : function() {
                return this.get('order_no');
            },

            /**
             * getOrderNumber - get order number
             * @return {number} order no
             */
            getOrderNumber : function() {
                return this.get('order_no');
            },

            /**
             * getPaymentInstruments - get payment instruments
             * @return {Object} payment instruments
             */
            getPaymentInstruments : function() {
                return this.get('payment_instruments');
            },

            /**
             * getPaymentDetails - get payment details
             * @return {Object} payment details
             */
            getPaymentDetails : function() {
                return this.get('payment_details');
            },

            /**
             * getOrderPriceAdjustments - get order price adjustments
             * @return {Object} price adjustments
             */
            getOrderPriceAdjustments : function() {
                return this.has('order_price_adjustments') ? this.get('order_price_adjustments').models : [];
            },

            /**
             * calculateOrderPriceAdjustments - get price adjustments on order
             * @return {Object} order discount
             */
            calculateOrderPriceAdjustments : function() {
                var orderDiscount = 0;
                _.each(this.getOrderPriceAdjustments(), function(model) {
                    orderDiscount += parseFloat(model.getPrice());
                });
                return orderDiscount;
            },

            /**
             * getOrderPriceDescriptions - get order price descriptions
             * @return {Object} order price descriptions
             */
            getOrderPriceDescriptions : function() {
                var orderPriceDescriptions = [];
                _.each(this.getOrderPriceAdjustments(), function(model) {
                    orderPriceDescriptions.push(model);
                });
                return orderPriceDescriptions;
            },

            /**
             * hasCoupon - if basket has a coupon
             * @return {Boolean} has coupon
             */
            hasCoupon : function(code) {
                var self = this;
                var found = _.find(self.getCouponItems(), function(coupon) {
                    return coupon.getCode() === code;
                });
                return found != null;
            },

            /**
             * getProductItems - get product items on basket
             * @return {Array} product items
             */
            getProductItems : function() {
                return this.has('product_items') ? this.get('product_items').models : [];
            },

            /**
             * getProductItemsCollection - get product items as a collection
             * @return {Collection} product items
             */
            getProductItemsCollection : function() {
                return this.get('product_items') || new Backbone.Collection();
            },

            /**
             * getAllProductItemsIds - get product item IDs
             * @return {Array} product item Ids
             */
            getAllProductItemIds : function() {
                var ids = [];
                if (this.get('product_items')) {
                    this.get('product_items').each(function(productItem) {
                        ids.push(productItem.getProductId());
                    });
                }
                return ids;
            },

            /**
             * getAllProductItemsIdsAndQuantities - get product item IDs and quantities
             * @return {Array} product item Ids
             */
            getAllProductItemsIdsAndQuantities : function() {
                var data = [];
                if (this.get('product_items')) {
                    this.get('product_items').each(function(productItem) {
                        data.push(productItem.getProductIdAndQuantity());
                    });
                }
                return data;
            },

            /**
             * filterProductItemsByIds - return product item base of id filter provided
             * @param {Array} filter
             * @return {Array} product item raw JSON
             */
            filterProductItemsByIds : function(filter) {
                var data = [];

                if (this.get('product_items')) {
                    _.each(filter, function(currentFilter) {
                        var productItem = this.get('product_items').where({
                            product_id : currentFilter.id
                        });
                        if (productItem.length > 0) {
                            productItem = productItem[0].toJSON();
                            productItem.current_stock_level = currentFilter.stock_level;
                            data.push(productItem);
                        }
                    }.bind(this));
                }

                return data;
            },

            /**
             * getApproachingOrderPromotions - get approaching order promotions on basket
             * @return {Array} approaching order promotions
             */
            getApproachingOrderPromotions : function() {
                return this.get('approaching_order_promotions') || [];
            },

            /**
             * getApproachingShippingPromotions - get approaching shipping promotions on basket
             * @return {Array} approaching shipping promotions
             */
            getApproachingShippingPromotions : function() {
                return this.get('approaching_shipping_promotions') || [];
            },

            /**
             * getCheckoutStatus - get checkout status
             * @return {String} checkout status
             */
            getCheckoutStatus : function() {
                return this.get('checkout_status');
            },

            /**
             * setCheckoutStatus - set checkout status
             * @param {String} status
             * @param {Object} options
             */
            setCheckoutStatus : function(status, options) {
                if (status == this.getCheckoutStatus()) {
                    return;
                }
                this.set({
                    last_checkout_status : this.get('checkout_status')
                }, options);
                this.set({
                    checkout_status : status
                }, options);
            },

            /**
             * getLastCheckoutStatus - get last checkout status
             * @return {String} last checkout status
             */
            getLastCheckoutStatus : function() {
                return this.get('last_checkout_status');
            },

            /**
             * setLastCheckoutStatusSilently - get last checkout status
             * @return {String} last checkout status
             */
            setLastCheckoutStatusSilently : function(value) {
                this.set('last_checkout_status', value, {
                    silent : true
                });
            },

            /**
             * getCheckoutStates - get checkout states
             * @return {Array} checkout states
             */
            getCheckoutStates : function() {
                return this.checkoutStates;
            },

            /**
             * getNextCheckoutState - get next checkout states
             * @return {String} next checkout state
             */
            getNextCheckoutState : function() {
                return this.checkoutStates[this.checkoutStates.indexOf(this.getCheckoutStatus()) + 1];
            },

            /**
             * setCheckoutStates - set checkout states
             * @param {Array} checkoutStates
             */
            setCheckoutStates : function(checkoutStates) {
                this.checkoutStates = checkoutStates;
            },

            /**
             * getIsGift - get if basket is set as gift
             * @param {Object} shipment_number
             * @return {String} boolean string if gift
             */
            getIsGift : function(shipment_number) {
                var ship_num = shipment_number || 0;
                if (this.has('shipments')) {
                    var shipment = this.get('shipments').at(ship_num);
                    return shipment.get('gift');
                }
                return 'false';
            },

            /**
             * getGiftMessage - get gift message
             * @param {Object} shipment_number
             * @return {String} gift message
             */
            getGiftMessage : function(shipment_number) {
                var ship_num = shipment_number || 0;
                if (this.has('shipments')) {
                    var shipment = this.get('shipments').at(ship_num);
                    return shipment.get('gift_message');
                }
                return '';
            },

            /**
             * getFaultMessage - get fault message
             * @return {String} fault message
             */
            getFaultMessage : function() {
                if (this.has('fault')) {
                    return this.get('fault').message;
                }
                return null;
            },

            /**
             * getFaultType - get fault type
             * @return {String} fault type
             */
            getFaultType : function() {
                if (this.has('fault')) {
                    return this.get('fault').type;
                }
                return null;
            },

            /**
             * setShipToStore - set ship to store on basket (this is a custom client side only property)
             * @param {Boolean} shipToStore
             */
            setShipToStore : function(shipToStore) {
                this.set('ship_to_store', shipToStore);
            },

            /**
             * setDifferentStorePickup - set different store pickup (this is a custom client side only property)
             * @param {Boolean} value
             */
            setDifferentStorePickup : function(value) {
                this.set('different_store_pickup', value);
            },

            /**
             * setDifferentStorePickupMessage - set different store pickup message (this is a custom client side only property)
             * @param {String} value
             */
            setDifferentStorePickupMessage : function(value) {
                this.set('different_store_pickup_message', value);
            },

            /**
             * getShipToStore - get ship to store on basket (this is a custom client side only property)
             * @return {Boolean} ship to store
             */
            getShipToStore : function() {
                return this.get('ship_to_store');
            },

            /**
             * getDifferentStorePickup - get different_store_pickup on basket (this is a custom client side only property)
             * @return {Boolean} different store pickup
             */
            getDifferentStorePickup : function() {
                return this.get('different_store_pickup');
            },

            /**
             * getDifferentStorePickupMessage - get different_store_pickup_message on basket (this is a custom client side only property)
             * @return {String} different store pickup message
             */
            getDifferentStorePickupMessage : function() {
                return this.get('different_store_pickup_message');
            },

            /**
             * parse - parse basket response
             * @param {Object} in_json
             * @return {Object} basket
             */
            parse : function(in_json) {
                in_json.shipping_total_excluding_discount = 0;
                in_json.shipping_total_base_price = 0;
                in_json.shipping_total = 0;
                _.each(in_json.product_items, function(item) {
                    if (item.c_eaCustomAttributes) {
                        var attr = JSON.parse(item.c_eaCustomAttributes);
                        if (attr.eaPriceOverrideType) {
                            item.manager_employee_id = attr.eaManagerEmployeeId;
                            item.price_override_type = attr.eaPriceOverrideType;
                            item.price_override = 'true';
                            item.price_override_value = attr.eaPriceOverrideValue;
                            item.price_override_reason_code = attr.eaOverrideReasonCode;
                        } else {
                            item.price_override = 'false';
                        }
                        item.base_price_override = parseFloat(attr.base_price_override);
                        item.base_price = parseFloat(attr.base_price);
                        item.price = parseFloat(attr.price);
                        item.thumbnailUrl = attr.thumbnailUrl;
                        item.message = attr.message;
                    }
                });

                _.each(in_json.shipping_items, function(item) {
                    var attr = null;
                    if (item.c_eaCustomAttributes) {
                        var shipment = _.find(in_json.shipments, function(ship) {
                            return ship.shipment_id === item.shipment_id;
                        });
                        attr = JSON.parse(item.c_eaCustomAttributes);
                        if (shipment.shipping_method) {
                            if (attr.eaPriceOverrideType && attr.eaPriceOverrideType != 'none') {
                                shipment.shipping_method.manager_employee_id = attr.eaManagerEmployeeId;
                                shipment.shipping_method.price_override_type = attr.eaPriceOverrideType;
                                shipment.shipping_method.price_override = 'true';
                                shipment.shipping_method.price_override_value = attr.eaPriceOverrideValue;
                                shipment.shipping_method.price_override_reason_code = attr.eaOverrideReasonCode;
                                shipment.shipping_method.base_price = parseFloat(attr.base_price);
                                shipment.shipping_method.base_price_override = parseFloat(attr.base_price_override);
                                in_json.shipping_total_excluding_discount += shipment.shipping_method.base_price;
                                in_json.shipping_total_base_price += shipment.shipping_method.base_price;
                            } else {
                                shipment.shipping_method.price_override = 'false';
                                in_json.shipping_total_base_price = parseFloat(item.base_price);
                            }
                        }

                    }
                    // when creating the order, special handling for shipping promotions have to be dealt with
                    if (in_json.order_no) {
                        // no overrides (overrides were handled already)
                        if (!attr) {
                            in_json.shipping_total_base_price = parseFloat(item.base_price);
                        }
                        in_json.shipping_total += item.price_after_item_discount ? parseFloat(item.price_after_item_discount) : parseFloat(item.base_price);
                    } else {
                        in_json.shipping_total += parseFloat(item.base_price);
                    }

                });

                if (in_json.c_eaCustomAttributes) {
                    var attr = JSON.parse(in_json.c_eaCustomAttributes);
                    in_json.coupons = attr.coupons;
                    if (attr.enable_checkout !== undefined) {
                        in_json.enable_checkout = (attr.enable_checkout == 1);
                    }
                    // in_json.channel_type = attr.channel_type;
                    in_json.shipping_methods = attr.shipping_methods;
                    in_json.product_sub_total = parseFloat(attr.product_sub_total);
                    in_json.product_total = parseFloat(attr.product_total);
                    in_json.order_total = parseFloat(attr.order_total);
                    in_json.tax_total = parseFloat(attr.tax_total);
                    in_json.shipping_total_base_price = parseFloat(attr.shipping_total_base_price);
                    in_json.shipping_discount = parseFloat(attr.shipping_discount);
                    in_json.shipping_total = parseFloat(attr.shipping_total);
                    in_json.shipping_total_excluding_discount = parseFloat(attr.shipping_total_excluding_discount);
                    in_json.product_total = parseFloat(attr.product_total);
                    in_json.product_sub_total = parseFloat(attr.product_sub_total);
                    in_json.creation_date = attr.creation_date;
                    if (attr.approaching_shipping_promotions) {
                        in_json.approaching_shipping_promotions = attr.approaching_shipping_promotions;
                        in_json.approaching_shipping_promotions = _.map(in_json.approaching_shipping_promotions, function(promotion) {
                            promotion.amount_to_qualify = parseFloat(promotion.amount_to_qualify);
                            return promotion;
                        });
                    }
                    if (attr.approaching_order_promotions) {
                        in_json.approaching_order_promotions = attr.approaching_order_promotions;
                        in_json.approaching_order_promotions = _.map(in_json.approaching_order_promotions, function(promotion) {
                            promotion.amount_to_qualify = parseFloat(promotion.amount_to_qualify);
                            return promotion;
                        });
                    }
                }
                return in_json;
            }
        });

        return Model;
    },

    /**
     * extendCollection - extending the backbone collection
     * @param {Object} Collection
     */
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });

        return Collection;
    }
};

