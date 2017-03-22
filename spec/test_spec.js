describe('test begin...', function() {
    /*
     * Creates all gloal functions
     */
    require('./global.js');

    var config = require('./config.json');

    /*
     * Get the Ti namespace from the enclosed api.jsca
     */
    Ti = require('tiunit/jsca.api.parser').parse();

    /*
     * Get the Ti namespace from your own api.jsca
     */
    // Ti = require('tiunit/jsca.api.parser').parseFromConfig();

    /*
     * Typically, your controller contains a lot of references to objects and properties in it's view, which are referenced on $:
     */
    // Generate the mock for $
    $ = require('tiunit/mockcontroller').createControllerMock(config.rootDir + '/app/controllers/index.js');

    // mocking $.label.text
    $.label = {
        text: 'hello world'
    };

    // Controller we are going to test
    var controllerUnderTest = require('../app/controllers/index.js');


    beforeEach(function() {
        console.log(L('=============================== Initializing spec  ==============================='));
        spyOn(Ti.API, 'warn');
        spyOn(Ti.App, 'fireEvent');
    });

    it('returns true when there is no network available', function(done) {
        spyOn(Ti.Network, 'getNetworkType').and.returnValue(Ti.Network.NETWORK_NONE);

        var result = controllerUnderTest.isNetworkPresent();

        expect(result).toBe(false);
        expect(Ti.API.warn).toHaveBeenCalledWith("Please connect to a network and try again");
        done();
    });

    it('returns true when there is network available', function(done) {
        spyOn(Ti.Network, 'getNetworkType').and.returnValue(Ti.Network.NETWORK_WIFI);

        var result = controllerUnderTest.isNetworkPresent();

        expect(result).toBe(true);
        expect(Ti.App.fireEvent).toHaveBeenCalledWith("bar");
        expect(Ti.API.warn).not.toHaveBeenCalled();
        done();
    });

    it('On click', function(done) {

        spyOn(Ti.UI, 'createAlertDialog').and.returnValue({
            //mocking the show function
            show: function() {}
        });
        controllerUnderTest.doClick();

        expect(Ti.UI.createAlertDialog).toHaveBeenCalled();
        done();
    });

});
