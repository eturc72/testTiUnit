var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

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
        'alloyAdditions': {},
        'appResume': {},
        'imageUtils': {},
        'alloy/moment': {},
        'com.demandware.SwissArmyUtils': {
            'redirectConsoleLogToFile': sinon.stub()
        },
        'alloy/styles/demandware': {},
        'DialogMgr': sinon.stub()
    };

    var controllerUnderTest = proxyquire('../../app/alloy.js', stub);

    describe('Alloy.Globals.resetCookies', function() {

        beforeAll(function() {
            Alloy.Globals.resetCookies();
        });

        it('should have called http.clearCookies', function() {
            expect(clearCookies.called).toEqual(true);
        });

        it('should have called http.clearCookies twice', function() {
            expect(clearCookies.callCount).toEqual(2);
        });

        it('should have called http.clearCookies with http://demandware.com', function() {
            expect(clearCookies.calledWith('http://demandware.com')).toEqual(true);
        });

        it('should have called http.clearCookies with https://demandware.com', function() {
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

    describe("getLoggableCategories", function(){
        var categories = new Array('Test1:Test1a:Test1b', 'Test2', 'Test3');
        var categoriesProcessed = new Array('Test2', 'Test3');
        var categories1 = new Array('TestA', 'TestB:TestB1:TestB2', 'TestC');
        var categories1Processed = new Array('TestA', 'TestC');
        //beforeAll(function(){
            //Alloy.Globals.runtimeLoggableCategories =
        //});
        it("should set loggableCategories to Alloy.Globals.runtimeLoggableCategories", function(){
            Alloy.Globals.runtimeLoggableCategories = categories;
            Alloy.CFG.loggableCategories = categories1;
            var result = controllerUnderTest.getLoggableCategories();
            expect(result.loggableCategories).toEqual(categoriesProcessed);
            expect(result.loggableSubcategories).toEqual({ Test1: [ [ 'Test1a', 'Test1b' ] ] });
        });
         it("should set loggableCategories to Alloy.CFG.loggableCategories", function(){
            Alloy.Globals.runtimeLoggableCategories = undefined;
            Alloy.CFG.loggableCategories = categories1;
            var result = controllerUnderTest.getLoggableCategories();
            expect(result.loggableCategories).toEqual(categories1Processed);
            expect(result.loggableSubcategories).toEqual({ TestB: [ [ 'TestB1', 'TestB2' ] ] });
        });
    });

    describe("removeAllChildren", function(){
        var view = {
            //getChildren: sinon.stub().returns([{getChildren: sinon.stub(), remove: sinon.stub()}]),
            getChildren: function(){
            return [{getChildren: sinon.stub(), remove: sinon.stub()}]
            },
            remove: sinon.stub()
        };
        beforeAll(function(){

            //spyOn(view, 'getChildren');
            //spyOn(view, 'remove');
            controllerUnderTest.removeAllChildren(view);
        });
        it("should remove all children from a view", function(){
        //expect(true).toEqual(true)

            expect(view.getChildren).toHaveBeenCalled;
            expect(view.remove.callCount).toHaveBeenCalled;
        });
    });

    describe("notify", function(){

    });
});

