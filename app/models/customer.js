// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/customer.js - model definition for customer
 *
 * @api public
 */

var logger = require('logging')('models:customer', 'app/models/customer');

/* subresources */
var AddressBook = Backbone.Model.extend({
    config : {
        secure : true,
        model_name : 'addressBook',
        cache : false
    }
});

var CustomerModel = Backbone.Model.extend({
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

var CustomerLogin = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-LoginOnBehalf'
});

var CreateBasket = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-CreateBasket'
});

var Addresses = require('alloy/models/CustomerAddress').Model;

exports.definition = {
    // **config**
    config : {
        model_name : 'customer',
        secure : true,
        cache : false,
        adapter : {
            type : 'ocapi'
        },
        collection_adapter : {
            type : 'storefront'
        }
    },
    // **extendCollection**
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## VARIABLES

            url : '/EAAccount-Search',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * queryParams - query params for the url
             * @return {Object} params
             */
            queryParams : function() {
                return null;
            },

            /**
             * search - Search customers
             * @param {Object} query
             * @return {Deferred} promise
             */
            search : function(query) {
                var self = this;
                var deferred = new _.Deferred();
                self.fetch(query).done(function() {
                    deferred.resolve();
                }).fail(function(collection, requestData, params, response) {
                    if (response && response.fault && response.fault.message) {
                        deferred.reject({
                            message : response.fault.message
                        });
                    } else {
                        deferred.reject({
                            message : _L('Unable to search customers.')
                        });
                    }

                });
                return deferred.promise();
            },

            /**
             * parse - parse model results
             * @param {Object} in_json
             * @return {Array}
             */
            parse : function(in_json) {
                if ('customers' in in_json) {
                    return in_json.customers;
                }
                return [];
            },

            /**
             * getCustomers - get customers
             * @return {Object} models
             */
            getCustomers : function() {
                return this.models;
            }
        });

        return Collection;
    },

    // **extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            relations : [{
                type : Backbone.Many,
                key : 'baskets',
                relatedModel : require('alloy/models/' + ucfirst('baskets')).Model
            }],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * initilize - initialize the model
             */
            initialize : function() {
                this._loggedIn = false;
                this.addresses = new Addresses();
                this.productLists = Alloy.createCollection('productLists');
                this.productLists.setCustomer(this);
            },

            /**
             * isNew - returns if new
             * @return {Boolean} is new
             */
            isNew : function() {
                return false;
            },

            /**
             * url - returns url
             * @return {String} url
             */
            url : function() {
                return '/customers/this';
            },

            /**
             * isLoggedIn - checks if the customer is logged in or not
             * @param {String} new_value
             * @return {Boolean}
             */
            isLoggedIn : function(new_value) {
                if (this._loggedIn != new_value && (new_value === true || new_value === false)) {
                    this._loggedIn = new_value;
                }

                return this._loggedIn;
            },

            /**
             * standardHeaders - headers used for ocapi requests
             * @return {Object}
             */
            standardHeaders : function() {
                var headers = this.standardHeadersNoEtag();
                headers['If-Match'] = this.etag;
                return headers;
            },

            /**
             * standardHeadersNoEtag - headers used for ocapi requests
             * @return {Object}
             */
            standardHeadersNoEtag : function() {
                return {
                    'content-type' : 'application/json',
                    Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                };
            },

            /**
             * standardOptions - standarad options for request
             * @param {Object} options
             * @return {Object}
             */
            standardOptions : function(options) {
                var options = this.baseOptions(options);
                options.cache = false;
                options.dontincludid = true;
                return options;
            },

            /**
             * baseOptions - base options for request
             * @param {Object} options
             * @return {Object}
             */
            baseOptions : function(options) {
                return _.extend({}, {
                    success : function() {
                    },
                    error : function() {
                    }
                }, options);
            },

            /**
             * loginCustomer - logs in the customer
             * @param {String} login_info
             * @param {Object} currentBasket
             * @param {Object} options
             * @return {Deferred} promise
             */
            loginCustomer : function(login_info, currentBasket, options) {
                logger.info('[login] ETag: ' + this.etag);
                var self = this;
                var deferred = new _.Deferred();

                var customerLogin = new CustomerLogin();

                logger.info('attempting to login as customer');
                if (!currentBasket.get('product_items')) {
                    currentBasket.set('product_items', [], {
                        silent : true
                    });
                }
                var basket = currentBasket.clone();
                var hasBillingAddress = basket.getBillingAddress() != null;
                var hasShippingAddress = basket.getShippingAddress(0) != null;
                basket.set('shipments', []);
                var json = basket.toJSON();

                Alloy.Globals.resetCookies();
                var employee_code = Alloy.Models.associate.get('employee_id');
                var employee_pin = Alloy.Models.associate.get('passcode');

                Alloy.Models.associate.loginAssociate({
                    employee_id : employee_code,
                    passcode : employee_pin
                }).done(function() {
                    customerLogin.save(login_info).done(function() {
                        logger.info('attempting to fetch customer profile');
                        self.set(this.toJSON(), {
                            silent : true
                        });
                        // set the login (since it's not returned by ocapi)
                        self._loggedIn = true;
                        self.loadProductLists().always(function() {
                            self.getBaskets(self.get('customer_id'), Alloy.Models.authorizationToken.getToken()).done(function(customerBasketModel) {
                                self.fetchBasket().done(function() {
                                    self.claimBasket(currentBasket).done(function() {
                                        self.trigger('change:saved_products');
                                        self.trigger('saved_products:downloaded');
                                        self.trigger('change:login');
                                        deferred.resolve();
                                    }).fail(function(error) {
                                        self._loggedIn = false;
                                        deferred.reject(error);
                                    });
                                }).fail(function(error) {
                                    self._loggedIn = false;
                                    deferred.reject(error);
                                });
                            }).fail(function(error) {
                                self._loggedIn = false;
                                deferred.reject(error);
                            });
                        });
                    }).fail(function(error) {
                        self._loggedIn = false;
                        notify(String.format(_L('Cannot login as \'%s\'.'), login_info.login), {
                            preventAutoClose : true
                        });
                        deferred.reject(error);
                    });
                }).fail(function(error) {
                    deferred.reject(error);
                });
                return deferred.promise();
            },

            /**
             * doLogout - logs out the customer
             */
            doLogout : function() {
                this._loggedIn = false;
                this.clearCustomer();
                this.addresses.clear();
                this.productLists.clearData();
            },

            /**
             * loadProductLists - loads the wishlist for a customer if any or enabled
             * @return {Deferred} promise
             */
            loadProductLists : function() {
                var self = this;
                var deferred = new _.Deferred();
                if (self.isLoggedIn() && Alloy.CFG.enable_wish_list) {
                    self.productLists.getCollection(self).done(function() {
                        deferred.resolve();
                    }).fail(function() {
                        notify(_L('Failure to load current customer product lists.'), {
                            preventAutoClose : true
                        });
                        self.productLists.clearData();
                        deferred.reject();
                    });
                } else {
                    self.productLists.clearData();
                    deferred.resolve();
                }

                return deferred.promise();
            },

            /**
             * getCustomerId - returns the id of a customer
             * @return {String}
             */
            getCustomerId : function() {
                return this.get('customer_id');
            },

            /**
             * hasAnAddress - validates if customer has an address
             * @return {Boolean}
             */
            hasAnAddress : function() {
                var addresses = this.getAddresses();
                return addresses && addresses.length > 0;
            },

            /**
             * getFirstAddress - gets the first address of a customer
             * @return {Object}
             */
            getFirstAddress : function() {
                var addresses = this.getAddresses();
                if (addresses && addresses.length > 0) {
                    return addresses[0];
                }
            },

            /**
             * getAddresses - get all the addresses of a customer
             * @return {Object}
             */
            getAddresses : function(options) {
                return this.get('addresses') || [];
            },

            /**
             * setProfile - set the profile details of a customer
             * @param {Object} profile_info
             * @param {Object} options
             * @return {Deferred} promise
             */
            setProfile : function(profile_info, options) {
                logger.info('[login] ETag: ' + this.etag);
                var self = this;

                var loggedIn = self._loggedIn;
                var deferred = new _.Deferred();
                var url = this.url();

                // Sub-resource
                var profile = Alloy.createModel('customer', profile_info);

                var url = this.url().replace('customers/this', 'customers/' + this.getCustomerId());

                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    // Pass along success & error handlers, etc., with no-ops by default
                    var _params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : JSON.stringify(profile.toJSON()),
                        headers : self.standardHeaders()
                    });

                    var _options = self.standardOptions(options);

                    _options.success = function(model, resp, opts) {
                        if (!model.set(resp, opts)) {
                            return false;
                        }
                    };
                    
                    var profilePromise = self.apiCall(profile, _params, _options);

                    // Deferreds execute in guaranteed order, so this will execute first
                    profilePromise.done(function(model, params, options) {
                        // clear out old attributes
                        self.clear({silent:true});
                        // set new attributes
                        self.set(model.toJSON(), options);
                        self._loggedIn = loggedIn;
                        if (model.etag) {
                            self.etag = model.etag;
                        }
                        deferred.resolveWith(self, [self, params, options]);
                    }).fail(function(model, params, options) {
                        self._loggedIn = false;
                        deferred.rejectWith(model, [model, params, options]);
                    });

                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();

            },

            /**
             * clearCustomer - clear the customer data
             * @param {Object} options
             */
            clearCustomer : function(options) {
                this._loggedIn = false;
                this.etag = null;
                var silent_options = _.extend({}, {
                    silent : true
                }, options);
                Backbone.Model.prototype.clear.call(this, silent_options);

                if (options && options.silent && options.silent === true) {
                    return;
                }
                this.trigger('change', this, options);
                this.trigger('customer:clear', this, options);
                if (Alloy.CFG.enable_wish_list) {
                    this.productLists.clearData();
                }
            },

            /**
             * register - registers the customer
             * @param {Object} profile_info
             * @param {Object} customData
             * @param {Object} options
             * @return {Deferred} promise
             */
            register : function(profile_info, customData, options) {
                var self = this;
                var deferred = new _.Deferred();

                // POST: create
                var register = new CustomerModel();
                register.setModelName('customerRegister');
                var url = this.url().replace('customers/this', 'customers');

                _.extend(profile_info.customer, customData);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify(profile_info),
                        headers : self.standardHeadersNoEtag()
                    });
                    options = self.baseOptions(options);
                    options.cache = false;
                    var promise = self.apiCall(register, params, options);
                    promise.done(function(model, params, options) {
                        deferred.resolveWith(model, [model, params, options]);
                    }).fail(function(model, params, options) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * getCustomer - fetches the customer
             * @return {Deferred} promise
             */
            getCustomer : function() {
                var self = this;
                var deferred = new _.Deferred();
                var url = this.url().replace('customers/this', 'customers/' + this.getCustomerId());
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'GET',
                        headers : self.standardHeadersNoEtag()
                    });
                    var options = self.standardOptions();
                    options.wait = true;
                    options.success = function(model, resp, options) {
                        if (!model.set(model.parse(resp, options), options)) {
                            return false;
                        }
                    };
                    var getCustomer = new CustomerModel();
                    getCustomer.setModelName('customerGetCustomer');
                    self.apiCall(getCustomer, params, options).done(function() {
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
             * getBaskets - fetches the baskets of a customer
             * @param {String} customerId
             * @return {Deferred} promise
             */
            getBaskets : function(customerId) {
                var self = this;
                var deferred = new _.Deferred();
                var url = this.url().replace('customers/this', 'customers/' + customerId + '/baskets');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'GET',
                        headers : self.standardHeadersNoEtag()
                    });
                    var options = self.standardOptions();
                    options.wait = true;
                    options.success = function(model, resp, options) {
                        if (!model.set(model.parse(resp, options), options)) {
                            return false;
                        }
                    };
                    var getBaskets = new CustomerModel();
                    getBaskets.setModelName('customerGetBaskets');
                    var getBasketsPromise = self.apiCall(getBaskets, params, options);
                    getBasketsPromise.done(function(model) {
                        var baskets = model.get('baskets');
                        // if there are 4 baskets, we can't create another basket, so find one that is an agent basket and delete it
                        if (baskets && baskets.length >= 3) {
                            var agentBasket = _.find(baskets, function(basket) {
                                return basket.agent_basket == 1;
                            });

                            var basket = Alloy.createModel('baskets', agentBasket);
                            self.tempBasket = basket;
                            basket.fetchBasket(basket.get('basket_id')).done(function() {
                                basket.deleteBasket().done(function() {
                                    baskets.splice(baskets.indexOf(agentBasket), 1);
                                    self.set('baskets', Alloy.createCollection('baskets', baskets));
                                    deferred.resolve();
                                });
                            });
                        }
                        self.set('baskets', model.get('baskets'));
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
             * getBasket - returns the customer's storefront basket
             * @return {Object}
             */
            getBasket : function() {
                // return the non-agent basket (this should be the customer's storefront basket)
                var baskets = this.get('baskets');
                if (baskets && baskets.length > 0) {
                    return _.find(baskets.models, function(basket) {
                        return basket.get('agent_basket') == 0;
                    });
                }
                return null;
            },

            /**
             * fetchBasket - fetches the basket for a customer
             * @return {Deferred} promise
             */
            fetchBasket : function() {
                var self = this;
                var basket = this.getBasket();
                if (basket) {
                    return basket.fetchBasket(basket.get('basket_id'));
                } else {
                    basket = Alloy.createModel('baskets');
                    var deferred = new _.Deferred();
                    var createBasket = new CreateBasket();
                    createBasket.save().done(function() {
                        self.getBaskets(self.get('customer_id')).done(function() {
                            basket = self.getBasket();
                            if (basket) {
                                basket.fetchBasket(basket.get('basket_id')).done(function() {
                                    deferred.resolve();
                                });
                            } else {
                                deferred.resolve();
                            }
                        });
                    });
                    return deferred.promise();
                }
            },

            /**
             * claimBasket - assign a basket to this customer
             * @param {Object} basket
             */
            claimBasket : function(basket) {
                return basket.setCustomerInfo({
                    customer_no : this.getCustomerNumber(),
                    email : this.getEmail(),
                    customer_name : this.getFirstName() + ' ' + this.getLastName()
                });
            },

            /**
             * getSavedProducts - get saved products for a customer
             * @return {Array}
             */
            getSavedProducts : function() {
                var basket = this.getBasket();
                if (basket) {
                    return basket.get('product_items') && basket.get('product_items').models ? basket.get('product_items').models : [];
                }
                return [];
            },

            /**
             * removeSavedProduct - removes the saved product
             * @param {Object} item
             * @return {Deferred} promise
             */
            removeSavedProduct : function(item) {
                var self = this;
                var basket = this.getBasket();
                if (basket) {
                    var def = basket.removeItem(item.get('item_id'));
                    def.done(function() {
                        self.trigger('change:saved_products');
                    });
                    return def;
                }
            },

            /**
             * addSavedProduct - add the saved product
             * @param {Object} item
             * @param {Object} customData
             * @return {Deferred} promise
             */
            addSavedProduct : function(item, customData) {
                var self = this;
                var basket = this.getBasket();
                if (basket) {
                    var def = basket.addProduct(item, customData);
                    def.done(function() {
                        self.trigger('change:saved_products');
                    });
                    return def;
                }
            },

            /**
             * syncSavedProducts - sync the saved products
             * @param {Object} basket
             * @param {Object} customData
             * @return {Deferred} promise
             */
            syncSavedProducts : function(basket, customData) {
                var anythingToSave = false;
                var basketClone = basket.clone();
                var deferred = new _.Deferred();
                if (basketClone.has('product_items') && basketClone.get('product_items').length > 0) {
                    for (var c = 0; c < basketClone.get('product_items').length; ++c) {
                        var product = basketClone.get('product_items').models[c];
                        product.set('price_override', 'false', {
                            silent : true
                        });
                        product.set('price_override_type', 'none', {
                            silent : true
                        });
                        anythingToSave = true;
                    }
                }
                if (basketClone.has('shipments') && basketClone.get('shipments').length == 1) {
                    var method = basketClone.get('shipments').at(0).get('shipping_method');
                    if (method) {
                        method.set('price_override', 'false', {
                            silent : true
                        });
                        method.set('price_override_type', 'none', {
                            silent : true
                        });
                    }
                }
                var customerBasket = this.getBasket();
                if (customerBasket) {
                    if (customerBasket.has('product_items') && basketClone.has('product_items') && basketClone.get('product_items').length > 0) {
                        if (!basketClone.has('product_items')) {
                            basketClone.set('product_items', new Backbone.Collection());
                        }
                        basketClone.get('product_items').add(customerBasket.get('product_items').models);
                        anythingToSave = true;
                    }

                    if (anythingToSave) {
                        var json = basketClone.toJSON();
                        return customerBasket.replaceBasket(json, customData, {
                            silent : true
                        });
                    } else {
                        // no products to save back, so don't make the server call
                        deferred.resolve();
                        return deferred.promise();
                    }
                } else {
                    deferred.resolve();
                    return deferred.promise();
                }
            },

            /**
             * transform - transforms the customer profile information
             * @return {Object} toReturn
             */
            transform : function() {
                var now = new Date();
                var lastVisit = new Date(this.get('last_visit_time'));
                var lastLogin = new Date(this.get('last_login_time'));
                var visitDiffDays = ((now - lastVisit) / 60 / 60 / 24 / 1000).toFixed();
                var loginDiffDays = ((now - lastLogin) / 60 / 60 / 24 / 1000).toFixed();
                var toReturn = {
                    first_name : this.get('first_name'),
                    last_name : this.get('last_name'),
                    email : this.get('email'),
                    login : this.get('login'),
                    birthday : this.get('birthday'),
                    customer_no : this.get('customer_no'),
                    last_visit : (visitDiffDays != 'NaN') ? visitDiffDays : _L('Never'),
                    last_login : (loginDiffDays != 'NaN') ? loginDiffDays : _L('Never')
                };
                return toReturn;
            },

            /**
             * getCustomerNumber - returns the customer number
             * @return {String}
             */
            getCustomerNumber : function() {
                return this.get('customer_no');
            },

            /**
             * hasCustomerNumber - checks if the customer has a customer number
             * @return {Boolean}
             */
            hasCustomerNumber : function() {
                return this.has('customer_no');
            },

            /**
             * getEmail - returns the email of a customer
             * @return {String}
             */
            getEmail : function() {
                return this.get('email');
            },

            /**
             * getLogin - returns the login info for a customer
             * @return {String}
             */
            getLogin : function() {
                return this.get('login');
            },

            /**
             * getPhone - returns the phone of a customer
             * @return {String}
             */
            getPhone : function() {
                return this.get('phone') || this.get('phone_home');
            },

            /**
             * getFirstName - returns the first name of a customer
             * @return {String}
             */
            getFirstName : function() {
                return this.get('first_name');
            },

            /**
             * getLastName - returns the last name of a customer
             * @return {String}
             */
            getLastName : function() {
                return this.get('last_name');
            },

            /**
             * getFullName - returns the full name of a customer
             * @return {String}
             */
            getFullName : function() {
                var fullName = (this.getFirstName() || '') + ' ' + (this.getLastName() || '');
                return fullName.trim();
            },

            /**
             * hasAddresses - validates if the customer has address or not
             * @return {Boolean}
             */
            hasAddresses : function() {
                return this.addresses.get('count');
            },

            /**
             * getCustomerId - returns the id of a customer
             * @return {String}
             */
            getCustomerId : function() {
                return this.get('customer_id');
            },
            /**
             * getFax - returns the fax # of a customer
             * @return {String}
             */
            getFax : function() {
                return this.get('fax');
            },
        });

        return Model;
    }
};
