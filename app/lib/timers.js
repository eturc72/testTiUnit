// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/timers.js - sets up timers for server session keep alive and application timeout
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('application:timers', 'app/lib/timers');

//---------------------------------------------------------------
// Associate idle login and Associate session keep alive
// Need to start and stop this during login/logout in case config values change on the server
(function() {
    var appSessionTimer = null;
    var sessionDialogTimer = null;
    //
    // //### SESSION KEEP-ALIVE
    var serverSessionTimer = null;

    //---------------------------------------------------
    // ## APP LISTENERS

    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', onConfigsPostLogin);
    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'configurations:unload', onConfigsUnload);

    // This exposes a decouple API to renew the session timeout timer
    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'session:renew', renewSessionTimer);

    //---------------------------------------------------
    // ## FUNCTIONS

    /**
     * associateTimeout - occurs when the application session times out as there was no activity
     *
     * @api private
     */
    function associateTimeout() {
        logger.info('Client timeout occurred for id ' + appSessionTimer);
        var currentAssociate = Alloy.Models.associate;
        if (currentAssociate && currentAssociate.isLoggedIn()) {
            clearInterval(appSessionTimer);
            appSessionTimer = null;
            Alloy.Router.hideHamburgerMenu();
            var sessionConfirmDialog = Alloy.Dialog.showCustomDialog({
                controllerPath : 'components/sessionTimeoutConfirmation',
                continueEvent : 'session_timeout_confirmation:continue',
                continueFunction : function() {
                    // not a renew b/c we already cleared the interval
                    startAppSessionTimer();
                },
                cancelEvent : 'session_timeout_confirmation:end_session',
                cancelFunction : function() {
                    Alloy.Router.associateLogout();
                }
            });
            sessionDialogTimer = setTimeout(function() {
                sessionConfirmDialog.dismiss();
            }, Alloy.CFG.session_timeout_dialog_display_time);
        }
    }

    /**
     * sessionRenewTimeout - occurs when the server session times out and we need to ping the server
     * to keep the session alive
     *
     * @api private
     */
    function sessionRenewTimeout() {
        logger.info('Server Session Keep-Alive PING');
        require('Validations').validateDevices(true);
    }

    /**
     * renewSessionTimer - session needs to be renewed for client usage
     * This could be called at the same time, need to ensure we remove
     *
     * @api private
     */
    function renewSessionTimer() {
        var currentAssociate = Alloy.Models.associate;
        if (appSessionTimer && currentAssociate && currentAssociate.isLoggedIn()) {
            startAppSessionTimer();
        }
    }

    /**
     * startAppSessionTimer - starts the timer for the application timeout
     *
     * @api private
     */
    function startAppSessionTimer() {
        logger.info('Starting Client Session Timeout for ' + Alloy.CFG.session_timeout);
        stopAppSessionTimer();
        appSessionTimer = setInterval(associateTimeout, Alloy.CFG.session_timeout);
        logger.info('Client Session new timer id ' + appSessionTimer);

    }

    /**
     * stopAppSessionTimer - clear the timers for the application
     *
     * @api private
     */
    function stopAppSessionTimer() {
        logger.info('Stopping Client Session Timeout');
        if (appSessionTimer) {
            logger.info('Client Session clear timer id ' + appSessionTimer);
            clearInterval(appSessionTimer);
            appSessionTimer = null;
        }
        if (sessionDialogTimer) {
            clearTimeout(sessionDialogTimer);
            sessionDialogTimer = null;
        }
    }

    /**
     * startServerSessionKeepAlive - start the timer for the session keep alive
     *
     * @api private
     */
    function startServerSessionKeepAlive() {
        logger.info('Starting Server Session Keep-Alive PING for ' + Alloy.CFG.session_keep_alive);
        if (Alloy.CFG.session_keep_alive) {
            // Validate device on an interval to keep the session alive
            serverSessionTimer = setInterval(sessionRenewTimeout, Alloy.CFG.session_keep_alive);
        }
    }

    /**
     * stopServerSessionKeepAlive - remove the timers for the server session keep alive
     *
     * @api private
     */
    function stopServerSessionKeepAlive() {
        logger.info('Stopping Server Session Keep-Alive PING');
        if (serverSessionTimer) {
            clearInterval(serverSessionTimer);
            serverSessionTimer = null;
        }
    }

    /**
     * onConfigsPostLogin - startup timers when the user logs in
     *
     * @api private
     */
    function onConfigsPostLogin() {
        startServerSessionKeepAlive();
        startAppSessionTimer();
    }

    /**
     * onConfigsUnload - stop timers when the user logs out
     *
     * @api private
     */
    function onConfigsUnload() {
        stopServerSessionKeepAlive();
        stopAppSessionTimer();
    }

})();

