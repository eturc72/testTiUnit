// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/appResume.js - handling of application resume
 */

//---------------------------------------------------
// ## VARIABLES

(function() {

    var logger = require('logging')('application:appResume', 'app/lib/appResume');

    Ti.App.launchURL = '';
    Ti.App.pauseURL = '';

    var prefix = Alloy.CFG.app_url_scheme + '://';
    var lastPause = -1;

    //---------------------------------------------------
    // ## APP LISTENERS

    if ('ipad' == Ti.Platform.osname || 'iphone' == Ti.Platform.osname) {
        var cmd = Ti.App.getArguments();
        logger.info('Launched app on ios: \nArguments:\n' + JSON.stringify(Ti.App.getArguments()));
        if (cmd && cmd.hasOwnProperty('url')) {
            Ti.App.launchURL = cmd.url;
            logger.info('Launched with url = ' + Ti.App.launchURL);
        }

        /**
         * open - listener for when the app is opened.
         */
        Ti.App.addEventListener('open', function(event) {
            logger.info('Open: ' + JSON.stringify(event) + '\nArguments:\n' + JSON.stringify(Ti.App.getArguments()));
        });

        /**
         * close - listener for when the app closed.
         */
        Ti.App.addEventListener('close', function(event) {
            logger.info('Close: ' + JSON.stringify(event) + '\nArguments:\n' + JSON.stringify(Ti.App.getArguments()));
            // If Alloy.Router doesn't exist then we haven't loaded appIndex yet and don't need to logout
            Alloy.Router && Alloy.Router.associateLogout();
        });

        /**
         * pause - listener for when the app is paused.
         */
        Ti.App.addEventListener('pause', function(event) {
            logger.info('Pause: ' + JSON.stringify(event) + '\nArguments:\n' + JSON.stringify(Ti.App.getArguments()));
            Ti.App.pauseURL = Ti.App.launchURL;
            Alloy.lastPause = new Date().getTime();
        });

        /**
         * resumed - listener for when the app is resumed from a non active state (Application Delegate applicationWillEnterForeground)
         * with iOS 9 this is triggered from Safari Dialog when using URL scheme, with iOS 10 this is not triggered, but handleurl is instead.
         */
        Ti.App.addEventListener('resumed', function(event) {
            logger.info('Resumed: ' + JSON.stringify(event) + '\nArguments:\n' + JSON.stringify(Ti.App.getArguments()));
            var now = new Date().getTime(),
                nextTimeout = Alloy.lastPause + Alloy.CFG.session_timeout;

            if (now > nextTimeout) {
                logger.info('Session Timeout exceeded!  Triggering a logout & restart.');
                // If Alloy.Router doesn't exist then we haven't loaded appIndex yet and don't need to logout
                Alloy.Router && Alloy.Router.associateLogout();
            } else {
                logger.info('Last Pause: ' + Alloy.lastPause + ' Now: ' + now + ' Next Timeout in ' + (nextTimeout - now) + 'ms');
            }
        });

        /**
         * handleurl - listener for when the application is called with a url scheme, most likely from SafariDialog
         * works with iOS 9 and iOS 10
         */
        Ti.App.iOS.addEventListener('handleurl', function(event) {
            logger.info('handleurl: ' + JSON.stringify(event));
            // only do something if this was launched via safari dialog
            if (event.launchOptions.source == 'com.apple.SafariViewService') {
                Alloy.eventDispatcher.trigger('appLaunch:browserUrl', event.launchOptions);
                logger.info('Safari resumed app.');
            }
        });
    }
})();
