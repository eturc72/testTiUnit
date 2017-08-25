var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('app/models/baskets.js', function() {

    ucfirst = sinon.stub().callsFake(function(str) {
        return str;
    });

    var stub = {

        'logging': sinon.stub().returns({
            info: sinon.stub()
        }),

        'dw/instore/StorefrontHelperSecure': Backbone.Model.extend({
            setModelName: sinon.stub(),
            save: sinon.stub().usingPromise(new _.Deferred()).resolves({
                get: sinon.stub()
            })
        }),

        'alloy/models/productItem': {
            Model: Backbone.Model.extend({})
        },
        'alloy/models/billingAddress': {
            Model: Backbone.Model.extend({})
        },
        'alloy/models/shipment': {
            Model: Backbone.Model.extend({})
        },
        'alloy/models/couponItem': {
            Model: Backbone.Model.extend({})
        },
        'alloy/models/orderPriceAdjustment': {
            Model: Backbone.Model.extend({})
        },
        'alloy/moment': sinon.stub().returns({
            format: sinon.stub().returns('2017-07-01')
        }),
        'EAUtils': {
            toCurrency: sinon.stub().callsFake(function(val) {
                return val;
            })
        }

    };
    var modelFileUnderTest = proxyquire('../../../app/models/baskets.js', stub);
    var BasketsModel = modelFileUnderTest.definition.extendModel(Backbone.Model.extend({
        apiCall: sinon.stub()
    }));
    var mockedBasketsModelData = {
        product_items: [{}],
        billing_address: {},
        shipments: [{}],
        coupon_items: [{}],
        order_price_adjustments: [{}]
    }
    var modelUnderTest = new BasketsModel(mockedBasketsModelData);

    var BasketsCollection = modelFileUnderTest.definition.extendCollection(Backbone.Collection.extend({
        apiCall: sinon.stub()
    }));
    var collectionUnderTest = new BasketsCollection();

    describe('model.syncOnEtagFailure', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.syncOnEtagFailure(sinon.stub().usingPromise(new _.Deferred()).resolves());
        });

        it('should have returned a resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.syncOnEtagFailure', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.syncOnEtagFailure(sinon.stub().usingPromise(new _.Deferred()).rejects({
                get: sinon.stub().returns({
                    type: 'PreconditionFailedException'
                })
            }, {}, {}));
        });

        it('should have returned a rejected promise', function() {
            expect(returnedPromise.state()).toEqual('rejected');
        });
    });

    describe('model.save', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).rejects();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            Backbone.Model.prototype.save = sinon.stub().usingPromise(new _.Deferred()).rejects({
                get: sinon.stub().returns({
                    type: 'PreconditionFailedException'
                })
            }, {}, {});
            returnedPromise = modelUnderTest.save();
        });

        it('should have returned a rejected promise', function() {
            expect(returnedPromise.state()).toEqual('rejected');
        });

    });

    describe('model.apiCallInt', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Backbone.Model.prototype.save = sinon.stub().usingPromise(new _.Deferred()).rejects({
                get: sinon.stub().returns({})
            }, {}, {});
            returnedPromise = modelUnderTest.apiCallInt();
        });

        it('should have returned a resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.url', function() {
        it('should have returned "/baskets"', function() {
            expect(modelUnderTest.url()).toEqual('/baskets');
        });
    });

    describe('model.url', function() {
        beforeAll(function() {
            modelUnderTest.isNew = sinon.stub().returns(false);
        })
        it('should have returned "/baskets/this"', function() {
            expect(modelUnderTest.url()).toEqual('/baskets/this');
        });
    });

    describe('model.standardHeaders', function() {

        beforeAll(function() {
            Alloy.Models.authorizationToken = {
                getToken: sinon.stub().returns('r43-h57-d2j')
            };
        });

        it('should return valid object', function() {
            expect(modelUnderTest.standardHeaders().Authorization).toEqual('Bearer r43-h57-d2j');
        });
    });

    describe('model.standardOptions', function() {
        var returnedValue;
        var options = {
            saveOnDone: {}
        };

        beforeAll(function() {
            returnedValue = modelUnderTest.standardOptions(options);
        });

        it('should return valid object', function() {
            expect(returnedValue.saveOnDone).toEqual(options.saveOnDone);
        });
    });

    describe('model.getBasket', function() {
        var returnedPromise;
        var options = {};

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            Alloy.CFG.siteCurrency = '$';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.getBasket({}, {}, options);

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.fetchBasket', function() {
        var returnedPromise;

        var options = {};

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            Alloy.CFG.siteCurrency = '$';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.fetchBasket();

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.deleteBasket', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.deleteBasket();

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });


    describe('model.setBasket', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setBasket();

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.replaceBasket', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.replaceBasket({}, {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.addProducts', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.addProducts([], {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.addProduct', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.addProduct({}, {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });


    describe('model.validateCartForCheckout', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.validateCartForCheckout({}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });


    describe('model.replaceProduct', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.replaceProduct({}, 'item_id', {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.removeItem', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.removeItem('item_id', {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.setProductPriceOverride', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setProductPriceOverride('item_id', {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.setShippingMethod', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setShippingMethod({}, {}, {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.updateShipment', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.updateShipment({}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.getShippingMethods', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            Alloy.createCollection = sinon.stub().returns(new Backbone.Collection())
            returnedPromise = modelUnderTest.getShippingMethods({}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.getShippingMethodPrice', function() {

        beforeAll(function() {
            var shippingMethod = {
                getID: sinon.stub().returns('one_method'),
                getBasePrice: sinon.stub().returns(100),
                getSurcharge: sinon.stub().returns(150)
            };
            modelUnderTest.shippingMethods = [shippingMethod];

        });

        it('should return the correct price', function() {
            expect(modelUnderTest.getShippingMethodPrice('one_method')).toEqual(250);
        });
    });

    describe('model.getShippingMethodBasePrice', function() {

        beforeAll(function() {
            var shippingMethod = {
                getID: sinon.stub().returns('one_method'),
                getBasePrice: sinon.stub().returns(100)
            };
            modelUnderTest.shippingMethods = [shippingMethod];

        });

        it('should return the correct price', function() {
            expect(modelUnderTest.getShippingMethodBasePrice('one_method')).toEqual(100);
        });
    });

    describe('model.setShippingAddress', function() {

        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setShippingAddress({}, false, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.setBillingAddress', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setBillingAddress({}, false, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.setCustomerInfo', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.setCustomerInfo({}, false, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });


    describe('model.setShippingAddressAndEmail', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            returnedPromise = modelUnderTest.setShippingAddressAndEmail({}, {}, false, {}, {});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.createOrder', function() {
        var returnedPromise;

        beforeAll(function() {
            Alloy.CFG.storefront_host = 'hello Endless Aisle';
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });

            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('some_token')
            };
            returnedPromise = modelUnderTest.createOrder({});

        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.applyCreditCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.applyCreditCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.removeCreditCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.removeCreditCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.removeCreditCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.authorizeCreditCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.giftCardBalance', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.giftCardBalance({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.applyGiftCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.applyGiftCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.removeGiftCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.removeGiftCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.authorizeGiftCard', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.authorizeGiftCard({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.authorizePayment', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.authorizePayment({});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.addCoupon', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });
            returnedPromise = modelUnderTest.addCoupon({}, {});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.removeCoupon', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.get('coupon_items').at(0).set({
                code: '12345'
            });
            modelUnderTest.apiCall = sinon.stub().callsFake(function(model, parrams, options) {
                model.etag = true;
                var deferred = new _.Deferred();
                deferred.resolve(model, parrams, options);
                return deferred.promise();
            });

            returnedPromise = modelUnderTest.removeCoupon('12345', {});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.simpleAbandonOrder', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.simpleAbandonOrder();
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.abandonOrder', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                'shipping_method': (new Backbone.Model({
                    price_override: 'true',
                    price_override_type: 'shipping',
                    price_override_value: 50
                })),
            });
            modelUnderTest.get('product_items').at(0).set({
                code: '12345'
            });

            Alloy.createModel = sinon.stub().returns(new Backbone.Model());
            returnedPromise = modelUnderTest.abandonOrder('employeeId', 'employeePasscode', 'storeId');
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.emailOrder', function() {
        var returnedPromise;
        beforeAll(function() {
            returnedPromise = modelUnderTest.emailOrder();
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.calculateBalanceDue', function() {

        beforeAll(function() {
            modelUnderTest.set({
                order_total: 90,
                payment_details: [{
                    amt_auth: 7
                }]
            })
        });

        it('should return resolved promise', function() {
            expect(modelUnderTest.calculateBalanceDue()).toEqual(83);
        });
    });

    describe('model.getOrder', function() {
        var returnedPromise;
        beforeAll(function() {
            modelUnderTest.fetch = sinon.stub().usingPromise(new _.Deferred()).resolves();
            returnedPromise = modelUnderTest.getOrder({}, {}, {});
        });

        it('should return resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.transform', function() {

        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                shipping_method: new Backbone.Model({
                    base_price: 200,
                    price: 200
                })
            });
            modelUnderTest.set({
                order_total: 250,
                shipping_total: 30,
                product_total: 150,
                product_sub_total: 100,
                tax_total: 20,
                c_eaStatus: 'created',
                order_no: '123-WER-067'
            });
        });

        it('should return the correct data', function() {
            var validation = true;
            var expectedRes = {
                product_sub_total: 100,
                order_discount: -50,
                shipping_total: 200,
                shipping_discount: -170,
                tax_total: 20,
                order_total: 250,
                creation_date: '2017-07-01',
                status: 'created',
                order_no: '123-WER-067'
            };

            expect(modelUnderTest.transform()).toEqual(expectedRes);
        });
    });

    describe('model.getCouponDescription', function() {
        beforeAll(function() {
            modelUnderTest.set({
                coupons: [{
                    coupon_code: 'ABCD',
                    coupon_applied: true,
                    coupon_price_adjustments: [{
                        item_text: 'hello coupon'
                    }]
                }]
            });

        });

        it('should return the correct coupon description', function() {
            expect(modelUnderTest.getCouponDescription('ABCD')).toEqual('hello coupon');
        });
    });

    describe('model.getAddress', function() {
        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                shipping_address: 'shipping_address'
            });

        });

        it('should return the correct shipping address', function() {
            expect(modelUnderTest.getAddress()).toEqual('shipping_address')
        })
    });

    describe('model.getAddress', function() {

        beforeAll(function() {
            modelUnderTest.get('billing_address').set({
                billing_address: 'billingAddress'
            });

        });

        it('should return the correct billing address', function() {
            expect(modelUnderTest.getAddress('billing').toJSON()).toEqual({
                billing_address: 'billingAddress'
            })
        })
    });

    describe('model.getPaymentBalance', function() {
        beforeAll(function() {
            modelUnderTest.set({
                payment_balance:50
            });

        });

        it('should return correct payment balance', function() {
            expect(modelUnderTest.getPaymentBalance()).toEqual(50);
        });
    });

    describe('model.doesPaymentRequireSignature', function() {
        beforeAll(function() {
            modelUnderTest.set({
                payment_instruments:[{
                    c_eaRequireSignature: true
                }]
            });

        });

        it('should return true', function() {
            expect(modelUnderTest.doesPaymentRequireSignature()).toEqual(true);
        });
    });

    describe('model.isStatusCreated', function() {
        beforeAll(function() {
            modelUnderTest.set({
                status: 'created'
            });

        });

        it('should return true', function() {
            expect(modelUnderTest.isStatusCreated()).toEqual(true);
        });
    });


    describe('model.getShippingMethod', function() {
        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                shipping_method: 'shipping_method'
            });

        });

        it('should return the correct shipping method', function() {
            expect(modelUnderTest.getShippingMethod()).toEqual('shipping_method')
        })
    });

    describe('model.getCustomerEmail', function() {
        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                customer_info: {
                    email: 'customer@email.com'
                }
            });

        });

        it('should return the correct customer email', function() {
            expect(modelUnderTest.getCustomerEmail()).toEqual('customer@email.com')
        })
    });

    describe('model.getShippingPriceOverride', function() {
        beforeAll(function() {
            modelUnderTest.get('shipments').at(0).set({
                shipping_method: new Backbone.Model({
                        price_override: 'true',
                        price_override_type: 'shipping',
                        price_override_value: 50
                })
            });

        });

        it('should return the correct customer email', function() {
            expect(modelUnderTest.getShippingPriceOverride()).toEqual({
                price_override_type: 'shipping',
                price_override_value: 50
            })
        })
    });
});
