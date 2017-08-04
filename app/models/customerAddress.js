// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/customerAddress.js - model definition for customer address
 *
 * @api public
 */

var Address = require('dw/instore/Address');

var StorefrontHelperSecure = require('dw/instore/StorefrontHelperSecure');

var SaveAddress = Backbone.Model.extend({
    config : {
        secure : true,
        model_name : 'saveAddress',
        cache : false
    }
});

var CustomerAddressModel = Backbone.Model.extend({
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

exports.definition = {
    // **config**
    config : {
        model_name : 'customerAddress',
        secure : true,
        cache : false,
        adapter : {
            type : 'ocapi'
        },
        superClass : Address
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/customers/this/addresses',

            relations : [{
                type : Backbone.Many,
                key : 'data',
                relatedModel : Address
            }],

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * standardHeaders - headers used for ocapi requests
             * @return {Object} headers
             */
            standardHeaders : function() {
                var headers = this.standardHeadersNoEtag();
                headers['If-Match'] = this.etag;
                return headers;
            },

            /**
             * standardHeadersNoEtag - headers used for ocapi requests
             * @return {Object} headers
             */
            standardHeadersNoEtag : function() {
                return {
                    'content-type' : 'application/json',
                    Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                };
            },

            /**
             * fetchAddresses - fetch the addresses for a customer
             * @param {String} customerId
             * @param {Object} options
             * @return {Deferred} promise
             */
            fetchAddresses : function(customerId, options) {
                var url = this.url().replace('customers/this/addresses', 'customers/' + customerId + '/addresses');
                var self = this;
                var deferred = new _.Deferred();
                var getAddress = new CustomerAddressModel();
                getAddress.setModelName('fetchAddresseses');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var _params = _.extend({}, {
                        url : url,
                        type : 'GET',
                        headers : self.standardHeadersNoEtag()
                    });
                    var _options = _.extend({}, {
                        cache : false,
                        dontincludeid : true,
                        success : function(model, resp, options) {
                            model.set(self.parse(resp, options), options);
                        },
                        error : function() {
                        }
                    }, options);

                    self.apiCall(getAddress, _params, _options).done(function(result) {
                        self.set(result.toJSON(), {
                            silent : true
                        });
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
             * fetchAddress - fetch the address for a customer and an address name
             * @param {String} addressName
             * @param {String} customerId
             * @return {Deferred} promise
             */
            fetchAddress : function(addressName, customerId) {
                var self = this;
                var deferred = new _.Deferred();
                var options = _.extend({}, {
                    wait : true,
                    error : function() {
                    },
                    patch : false
                }, options);

                // Get base URL & client id for free ...
                var url = this.url().replace('customers/this/addresses', 'customers/' + customerId + '/addresses/') + encodeURIComponent(addressName);

                var getAddress = new CustomerAddressModel();
                getAddress.setModelName('fetchAddress');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {

                    var _params = _.extend({}, {
                        url : url,
                        type : 'GET',
                        headers : self.standardHeadersNoEtag()
                    });
                    var _options = _.extend({}, {
                        cache : false,
                        dontincludeid : true,
                        success : function() {
                        },
                        error : function() {
                        }
                    }, options);

                    self.apiCall(getAddress, _params, _options).done(function(model, params, options) {
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
             * nicknameExists - validates if the nick name of an address already exist
             * @param {String} nickname
             * @return {Boolean} if exists
             */
            nicknameExists : function(nickname) {
                if (!this.get('data') || !this.get('data').models) {
                    return false;
                }
                var addresses = this.get('data').models;

                return _.find(addresses, function(address) {
                    return address.get('address_id') === nickname;
                });
            },

            /**
             * createAddress - creates the address for a customer
             * @param {Object} addressData
             * @param {String} customerId
             * @param {Object} customData
             * @param {Object} options
             * @param {Boolean} verify
             * @return {Deferred} promise
             */
            createAddress : function(addressData, customerId, customData, options, verify) {
                var self = this;
                var deferred = new _.Deferred();
                var options = _.extend({}, {
                    wait : true,
                    error : function() {
                    },
                    patch : false
                }, options);

                var address = _.extend({}, addressData);
                // The default should be to skip verify address validation unless specifically want verification
                if (!verify) {
                    address.c_skipVerify = true;
                }
                delete address.original_id;
                _.extend(address, customData);
                var url = this.url().replace('customers/this/addresses', 'customers/' + customerId + '/addresses');

                // Get base URL & client id for free ...

                var newAddress = new CustomerAddressModel(address);
                newAddress.setModelName('newAddress');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var _params = _.extend({}, {
                        url : url,
                        type : 'POST',
                        data : JSON.stringify(newAddress.toJSON()),
                        headers : self.standardHeadersNoEtag()
                    });

                    var _options = _.extend({}, {
                        cache : false,
                        dontincludeid : true,
                        success : function(model, resp, options) {
                            model.set(self.parse(resp, options), options);
                        },
                        error : function() {
                        }
                    }, options);

                    self.apiCall(newAddress, _params, _options).done(function(model, params, options) {
                        deferred.resolveWith(model, [model, params, options]);
                    }).fail(function(model, params, options) {
                        deferred.reject(model, [model, params, options]);
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();

            },

            /**
             * updateAddress - updates the address for a customer
             * @param {Object} addressData
             * @param {String} customerId
             * @param {Object} customData
             * @param {Object} options
             * @param {Boolean} verify
             * @return {Deferred} promise
             */
            updateAddress : function(addressData, customerId, customData, options, verify) {
                var self = this;
                var deferred = new _.Deferred();

                this.fetchAddress(addressData.original_id, customerId).done(function(resultModel) {

                    var url = self.url().replace('customers/this/addresses', 'customers/' + customerId + '/addresses/') + encodeURIComponent(addressData.original_id);
                    var address = _.extend({}, addressData);
                    // The default should be to skip verify address validation unless specifically want verification
                    if (!verify) {
                        address.c_skipVerify = true;
                    }
                    // original name
                    address.address_id = addressData.original_id;
                    delete address.original_id;

                    if (addressData.address_id !== addressData.original_id) {
                        var patch = _.extend({}, address);
                        address.c_patchInfo = {
                            type : 'rename_address',
                            data : {
                                original_id : addressData.original_id,
                                new_id : addressData.address_id,
                                email : addressData.email
                            }
                        };

                    }
                    _.extend(address, customData);
                    delete address.address_id;

                    var updateAddress = new CustomerAddressModel(address);
                    updateAddress.setModelName('updateAddress');

                    var _params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : JSON.stringify(updateAddress.toJSON()),
                        headers : self.standardHeaders()
                    });
                    var _options = _.extend({}, {
                        cache : false,
                        dontincludeid : true,
                        success : function(model, resp, options) {
                            model.set(self.parse(resp, options), options);
                        },
                        error : function() {
                        }
                    }, options);

                    self.apiCall(updateAddress, _params, _options).done(function(model, params, resultOptions) {
                        deferred.resolveWith(model, [model, params, options]);
                    }).fail(function(model, params, resultOptions) {
                        deferred.rejectWith(model, [model, params, options]);
                    });
                }).fail(function(model, params, resultOptions) {
                    deferred.rejectWith(model, [model, params, options]);
                });

                return deferred.promise();
            },

            /**
             * deleteAddress - deletes the address for a customer
             * @param {String} addressName
             * @param {String} customerId
             * @param {Object} options
             * @return {Deferred} promise
             */
            deleteAddress : function(addressName, customerId, options) {
                var self = this;
                var deferred = new _.Deferred();
                var url = self.url().replace('customers/this/addresses', 'customers/' + customerId + '/addresses/') + encodeURIComponent(addressName);

                var delAddress = new CustomerAddressModel();
                delAddress.setModelName('deleteAddress');
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var _params = _.extend({}, {
                        url : url,
                        type : 'DELETE',
                        headers : self.standardHeaders()
                    });
                    var _options = _.extend({}, {
                        wait : true,
                        patch : false,
                        dontincludeid : true,
                        cache : false,
                        success : function() {
                        },
                        error : function() {
                        }
                    }, options);

                    self.apiCall(delAddress, _params, _options).done(function() {
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
             * getPreferredID - returns the preferred id of an address
             * @param {Object} options
             * @return {String}
             */
            getPreferredID : function(options) {
                if (this.has('data')) {
                    var pref = _.find(this.get('data').models, function(address) {
                        return address.get('preferred');
                    });
                    if (pref) {
                        return pref.get('address_id');
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            },

            /**
             * getAddresses - returns the addresses of a customer if any
             * @return {Array}
             */
            getAddresses : function() {
                return this.has('data') && this.get('data').models ? this.get('data').models : [];
            },

            /**
             * getAddressesOfType - returns the address based on the address type
             * @param {Object} addressType
             * @return {Array}
             */
            getAddressesOfType : function(addressType) {
                if (this.has('data')) {
                    var addressModels = this.get('data').models;
                    var filteredAddress;
                    var countries = Alloy.Globals.customerGlobalCountries;
                    if (addressType === 'billing') {
                        countries = Alloy.Globals.billingGlobalCountries;
                    } else if (addressType === 'shipping') {
                        countries = Alloy.Globals.shippingGlobalCountries;
                    }
                    if (addressModels) {
                        filteredAddress = addressModels.filter(function(model) {
                            var filter = false;
                            _.each(countries, function(country) {
                                if (model.getCountryCode() == country.countryCode) {
                                    filter = true;
                                    return;
                                }
                            });
                            if (filter == true) {
                                return true;
                            }

                        });
                        return filteredAddress;
                    }
                } else {
                    return [];
                }
            },

            /**
             * getShippingAddresses - returns the shipping addresses if any
             * @return {Array}
             */
            getShippingAddresses : function() {
                if (this.has('data')) {
                    var addressModels = this.get('data').models;
                    var filteredAddress;
                    if (addressModels) {
                        filteredAddress = addressModels.filter(function(model) {
                            var filter = false;
                            _.each(Alloy.Globals.shippingGlobalCountries, function(shippingCountry) {
                                if (model.getCountryCode() == shippingCountry.countryCode) {
                                    filter = true;
                                    return;
                                }
                            });
                            if (filter == true) {
                                return true;
                            }

                        });
                        return filteredAddress;
                    }
                } else {
                    return [];
                }
            },

            /**
             * getAddress - returns the address at a given index
             * @param {Object} address
             */
            getAddress : function(index) {
                return this.get('data').at(index);
            },

            /**
             * isCustomerAddressPage - validates if on customer address page or not
             * @return {Boolean}
             */
            isCustomerAddressPage : function() {
                var currentPage = this.get('currentPage');
                if (currentPage == 'address') {
                    return true;
                } else {
                    return false;
                }
            },

            /**
             * setCurrentPage - set the current page to the input page
             * @param {Object} page
             */
            setCurrentPage : function(page) {
                var self = this;
                self.set('currentPage', page);
            },

            /**
             * getCurrentPage - returns the current page on the app
             * @return {Object}
             */
            getCurrentPage : function() {
                return this.get('currentPage');
            },

            /**
             * isModifyingCustomerAddress - validates if modifying customer address or not
             * @return {Boolean}
             */
            isModifyingCustomerAddress : function() {
                return this.get('modify');
            },

            /**
             * setModifyingCurrentAddress - set the current page to the modifying page of an address
             * @param {Object} modify
             */
            setModifyingCurrentAddress : function(modify) {
                var self = this;
                this.set('modify', modify);
            },

            /**
             * isShipToStoreAddress - is this address is ship to store
             * @return {Boolean} ship to store
             */
            isShipToStoreAddress : function() {
                return this.get('shipToStore');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## VARIABLES

            url : '/account/this/addresses',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * parse - parse the response
             * @param {Object} in_json
             */
            parse : function(in_json) {
                return in_json.data;
            },

            /**
             * clear - clear the model
             * @param {Object} options
             */
            clear : function(options) {
                return this.reset([], options);
            }
        });

        return Collection;
    }
};
