## Unit Testing with Jasmine, Ti.Unit and Istanbul


### Installation


1.	Copy package.json from [repo TBD] and paste it at the root location of your project
2.	Go to your terminal and cd to project root location
3.	Run “npm install” in the terminal
4.	Create a directory named “spec” under the root location of your project
5.	Navigate to node_modules/tiunit/ , copy helpers directory and paste it under “spec”
6.	Navigate to node_modules/tiunit/support, copy parser.json it under “spec/support”
7.	Copy jasmine.son from [repo TBD]  and paste it under “spec/support”
8.	Copy config.json and global.js from [repo TBD]  and paste them under “spec”
9.	Supply the right path to the rootDir property in config.json if you will be needing the root directory path later on in your code
10.	Supply the right path to the path property in parser.json
11.	All your testfiles should end with spec.js and they should all go under the “spec” directory


### Writing your test

Let assume that we want to test the controller under /app/controllers/index.js which contains the code bellow

```sh
function doClick(e) {
    Ti.UI.createAlertDialog({
        message: $.label.text,
        ok: 'Okay',
        title: 'File Deleted'
    }).show();
}

$.index.open();

function isNetworkPresent() {
    if (_.isEqual(Ti.Network.NETWORK_NONE, Ti.Network.getNetworkType())) {
        Ti.API.warn('Please connect to a network and try again');
        console.log('The network is not present');
        return false;
    } else {
        Ti.App.fireEvent('bar');
        console.log('The network is present');
        return true;
    }
}

module.exports = {
    isNetworkPresent: isNetworkPresent,
    doClick: doClick
};

```

Now let's create helloworld_spec.js under the spec folder

```sh

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


```
#### Mocking the Ti namespace

The framework generates a mock for the whole Ti namespace, based on api.jsca. The mock can be generated on the embedded api.jsca but also on your own version of api.jsca.

Get the Ti namespace from the enclosed api.jsca

```sh
Ti = require('tiunit/jsca.api.parser').parse();
```
Get the Ti namespace from your own api.jsca

```sh
Ti = require('tiunit/jsca.api.parser').parseFromConfig();
```

If you want to use your own api.jsca, the path (folders only) to your local api.jsca configuration must be configured in support/parser.json:

```sh
{
  "path": "/Applications/Appcelerator\\ Studio/plugins/com.appcelerator.titanium.core_3.1.2.<find this number by navigation to the pligin dir>/resources/jsca"
}
```
(it's best to exclude parser.json in your .gitignore file)
