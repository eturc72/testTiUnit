// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/appSettings.js - Functions for configurations database manipulation
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('devices:barcodeScanner', 'app/lib/barcodeScanner');

//---------------------------------------------------
// ## FUNCTIONS

/**
 * INIT
 *
 * @api public
 */
function init() {
    var scanner = null;
    try {
        logger.info('loading "com.demandware.barcodeScanner" module');
        scanner = Alloy.barcodeScanner || require('com.demandware.barcodeScanner');
    } catch(ex) {
        logger.error('cannot load "com.demandware.barcodeScanner" module, exception: ' + ex);
        return null;
    }

    logger.info('entered');

    if (!scanner) {
        return null;
    }

    logger.info('not null');

    var cameraWindow = null;
    var windowOpen = false;
    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'app:login', function() {
        logger.info('received app:login event');
        if (windowOpen) {
            closeCameraWindow();
        }
    });

    Ti.Gesture.addEventListener('orientationchange', function() {
        Titanium.API.info('Orientation changed');
        scanner.orientationChanged({
            orientation : (Ti.Gesture.orientation == Ti.UI.LANDSCAPE_RIGHT ? 'right' : 'left')
        });
    });

    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'barcode:start_camera', function(event) {
        if (!Alloy.CFG.enable_barcode_scanner || windowOpen) {
            return;
        }

        event = event || {};
        logger.info('got barcodeScanner:start event: ' + JSON.stringify(event));

        cameraWindow = Ti.UI.createWindow({
            backgroundColor : 'black'
        });

        var video = Ti.UI.createView({
            backgroundColor : 'transparent',
            top : 0,
            right : 0,
            bottom : 0,
            left : 0
        });
        cameraWindow.add(video);

        var hasFlash = scanner.supportsCameraFlash({});

        var buttonBar = Ti.UI.createView({
            backgroundColor : 'transparent',
            layout : 'horizontal',
            horizontalWrap : false,
            width : hasFlash ? 150 : 50,
            height : 50,
            top : 20,
            right : 0
        });

        createFlashControls(hasFlash, buttonBar);

        var cancelButton = Ti.UI.createButton({
            backgroundImage : Alloy.Styles.clearTextImage,
            backgroundColor : 'transparent',
            color : '#fff',
            right : 10,
            accessibilityLabel : 'barcode_close'
        });
        cancelButton.addEventListener('click', function() {
            closeCameraWindow();
        });
        buttonBar.add(cancelButton);

        cameraWindow.add(buttonBar);
        allowAppSleep(false);
        cameraWindow.open();
        windowOpen = true;

        scanner.startScanner({
            videoView : video,
            acceptedBarcodeScannerTypes : Alloy.CFG.acceptedBarcodeScannerTypes,
            orientation : (Ti.Gesture.orientation == Ti.UI.LANDSCAPE_RIGHT ? 'right' : 'left')
        });
    });

    scanner.addEventListener('barcode:scan', function(event) {
        event = event || {};
        logger.info('got barcodeScanner:stop event: ' + JSON.stringify(event));

        if (!event.barcode_type || !event.code) {
            return;
        }

        if (!windowOpen) {
            return;
        }

        cameraWindow.close();
        windowOpen = false;

        var barcode = event.code;
        // if the leading char is 0, which is the country code for US and Canada, then strip it off because it is not entered.
        if (event.barcode_type == 'org.gs1.EAN-13' && barcode.length == 13 && barcode.charAt(0) == '0') {
            barcode = barcode.substr(1);
        }
        Alloy.Router.navigateToProductSearch({
            query : barcode,
            category_id : Alloy.CFG.root_category_id
        });

        allowAppSleep(true);
        cameraWindow = null;
    });

    /**
     * closeCameraWindow - close the camera window
     *
     * @api private
     */
    function closeCameraWindow() {
        logger.info('closing camera window');
        cameraWindow.close();
        windowOpen = false;
        scanner.stopScanner();
        allowAppSleep(true);

        cameraWindow = null;
    }

    /**
     * createFlashControls - create flash controls
     *
     * @param {Object} hasFlash
     * @param {Object} buttonBar
     *
     * @api private
     */
    function createFlashControls(hasFlash, buttonBar) {
        if (hasFlash) {
            var flashLabel = Ti.UI.createLabel({
                text : _L('Light'),
                color : '#fff',
                backgroundColor : 'transparent',
                right : 10
            });
            buttonBar.add(flashLabel);

            var flashSwitch = Ti.UI.createSwitch({
                value : false,
                color : 'white',
                backgroundColor : 'transparent',
                right : 10
            });
            flashSwitch.addEventListener('change', function() {
                flashSwitch.value ? scanner.toggleFlash({
                    mode : 'on'
                }) : scanner.toggleFlash({
                    mode : 'off'
                });
            });
            buttonBar.add(flashSwitch);
        }
    }

    return scanner;
}

module.exports = init();
