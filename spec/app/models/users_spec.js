var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('app/models/users.js', function() {

    var stub = {
        'logging': sinon.stub()
    };

    var modelFileUnderTest = proxyquire('../../../app/models/users.js', stub);

    var UserModel = modelFileUnderTest.definition.extendModel(Backbone.Model.extend({
        apiCall: sinon.stub()
    }));

    var modelUnderTest = new UserModel();

    describe('successFunction', function() {
        var model;
        beforeAll(function() {
            model = {
                set: sinon.stub().returns(true),
                parse: sinon.stub(),
                trigger: sinon.spy()
            }
            modelFileUnderTest.successFunction(model);
        });

        it('should have called model.trigger', function() {
            expect(model.trigger.called).toEqual(true);
        });
    });

    describe('model.fetchExpiration', function() {
        var returnedPromise;
        beforeAll(function() {
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('token')
            };
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            returnedPromise = modelUnderTest.fetchExpiration();
        });

        it('should have called model.apiCall', function() {
            expect(modelUnderTest.apiCall.called).toEqual(true);
        });
        it('should have returned a resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.fetchExpiration', function() {
        var returnedPromise;
        beforeAll(function() {
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('token')
            };
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).rejects({
                get: sinon.stub().returns({
                    type: 'UserNotAvailableException'
                }),
                has: sinon.stub().returns(true)
            });
            returnedPromise = modelUnderTest.fetchExpiration();
        });

        it('should have called model.apiCall', function() {
            expect(modelUnderTest.apiCall.called).toEqual(true);
        });

        it('should have returned a rejected promise', function() {
            expect(returnedPromise.state()).toEqual('rejected');
        });
    });

    describe('model.updateStorePassword', function() {
        var returnedPromise;
        beforeAll(function() {
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('token')
            };
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).resolves();
            returnedPromise = modelUnderTest.updateStorePassword();
        });

        it('should have called model.apiCall', function() {
            expect(modelUnderTest.apiCall.called).toEqual(true);
        });

        it('should have returned a resolved promise', function() {
            expect(returnedPromise.state()).toEqual('resolved');
        });
    });

    describe('model.updateStorePassword', function() {
        var returnedPromise;
        beforeAll(function() {
            Alloy.Models.authorizationToken = {
                fetchToken: sinon.stub().usingPromise(new _.Deferred()).resolves(),
                getToken: sinon.stub().returns('token')
            };
            modelUnderTest.apiCall = sinon.stub().usingPromise(new _.Deferred()).rejects({
                get: sinon.stub().returns({
                    type: 'PasswordPolicyViolationException'
                }),
                has: sinon.stub().returns(true)
            });
            returnedPromise = modelUnderTest.updateStorePassword();
        });

        it('should have called model.apiCall', function() {
            expect(modelUnderTest.apiCall.called).toEqual(true);
        });

        it('should have returned a rejected promise', function() {
            expect(returnedPromise.state()).toEqual('rejected');
        });
    });

    describe('model.getExpirationDays', function() {
        beforeAll(function() {
            modelUnderTest.get = sinon.stub().returns('2015-02-31');
        });
        it('should have returned a number', function() {
            expect(_.isNumber(modelUnderTest.getExpirationDays())).toEqual(true);
        });
    });

});
