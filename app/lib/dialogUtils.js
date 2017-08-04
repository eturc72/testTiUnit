// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/diaglogUtils.js - Functions for handling dialogs
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('utils:dialogUtils', 'app/lib/dialogUtils');

var notifyGrowl = null;

//---------------------------------------------------
// ## PUBLIC API

exports.showActivityIndicator = showActivityIndicator;
exports.showNotifyGrowl = showNotifyGrowl;
exports.removeNotifyGrowl = removeNotifyGrowl;
exports.showAlertDialog = showAlertDialog;
exports.showConfirmationDialog = showConfirmationDialog;
exports.showCustomDialog = showCustomDialog;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showActivityIndicator - show an activity indicator that will go away when the deferred is resolved/rejected
 *
 * @param {Deferred} deferred - when the deferred is complete the activity indicator will go away
 * @api public
 */
function showActivityIndicator(deferred) {
    // create a full screen window that will absorb all clicks
    var win = Titanium.UI.createWindow({
        fullScreen : true,
        touchEnabled : true
    });
    var activityIndicator = Ti.UI.createActivityIndicator({
        style : Ti.UI.ActivityIndicatorStyle.BIG,
        height : 100,
        width : 100,
        backgroundColor : Alloy.Styles.color.background.darkest,
        borderColor : Alloy.Styles.color.border.white,
        borderRadius : 20,
        opacity : 0.8
    });
    var dismiss = function() {
        Alloy.eventDispatcher.stopListening(Alloy.eventDispatcher, 'hideAuxillaryViews', dismiss);
        if (win) {
            win.close();
            win.remove(activityIndicator);
            win = null;
            activityIndicator.hide();
            activityIndicator = null;
        }
    };
    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', dismiss);

    // if you really need the indicator to go away, double tap
    activityIndicator.addEventListener('doubletap', dismiss);

    activityIndicator.show();
    win.add(activityIndicator);
    win.open();

    deferred.always(dismiss);
}

/**
 * showNotifyGrowl - Shows a notification growl with a message
 *
 * @param {Object} args - the arguments for the notifyGrowl
 *   label:  localized string to display in the notify
 *   timeout: time before the notify is auto closed
 *   preventAutoClose: keep the notify up for errors the user should confirm
 * @api public
 */
function showNotifyGrowl(args) {
    if (notifyGrowl && !notifyGrowl.getPreventAutoClose()) {
        // if this notify will go away, set a new message and it will reset the timer for closing notify
        notifyGrowl.setMessage(args.label);
        if (args.preventAutoClose) {
            // if notify is up and new message is preventAutoClose then change the notify to prevent autoclose
            notifyGrowl.setPreventAutoClose(true);
        }
    } else {
        // if the message is the same we don't want to put up another dialog (in case network connection is lost you don't want to close multiple notifies for each request)
        if (!notifyGrowl || (notifyGrowl && notifyGrowl.getPreventAutoClose() && notifyGrowl.getMessage() != args.label)) {
            removeNotifyGrowl(null, true).always(function() {
                notifyGrowl = showCustomDialog({
                    controllerPath : 'components/notifyGrowl',
                    initOptions : args,
                    continueEvent : 'notifyGrowl:dismiss',
                    continueFunction : function() {
                        notifyGrowl = null;
                    },
                    ignoreHideAuxillary : true,
                    fadeOut : true
                });
            });
        }
    }
}

/**
 * removeNotifyGrowl - Removes any notification growls that may still be up
 *
 * @param {String} message - message to remove notify for
 * @param {Boolean} wait - if a wait notify
 * @return {Deferred} promise
 * @api public
 */
