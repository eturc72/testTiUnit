require('../global.js');
var proxyquire =  require('proxyquire').noCallThru();
var config = require('../config.json');

describe('app/alloy.js', function() {

    Ti = require('tiunit/jsca.api.parser').parse();

    var clearCookies = sinon.spy();

    Ti.UI.create2DMatrix = sinon.stub().returns({
        scale: sinon.stub()
    });

    Ti.Network.createHTTPClient = sinon.stub().returns({
        'clearCookies': clearCookies
    });

    var stub =  {
        'logging':  sinon.stub(),
        'appConfiguration':{
            'loadDefaultConfigs': sinon.stub()
        },
        'alloyAdditions':{},
        'appResume':{},
        'imageUtils':{},
        'alloy/moment':{},
        'com.demandware.SwissArmyUtils':{
            'redirectConsoleLogToFile': sinon.stub()
        },
        'alloy/styles/demandware':{},
        'DialogMgr': sinon.stub()
    };

    var controllerUnderTest = proxyquire('../../app/alloy.js', stub);

    describe('Alloy.Globals.resetCookies', function(){

        beforeAll(function(){
            Alloy.Globals.resetCookies();
        });

        it('should have called http.clearCookies', function(){
            expect(clearCookies.called).toEqual(true);
        });

        it('should have called http.clearCookies twice', function(){
            expect(clearCookies.callCount).toEqual(2);
        });

        it('should have called http.clearCookies with http://demandware.com', function(){
            expect(clearCookies.calledWith('http://demandware.com')).toEqual(true);
        });

        it('should have called http.clearCookies with https://demandware.com', function(){
            expect(clearCookies.calledWith('https://demandware.com')).toEqual(true);
        });
    });

});
