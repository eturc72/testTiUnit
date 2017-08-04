// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/DialogMgr.js - Functions for handling dialogs
 */

//---------------------------------------------------
// ## VARIABLES

var animation = require('alloy/animation');
var logger = require('logging')('utils:DialogMgr', 'app/lib/DialogMgr');

/**
 * DialogMgr - manager of model dialogs
 *
 * @api public
 */
function DialogMgr(mainWindow, options) {
    var options = null,
        dialogView = null,
        window = null,
        backdrop = null;

    /**
     * showNotifyGrowl - exposes showNotifyGrowl from dialogUtils as Alloy.Dialog.showNotifyGrowl
     * This is a helper function to display notification growls.
     *
     * @api public
     */
    this.showNotifyGrowl = require('dialogUtils').showNotifyGrowl;

    /**
     * removeNotifyGrowl - exposes removeNotifyGrowl from dialogUtils as Alloy.Dialog.removeNotifyGrowl
     * This is a helper function to remove notification growls.
     *
     * @api public
     */
    this.removeNotifyGrowl = require('dialogUtils').removeNotifyGrowl;

    /**
     * showCustomDialog - exposes showCustomDialog from dialogUtils as Alloy.Dialog.showCustomDialog
     * This is a helper function to avoid management of controller lifecycle and presentModalDialog and dismissModalDialog.
     *
     * @api public
     */
    this.showCustomDialog = require('dialogUtils').showCustomDialog;

    /**
     * showConfirmationDialog - exposes showConfirmationDialog from dialogUtils as Alloy.Dialog.showConfirmationDialog
     * This is a helper function to display a confirmation type message.
     *
     * @api public
     */
    this.showConfirmationDialog = require('dialogUtils').showConfirmationDialog;

    /**
     * showAlertDialog - exposes showAlertDialog from dialogUtils as Alloy.Dialog.showAlertDialog
     * This is a helper function to display an alert type message.
     *
     * @api public
     */
    this.showAlertDialog = require('dialogUtils').showAlertDialog;

    /**
     * presentDialog - will present a view with a backdrop so that the view is the only thing that can be clicked, used by dropdown
     * The view is attached to the parents edge.  Use with dismissDialog.
     *
     * @param {Ti.UI.View} newDialogView view to be displayed
     * @param {Object} options related to the new view
     * @api public
     */
    this.presentDialog = function(newDialogView, options) {
        logger.info('presentDialog called');
        // if any other dialogs are up, close them
        this.dismissDialog();
        options = options || {};

        var properties;

        // Check to see if attached to sourceView
        if (options.parent) {
            // Check to see if preferredSide
            if (options.preferredSide == 'bottom') {
                // Calculate absolute coords of top,left of view
                var parentBounds = options.parent.rect,
                    origin = {
                    x : 0,
                    y : 0
                };
                origin.y += parentBounds.height + this.options.distance;
                var topLeft = options.parent.convertPointToView(origin, this.window);

                logger.info('parentBounds height: ' + parentBounds.height);
                logger.info('parentBounds width: ' + parentBounds.width);
                logger.info('topLeft x: ' + topLeft.x);
                logger.info('topLeft y: ' + topLeft.y);

                var availableSpaceBelow = this.window.size.height - topLeft.y - this.options.minMargin;
                var availableSpaceAbove = topLeft.y - this.options.minMargin - parentBounds.height;

                var effectiveHeight;

                if (availableSpaceBelow < options.preferredHeight && availableSpaceAbove > availableSpaceBelow) {
                    effectiveHeight = options.preferredHeight > availableSpaceAbove ? availableSpaceAbove : options.preferredHeight;

                    /* drop down goes above*/
                    properties = {
                        top : topLeft.y - parentBounds.height - effectiveHeight,
                        left : topLeft.x,
                        width : parentBounds.width,
                        height : effectiveHeight
                    };
                } else {
                    effectiveHeight = options.preferredHeight > availableSpaceBelow ? availableSpaceBelow : options.preferredHeight;

                    /* drop down goes below*/
                    properties = {
                        top : topLeft.y,
                        left : topLeft.x,
                        width : parentBounds.width,
                        height : effectiveHeight
                    };
                }
            }
        } else {
            logger.info('NOT ATTACHED TO PARENT');
        }

        if (properties) {
            newDialogView.applyProperties(properties);
        }

        this.window.add(this.backdrop);
        this.window.add(newDialogView);
        newDialogView.setZIndex(999);
        this.dialogView = newDialogView;
    };

    /**
     * dismissDialog - will remove the dialogView from the window and the backdrop
     * Use with presentDialog.
     *
     * @api public
     */
    this.dismissDialog = function() {
        if (this.dialogView) {
            logger.info('dismissDialog removing view ' + JSON.stringify(this.dialogView, null, 4));
            this.window.remove(this.dialogView);
            this.window.remove(this.backdrop);
            this.dialogView = null;
        }
    };

    /**
     * presentModalDialog - adds a new modal dialog to the window and sets the zIndex so it will appear on top.
     * Use with dismissModalDialog.
     *
     * @param {Ti.UI.View} view to add to the window
     * @api public
     */
    this.presentModalDialog = function(view) {
        logger.info('presentModalDialog called for view ' + JSON.stringify(view, null, 4));
        this.dismissDialog();
        view.setZIndex(101);
        this.window.add(view);
    };

    /**
     * setWindow - changes the main window for dialogs to appear on top of
     *
     * @param {Ti.UI.View} mainWindow the window to use for the modal dialog (either index or appIndex)
     * @api public
     */
    this.setWindow = function(mainWindow) {
        this.window = mainWindow;
    };

    /**
     * getWindow - returns the main window for dialogs on which they wil be placed
     *
     * @api public
     */
    this.getWindow = function(){
    	return this.window;
    };

    /**
     * dismissModalDialog - will remove the modal dialog from the window.
     * Use with presentModalDialog
     *
     * @param {Ti.UI.View} view the view of the dialog to remove from the window
     * @api public
     */
    this.dismissModalDialog = function(view, fadeOut) {
        logger.info('dismissModalDialog called for view ' + JSON.stringify(view, null, 4));
        if (fadeOut) {
            animation.fadeAndRemove(view, 500, this.window);
        } else {
            this.window.remove(view);
        }
    };

    //---------------------------------------------------
    // ## CONSTRUCTOR

    this.options = _.extend({
        opacity : 0.02,
        minMargin : 10,
        distance : 0,
        backgroundColor : Alloy.Styles.color.background.white
    }, options);
    this.window = mainWindow;
    this.backdrop = Ti.UI.createView({
        backgroundColor : this.options.backgroundColor,
        opacity : this.options.opacity,
        left : 0,
        right : 0,
        top : 0,
        bottom : 0
    });
    // in case we put a dialog (dropdown) on top of a modal dialog
    this.backdrop.setZIndex(200);
    logger.info('adding click listener');
    var self = this;
    this.backdrop.addEventListener('click', function() {
        self.dismissDialog();
    });
}

module.exports = DialogMgr;