function removeNotifyGrowl(message, wait) {
    var deferred = new _.Deferred();
    if (notifyGrowl) {
        if (message) {
            // remove a specific notify message, like Network is unavailable, but only if message matches
            if (notifyGrowl.getMessage() == message) {
                notifyGrowl.dismiss();
            }
            deferred.resolve();
        } else if (wait && notifyGrowl.getPreventAutoClose()) {
            // don't close something that the user is required to acknowledge
            notifyGrowl.once('notifyGrowl:dismiss', function() {
                deferred.resolve();
            });
        } else {
            notifyGrowl.dismiss();
            deferred.resolve();
        }
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * showAlertDialog - Show an alert dialog with one OK button and a message.  The title says Alert.
 *
 * Available args
 * @param {Object} args - the arguments for the confirmation dialog, for example
 *   messageString: localized string for the message in the dialog
 *   okFunction (optional): function to call when ok (primary button) is clicked
 *   titleString (optional): localized for the title in the dialog, (default is Alert)
 *   okButtonString (optional): localized string for the primary button, (default is OK)
 * @api public
 */
function showAlertDialog(args) {
    showConfirmationDialog(_.extend({
        hideCancel : true,
        titleString : _L('Alert')
    }, args));
}

/**
 * showConfirmationDialog - Show a confirmation dialog with one or two buttons and a message with title
 *
 * Available args
 * @param {Object} args - the arguments for the confirmation dialog, for example
 *   messageString: localized string for the message in the dialog
 *   icon (optional): icon to display to the left of the message
 *   okFunction (optional): function to call when ok (primary button) is clicked
 *   titleString (optional): localized for the title in the dialog, (default is Confirm)
 *   okButtonString (optional): localized string for the primary button, (default is OK)
 *   cancelButtonString (optional): localized string for the secondary button, (default is Cancel)
 *   cancelFunction (optional): function to call when cancel (secondary button) is clicked
 * @api public
 */
function showConfirmationDialog(args) {
    if (!args.messageString) {
        logger.error('showConfirmationDialog messageString was not specified');
        return;
    }
    var controllerPath = 'components/ConfirmationDialog';
    var controllerArgs = {
        okButtonString : args.okButtonString,
        cancelButtonString : args.cancelButtonString,
        hideCancel : args.hideCancel,
        icon : args.icon,
        messageString : args.messageString,
        titleString : args.titleString
    };
    showCustomDialog({
        controllerPath : controllerPath,
        options : controllerArgs,
        cancelEvent : 'confirmation_dialog:dismiss',
        cancelFunction : function() {
            if (_.isFunction(args.cancelFunction)) {
                args.cancelFunction();
            }
        },
        continueEvent : 'confirmation_dialog:continue',
        continueFunction : function() {
            if (_.isFunction(args.okFunction)) {
                args.okFunction();
            }
        }
    });
}

/**
 * showCustomDialog - Show a custom dialog from a controller.  The controller must have init and deinit exported.
 *
 * Available args
 * @param {Object} args - the arguments for the confirmation dialog, for example:
 *  controllerPath - the path for the popover controller
 *  continueEvent - the name of the event that is triggered when the dialog should be closed and continue occurs
 *  options (optional) - options sent to the controller creation as arguments
 *  initOptions (optional) - options sent to the init function of the controller
 *  cancelEvent (optional) - the name of the event that is triggered when the dialog should be closed and cancel occurs
 *  cancelFunction (optional) - the function to be called when cancel occurs
 *  continueFunction (optional) - the function to be called when continue occurs
 *  ignoreHideAuxillary (optional) - false by default - hideAuxillaryViews event will not close the dialog, instead on logout (for notify/growl messages)
 *  fadeOut (optional) - false by default - animation to fade out the dialog (for notify/growl messages)
 *  fullScreen (optional) - false by default - for dialog that cover more than 90% of the screen (this means that although the showdialog function is being used focus will be taken away from previously displayed view)
 *  viewName (optional) -  The name of the view  or dialog to which app is navigating to. Set it if needed by the handler.
 * @return {Controller} controller - the controller that is created
 * @api public
 */
function showCustomDialog(args) {

    if (!args.controllerPath) {
        logger.error('showCustomDialog controllerPath was not specified');
        return;
    }
    if (!args.continueEvent) {
        logger.error('showCustomDialog continueEvent was not specified');
        return;
    }

    if (args.fullScreen) {
        Alloy.eventDispatcher.trigger('app:navigation', {
            view : args.viewName
        });
    } else {
        Alloy.eventDispatcher.trigger('app:dialog_displayed', {
            view : args.viewName
        });
    }
    var customDialog = Alloy.createController(args.controllerPath, args.options);
    var drawer = customDialog.getView();
    var ignoreHideAuxillary = args.ignoreHideAuxillary || false;
    var fadeOut = args.fadeOut || false;

    /**
     * closeDialog - for hideAuxillaryViews or associate_logout depending on dialog
     * @param {Object} event
     */
    var closeDialog = function(event) {
        // we only need to do this once
        if (customDialog) {
            logger.info('closeDialog called as an external hide occurred');
            // trigger the close so the caller of this dialog can cleanup if needed
            customDialog.trigger(args.continueEvent, event);
        }
    };

    var createListener = function(eventName, functionName) {
        if (!eventName) {
            return;
        }
        customDialog.once(eventName, function(event) {
            logger.info('customDialog event called ' + eventName + ' for ' + args.controllerPath);
            if (customDialog) {
                // we may want the dialog to stick around, like for notify/growl messages that need user interaction for errors,
                // but we still want it to go away on logout
                if (!ignoreHideAuxillary) {
                    Alloy.eventDispatcher.stopListening(Alloy.eventDispatcher, 'hideAuxillaryViews', closeDialog);
                } else {
                    Alloy.eventDispatcher.stopListening(Alloy.eventDispatcher, 'associate_logout', closeDialog);
                }
                Alloy.Dialog.dismissModalDialog(drawer, fadeOut);
                logger.info('customDialog calling DEINIT for ' + args.controllerPath);
                customDialog.stopListening();
                customDialog.deinit && customDialog.deinit();
                customDialog = null;
                // finally tell the caller of this dialog we are done
                if (_.isFunction(functionName)) {
                    // allow the dialog to close before calling the function
                    setTimeout(function() {
                        functionName(event);
                    }, 100);
                }
            }
        });
    };
    createListener(args.cancelEvent, args.cancelFunction);
    createListener(args.continueEvent, args.continueFunction);
    if (!ignoreHideAuxillary) {
        Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', closeDialog);
    } else {
        Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'associate_logout', closeDialog);
    }

    if (customDialog.init) {
        logger.info('customDialog calling INIT for ' + args.controllerPath);
        var promise = customDialog.init(args.initOptions);
        if (promise && _.isFunction(promise.always)) {
            var deferred = new _.Deferred();
            showActivityIndicator(deferred);
            promise.always(function() {
                deferred.resolve();
                Alloy.Dialog.presentModalDialog(drawer);
            });
        } else {
            Alloy.Dialog.presentModalDialog(drawer);
        }
    } else {
        Alloy.Dialog.presentModalDialog(drawer);
    }
    return customDialog;
}
