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
        'logging':  sinon.stub().returns({info:sinon.stub()}),
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

    describe('ucfirst', function(){

        it("should return Eric", function(){
            expect(controllerUnderTest.ucfirst("eric")).toEqual("Eric");
        });
        it("should return undefined", function(){
            expect(controllerUnderTest.ucfirst(undefined)).toEqual(undefined);
        });

     });

    describe("getFullControllerPath", function(){
        it("should return app/controllers/appendPath", function(){
            expect(controllerUnderTest.getFullControllerPath("appendPath")).toEqual("app/controllers/appendPath");
        });
        it("should return app/controllers/noChangeAfter", function(){
            expect(controllerUnderTest.getFullControllerPath("app/controllers/noChangeAfter")).toEqual("app/controllers/noChangeAfter");
        });
        it("should return noChangeBefore/app/controllers/", function(){
            expect(controllerUnderTest.getFullControllerPath("noChangeBefore/app/controllers/")).toEqual("noChangeBefore/app/controllers/");
        });
        it("should return app/controllers//app/controllers", function(){
            expect(controllerUnderTest.getFullControllerPath("/app/controllers")).toEqual("app/controllers//app/controllers");
        });
        it("should return app/controllers/app/controllers", function(){
            expect(controllerUnderTest.getFullControllerPath("app/controllers")).toEqual("app/controllers/app/controllers");
        });
    });

    describe("supportLog", function(){
        var msgString = '123Test'
        beforeEach(function(){
            Alloy.Globals.consoleLog = {
                unshift : sinon.stub(),
                pop : sinon.stub()
            };

            spyOn(Alloy.Globals.consoleLog, 'unshift');
            spyOn(Alloy.Globals.consoleLog, 'pop');
        });

        it("should call unshift and execute pop()", function(){
            Alloy.Globals.consoleLog.length = 101;
            controllerUnderTest.supportLog(msgString);
            //expect(Alloy.Globals.consoleLog.unshift).toHaveBeenCalled();
            expect(Alloy.Globals.consoleLog.unshift).toHaveBeenCalledWith(msgString);
            expect(Alloy.Globals.consoleLog.pop).toHaveBeenCalled();
            });
        it("should call unshift and not pop()", function(){
            Alloy.Globals.consoleLog.length = 99;
            controllerUnderTest.supportLog(msgString);
            //expect(Alloy.Globals.consoleLog.unshift).toHaveBeenCalled();
            expect(Alloy.Globals.consoleLog.unshift).toHaveBeenCalledWith(msgString);
            expect(Alloy.Globals.consoleLog.pop).not.toHaveBeenCalled();
            });

    });

    describe("setRuntimeLoggableCategories", function(){
        var categories = new Array('Test1', 'Test2', 'Test3');
        beforeAll(function(){
            controllerUnderTest.setRuntimeLoggableCategories(categories);
        });
        it("should set Alloy.Globals.runtimeLoggableCategories to ['test1', 'test2', 'test3']", function(){
            expect(Alloy.Globals.runtimeLoggableCategories).toEqual(categories);
        });
    });

    describe("allowAppSleep", function(){
        beforeAll(function(){
            Ti.App.idleTimerDisabled = true;
            controllerUnderTest.allowAppSleep(true);
        });
        it("should set Ti.App.idleTimerDisabled to false", function(){
           expect(Ti.App.idleTimerDisabled).toEqual(false);
        });
    });


});
