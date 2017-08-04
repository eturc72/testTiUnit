// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/adyenDevice.js - Functions for adyen device
 */

(function() {

    //---------------------------------------------------
    // ## VARIABLES

    var adyen = null;
    var logger = require('logging')('devices:payment', 'app/lib/adyenDevice');
    var EAUtils = require('EAUtils');
    try {
        logger.info('loading "com.demandware.adyen" module');
        adyen = require('com.demandware.adyen');
    } catch(ex) {
        logger.error('cannot load "com.demandware.adyen" module, exception: ' + ex);
        return null;
    }

    var features = ['multiple_terminals', 'payment_terminal_cancel'];

    // listener functions
    var onUpdateDeviceStatus,
        onLoginButtonClick,
        onLogoutButtonClick,
        onBoardButtonClick,
        onRemoveAllDevicesButtonClick,
        onLoginChangedStatus,
        onLoginChangedStatus,
        onLogoutSuccessful,
        onLoginCompletedSuccessfullyWithInfo,
        onSaveButtonClick,
        onBluetoothRadioButtonClick,
        onEthernetRadioButtonClick,
        onDevicesRefreshClick,
        onDevicesChanged,
        onDevicesListClick,
        onDeviceManagerComplete,
        onLoginUpdatedProgress,
        onLoginCompletedSuccessfullyWithInfo,
        onLoginFailedWithError,
        onAdyenInfo;

    var toolbar,
        loginButton,
        logoutButton,
        boardButton,
        removeAllDevicesButton,
        bluetoothRadioButton,
        saveButton,
        ethernetRadioButton,
        devicesRefresh,
        devicesList;

    // Adyen device handles signature prompting
    adyen.signaturePromptedViaDevice = true;

    // ADYLoginStatusLoggedOut = 0,
    // ADYLoginStatusLoggingIn = 1,
    // ADYLoginStatusLoggedIn = 2,
    // ADYLoginStatusLoggingOut = 3

    // ADYDeviceStatusInitializing, 0
    // ADYDeviceStatusInitialized, ...
    // ADYDeviceStatusNotBoarded,
    // ADYDeviceStatusError,
    // ADYDeviceStatusStopped,
    // ADYDeviceStatusGone

    var self = this;
    var loginDeferred = null;
    var boardingDeferred = null;
    var serverCancellationRetryCount = 0;
    var lastOrderNumber = null;
    var orderCounter = 0;

    //---------------------------------------------------
    // ## DEVICE LISTENERS

    adyen.addEventListener('loginUpdatedProgress', function(data) {
        data = data || {};
        logger.info('loginUpdatedProgress called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('loginFailedWithError', function(data) {
        data = data || {};
        logger.info('loginFailedWithError called: ' + data);
        loginDeferred.reject();
    });

    adyen.addEventListener('loginChangedStatus', function(data) {
        logger.info('loginChangedStatus called 1: ' + JSON.stringify(data));
        var msg = '';
        switch(data.loginStatus) {
        case 0:
            msg = _L('Logging In');
            break;
        case 1:
            msg = _L('Logged In');
            break;
        case 2:
            msg = _L('Pre-Settling');
            break;
        case 3:
            msg = _L('Verifying Token');
            break;
        case 4:
            msg = _L('Token Not Valid');
            break;
        case 5:
            msg = _L('Token Valid');
            break;
        case 6:
            msg = _L('Post-Settling');
            break;
        }
        notify(msg, {
            timeout : 4000
        });
    });

    adyen.addEventListener('deviceManagerWillBeginStep', function(data) {
        data = data || {};
        logger.info('deviceManagerWillBeginStep called: ' + data);
        var msg = '';
        switch(data.step) {
        case 0:
            msg = _L('Identify Payment Device');
            break;
        case 1:
            msg = _L('Register Payment Device');
            break;
        case 2:
            msg = _L('Load Configuration');
            break;
        case 3:
            msg = _L('Store Configuration');
            break;
        case 4:
            msg = _L('Check Configuration');
            break;
        }
        notify(msg);
    });

    adyen.addEventListener('deviceManagerDidCompleteStep', function(data) {
        data = data || {};
        logger.info('deviceManagerDidCompleteStep called: ' + data);
    });

    adyen.addEventListener('deviceManagerDidFailStep', function(data) {
        data = data || {};
        logger.info('deviceManagerDidFailStep called: ' + data);
        boardingDeferred.reject();
    });

    adyen.addEventListener('deviceManagerDidComplete', function(data) {
        data = data || {};
        logger.info('deviceManagerDidComplete called: ' + data);
        boardingDeferred.resolve();
        notify(_L('Device Boarded Successfully'));
    });

    adyen.addEventListener('transactionComplete', function(data) {
        data = data || {};
        logger.info('transactionComplete called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('transactionRequiresSignature', function(event) {
        event = event || {};
        logger.info('transactionRequiresSignature called: ' + JSON.stringify(event));
        if (event.image) {
            logger.info('image ' + event.image);
            if (Alloy.CFG.devices.adyen.signature_confirmation) {
                Alloy.eventDispatcher.trigger('payment:check_signature', event.image);
            } else {
                adyen.submitConfirmedSignature({
                    image : event.image
                });
            }
        } else {
            Alloy.eventDispatcher.trigger('payment:prompt_signature');
        }
    });

    adyen.addEventListener('transactionProvidesAdditionalData', function(data) {
        data = data || {};
        logger.info('transactionProvidesAdditionalData called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('transactionRequiresPrintedReceipt', function(data) {
        data = data || {};
        logger.info('transactionRequiresPrintedReceipt called: ' + JSON.stringify(data));
        adyen.confirmReceiptPrinted(true);
    });

    adyen.addEventListener('transactionStateChanged', function(data) {
        data = data || {};
        logger.info('transactionStateChanged called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('transactionApplicationSelected', function(data) {
        data = data || {};
        logger.info('transactionApplicationSelected called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('transactionPinDigitEntered', function(data) {
        data = data || {};
        logger.info('transactionPinDigitEntered called: ' + JSON.stringify(data));

        Alloy.eventDispatcher.trigger('payment_terminal:disable_cancel');
    });

    adyen.addEventListener('transactionCardRemoved', function(data) {
        data = data || {};
        logger.info('transactionCardRemoved called: ' + JSON.stringify(data));
    });

    adyen.addEventListener('payment:error', function(data) {
        data = data || {};
        logger.info('payment:error called: ' + JSON.stringify(data, null, 4));
        if (data.device_error) {
            // connection lost to the device
            Alloy.Router.checkPaymentDevice(true);
        } else {
            // execute in a timeout to avoid a possible race condition where the request to
            // cancel the transaction arrives before the transaction is created in the payment
            // provider's systems
            setTimeout(function() {
                var parts = data.merchantReference.split(":");
                logger.info('payment:error cancelServerTransaction called for order: ' + parts[0]);
                adyen.cancelServerTransaction({
                    order_no : parts[0]
                });
            }, 5000);

            Alloy.eventDispatcher.trigger('payment_terminal:dismiss');

            // payment error to report
            var message = data.transaction_error ? data.transaction_error : _L('Unknown error occured');
            Alloy.Dialog.showAlertDialog({
                messageString : String.format(_L('Please try the transaction again. %s'), message),
                titleString : _L('Payment Error')
            });
        }
    });

    adyen.addEventListener('payment:cancelled', function(data) {
        Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
        notify(_L('Payment transaction cancelled.'));
    });

    adyen.addEventListener('payment:declined', function(data) {
        data = data || {};
        logger.info('Payment declined: ' + JSON.stringify(data));
        Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
        Alloy.eventDispatcher.trigger('payment:cc_declined', data);
    });

    adyen.addEventListener('payment:not_final', function(data) {
        notify(_L('Payment transaction not finalized.'), {
            preventAutoClose : true
        });
    });

    adyen.addEventListener('payment:approved', function(data) {
        data = data || {};
        logger.info('Payment approved: ' + JSON.stringify(data));
        Alloy.eventDispatcher.trigger('payment:cc_approved', {
            owner : data.cardHolderName,
            card_type : data.cardString,
            pan : 'xxxx-xxxx-xxxx-' + data.cardNumber,
            month : data.cardExpiryMonth,
            year : data.cardExpiryYear,
            transaction_id : data.pspReference,
            payment_reference_id : data.pspAuthCode,
            tender_reference : data.tenderReference,
            terminal_id : data.terminalId,
            final_state : data.finalState,
            final_state_string : data.finalStateString,
            is_contactless : false
        });
    });

    adyen.addEventListener('payment:error_cancelling_server_transaction', function(data) {
        if (serverCancellationRetryCount < 2) {
            // if we are here, then we have already tried once
            serverCancellationRetryCount++;
            adyen.cancelServerTransaction({
                order_no : Alloy.Models.basket.getOrderNo()
            });
        } else {
            serverCancellationRetryCount = 0;
            Alloy.Dialog.showAlertDialog({
                messageString : String.format(_L('Error cancelling transaction with payment provider %s'), Alloy.Models.basket.getOrderNo())
            });
            logger.error('Attempt to cancel adyen payment transaction failed after 3 retries for order number ' + Alloy.Models.basket.getOrderNo());
        }
    });

    adyen.addEventListener('payment:cancelled_server_transaction', function(data) {
        serverCancellationRetryCount = 0;
    });

    //----------------------------------------------
    // ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

    /**
     * DEINIT - deinit for admin dashboard view
     *
     * @api public
     */
    adyen.deinit = function() {
        logger.info('DEINIT called');
        toolbar && toolbar.deinit();
        loginButton.removeEventListener('click', onLoginButtonClick);
        logoutButton.removeEventListener('click', onLogoutButtonClick);
        boardButton.removeEventListener('click', onBoardButtonClick);
        removeAllDevicesButton.removeEventListener('click', onRemoveAllDevicesButtonClick);
        adyen.removeEventListener('loginChangedStatus', onLoginChangedStatus);
        adyen.removeEventListener('loginFailedWithError', onLoginChangedStatus);
        adyen.removeEventListener('logoutSuccessful', onLogoutSuccessful);
        adyen.removeEventListener('loginCompletedSuccessfullyWithInfo', onLoginCompletedSuccessfullyWithInfo);
        saveButton.removeEventListener('click', onSaveButtonClick);
        bluetoothRadioButton.removeEventListener('click', onBluetoothRadioButtonClick);
        ethernetRadioButton.removeEventListener('click', onEthernetRadioButtonClick);
        devicesRefresh.removeEventListener('click', onDevicesRefreshClick);
        adyen.removeEventListener('devicesChanged', onDevicesChanged);
        devicesList.removeEventListener('click', onDevicesListClick);
        adyen.removeEventListener('deviceManagerDidCompleteStep', onUpdateDeviceStatus);
        adyen.removeEventListener('deviceManagerDidFailStep', onUpdateDeviceStatus);
        adyen.removeEventListener('loginUpdatedProgress', onLoginUpdatedProgress);
        adyen.removeEventListener('loginCompletedSuccessfullyWithInfo', onLoginCompletedSuccessfullyWithInfo);
        adyen.removeEventListener('loginFailedWithError', onLoginFailedWithError);
        adyen.removeEventListener('adyenInfo', onAdyenInfo);
    };

    //---------------------------------------------------
    // ## FUNCTIONS

    /**
     * acceptPayment - accept the payment from the device
     *
     * @param {Object} options
     *
     * @api public
     */
    adyen.acceptPayment = function(options) {
        var orderNo = Alloy.Models.basket.getOrderNo();

        adyen.needsSignature = false;
        options.currency = Alloy.Models.basket.getCurrency();

        // add order number for merchantReference field
        orderNo == lastOrderNumber ? orderCounter++ : orderCounter = 1;
        lastOrderNumber = orderNo;
        options.order_no = orderNo + ':' + orderCounter;

        adyen._acceptPayment(options);
    };

    /**
     * signatureApproved - Associate has confirmed and approved the signature of the customer
     *
     * @param {Object} options - contains the image that was approved
     *
     * @api public
     */
    adyen.signatureApproved = function(options) {
        logger.info('signatureApproved called: ' + JSON.stringify(options));
        adyen.needsSignature = false;
        adyen.submitConfirmedSignature(options);
    };

    /**
     * signatureCollected - Signature for card has been collected and ready for approval
     * by associate or submitting with order
     *
     * @param {Object} options - contains the image that was collected from customer
     *
     * @api public
     */
    adyen.signatureCollected = function(options) {
        logger.info('signatureApproved called: ' + JSON.stringify(options));
        adyen.needsSignature = false;
        if (Alloy.CFG.devices.adyen.signature_confirmation) {
            Alloy.eventDispatcher.trigger('payment:check_signature', options.image);
        } else {
            adyen.submitConfirmedSignature(options);
        }
    };

    /**
     * signatureDeclined - Associate has declined the signature of the customer
     *
     * @param {Object} options - contains the image of the signature
     *
     * @api public
     */
    adyen.signatureDeclined = function(options) {
        logger.info('signatureDeclined called');
        adyen.submitUnconfirmedSignature(options);
    };

    /**
     * verifyDeviceConnection - verify the connection to the device
     *
     * @api public
     */
    adyen.verifyDeviceConnection = function() {
        var connected = adyen._verifyDeviceConnection({});
        Alloy.Router.paymentDeviceConnectionChecked(connected);
        return connected;
    };

    /**
     * supports - determines if device supports feature
     *
     * @param {Object} feature
     * @return {Boolean} if feature is supported
     * @api public
     */
    adyen.supports = function(feature) {
        return !!(features.indexOf(feature) > -1);
    };

    /**
     * getNoDeviceConnectionImage - get the image to display for device
     *
     * @return {Image}
     * @api public
     */
    adyen.getNoDeviceConnectionImage = function() {
        return 'demandware/images/checkout/adyenPaymentTerminal.png';
    };

    /**
     * getNoDeviceConnectionMessage - get the message to display for not device connected
     *
     * @return {String}
     * @api public
     */
    adyen.getNoDeviceConnectionMessage = function() {
        return _L('No Connection To Payment Device Message Adyen');
    };

    /**
     * getConfigView - config view (right panel) for adming dashboard
     *
     * @return {Object} view
     * @api public
     */
    adyen.getConfigView = function() {
        logger.info('getConfigView');
        var config = _.extend(getSectionClass(), {
            contentWidth : '250',
            contentHeight : 'auto',
            showVerticalScrollIndicator : true,
            height : '100%',
            width : '100%',
            disableBounce : true
        });
        var contentView = Ti.UI.createScrollView(config);

        var usernameField = Ti.UI.createTextField({
            borderColor : '#000',
            width : 240,
            height : 28,
            left : 2,
            paddingLeft : 4,
            autocapitalization : Ti.UI.TEXT_AUTOCAPITALIZATION_NONE,
            autocorrect : false
        });
        var passwordField = Ti.UI.createTextField({
            borderColor : '#000',
            width : 240,
            height : 28,
            left : 2,
            paddingLeft : 4,
            passwordMask : true,
            autocapitalization : Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
        });
        var merchantIdField = Ti.UI.createTextField({
            borderColor : '#000',
            width : 240,
            height : 28,
            left : 2,
            paddingLeft : 4,
            autocapitalization : Ti.UI.TEXT_AUTOCAPITALIZATION_NONE
        });

        loginButton = Ti.UI.createButton(_.extend({
            title : _L('Login')
        }, getButtonClass(), {
            enabled : true
        }));
        logoutButton = Ti.UI.createButton(_.extend({
            title : _L('Logout')
        }, getButtonClass(), {
            enabled : false,
            left : 10
        }));

        boardButton = Ti.UI.createButton(_.extend({
            title : _L('Board')
        }, getButtonClass(), {
            enabled : false,
            top : 10,
            width : 250
        }));
        removeAllDevicesButton = Ti.UI.createButton(_.extend({
            title : _L('RemoveAllEthernetDevices')
        }, getButtonClass(), {
            enabled : true,
            top : 10,
            bottom : 60,
            width : 250
        }));

        toolbar = Alloy.createController('components/nextPreviousToolbar');
        toolbar.setTextFields([usernameField, passwordField, merchantIdField]);

        onLoginButtonClick = function() {
            logger.info('loginButton:click');
            // show an activity indicator during this potentially long running call
            loginDeferred = new _.Deferred();
            Alloy.Router.showActivityIndicator(loginDeferred);
            login();
        };
        loginButton.addEventListener('click', onLoginButtonClick);
        onLogoutButtonClick = function() {
            logger.info('logoutButton:click');
            logoutButton.setEnabled(false);
            logout();
        };
        logoutButton.addEventListener('click', onLogoutButtonClick);
        onBoardButtonClick = function() {
            logger.info('boardButton:click');
            boardButton.setEnabled(false);
            board();
        };
        boardButton.addEventListener('click', onBoardButtonClick);
        onRemoveAllDevicesButtonClick = function() {
            logger.info('removeAllDevicesButton:click');
            var deferred = new _.Deferred();
            Alloy.Router.showActivityIndicator(deferred);
            adyen.removeAllPaymentDevices();
            deferred.resolve();
            notify(_L('Removed All Payment Devices'));
        };
        removeAllDevicesButton.addEventListener('click', onRemoveAllDevicesButtonClick);

        onLoginChangedStatus = function(data) {
            logger.info('loginChangedStatus: ' + JSON.stringify(data));
            if (data.loginStatus == 0) {// logging in
                logoutButton.setEnabled(false);
            } else if (data.loginStatus == 1) {// logged in
                updateDeviceTableView(devicesList);
            }
        };
        adyen.addEventListener('loginChangedStatus', onLoginChangedStatus);

        onLoginChangedStatus = function(data) {
            loginButton.setEnabled(true);
            notify(_L('Login attempt failed. Re-enter your ID and password.'), {
                preventAutoClose : true
            });
        };
        adyen.addEventListener('loginFailedWithError', onLoginChangedStatus);

        onLogoutSuccessful = function(data) {
            logger.info('logoutSuccessful: ' + JSON.stringify(data));
            if (data.logoutStatus == 0) {
                loginButton.setEnabled(true);
                logoutButton.setEnabled(false);
                boardButton.setEnabled(true);
                removeAllDevicesButton.setEnabled(false);
                notify(_L('Logout Successful'));
                updateDeviceStatus();
            }
        };
        adyen.addEventListener('logoutSuccessful', onLogoutSuccessful);

        onLoginCompletedSuccessfullyWithInfo = function(data) {
            data = data || {};
            logger.info('loginCompletedSuccessfullyWithInfo called: ' + JSON.stringify(data));

            notify(_L('Login Successful'));
            loginButton.setEnabled(false);
            logoutButton.setEnabled(true);
            removeAllDevicesButton.setEnabled(true);
            loginDeferred.resolve();
        };
        adyen.addEventListener('loginCompletedSuccessfullyWithInfo', onLoginCompletedSuccessfullyWithInfo);

        var connType = Ti.App.Properties.getString('adyenConnType');
        var hostname = Ti.App.Properties.getString('adyenHostname');

        if (!connType) {
            connType = 'bluetooth';
            Ti.App.Properties.setString('adyenConnType', connType);
        }

        var radioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0,
            top : 0
        }));
        radioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Step 1: Configuration')
        }, getTitleClass())));

        var btRadioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'horizontal',
            left : 0,
            top : 2
        }));
        bluetoothRadioButton = Ti.UI.createImageView(_.extend({}, {
            image : connType == 'bluetooth' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0
        }));
        btRadioView.add(bluetoothRadioButton);
        btRadioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Bluetooth')
        }, getTextClass())));
        radioView.add(btRadioView);

        var ethRadioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'horizontal',
            left : 0,
            top : 2
        }));
        ethernetRadioButton = Ti.UI.createImageView(_.extend({}, {
            image : connType == 'ethernet' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0,
            bottom : 0
        }));
        ethRadioView.add(ethernetRadioButton);
        ethRadioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Ethernet')
        }, getTextClass())));
        radioView.add(ethRadioView);

        contentView.add(radioView);

        var enabled = connType == 'ethernet';
        var ethernetConfigView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0,
            top : 4
        }));

        ethernetConfigView.add(Ti.UI.createLabel(_.extend({
            text : _L('Hostname')
        }, getTitleClass())));
        var hostnameField = Ti.UI.createTextField({
            borderColor : '#000',
            left : 2,
            paddingLeft : 4,
            top : 1,
            width : 240,
            height : 28,
            bottom : 2,
            enabled : enabled,
            color : enabled ? Alloy.Styles.color.text.black : Alloy.Styles.color.text.light
        });
        if (hostname && hostname.length > 0) {
            hostnameField.setValue(hostname);
        }
        ethernetConfigView.add(hostnameField);

        saveButton = Ti.UI.createButton(_.extend({
            title : _L('Save')
        }, getButtonClass(), {
            width : 240,
            bottom : 20,
            left : 2,
            enabled : enabled
        }));
        onSaveButtonClick = function() {
            var hostname = hostnameField.getValue();
            if (hostname.length == 0) {
                notify(_L('You must provide a hostname.'));
                return;
            }
            var deferred = new _.Deferred();
            Alloy.Router.showActivityIndicator(deferred);
            Ti.App.Properties.setString('adyenHostname', hostname);

            var devices = adyen.allDevices({}) || [];
            var found = false;
            _.each(devices, function(dev) {
                if (dev.hostname == hostname) {
                    found = true;
                }
            });

            if (found) {
                deferred.resolve();
                notify(_L('Payment Device Already Registered: ') + hostname);
                return;
            }

            adyen.addPaymentDevice({
                hostname : hostname
            });
            setTimeout(function() {
                updateDeviceTableView(devicesList);
                deferred.resolve();
                notify(_L('Added Payment Device: ') + hostname);
            }, 1000);
        };
        saveButton.addEventListener('click', onSaveButtonClick);
        ethernetConfigView.add(saveButton);
        contentView.add(ethernetConfigView);

        onBluetoothRadioButtonClick = function() {
            Ti.App.Properties.setString('adyenConnType', 'bluetooth');
            bluetoothRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
            ethernetRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
            hostnameField.setEnabled(false);
            hostnameField.setColor(Alloy.Styles.color.text.light);
            saveButton.setEnabled(false);
        };
        bluetoothRadioButton.addEventListener('click', onBluetoothRadioButtonClick);
        onEthernetRadioButtonClick = function(data) {
            Ti.App.Properties.setString('adyenConnType', 'ethernet');
            bluetoothRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
            ethernetRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
            hostnameField.setEnabled(true);
            hostnameField.setColor(Alloy.Styles.color.text.black);
            saveButton.setEnabled(true);
        };
        ethernetRadioButton.addEventListener('click', onEthernetRadioButtonClick);
        // Login controls
        if (EAUtils.isSymbolBasedLanguage()) {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Step 2: Login to Adyen Portal')
            }, getTitleClass(), {
                font : Alloy.Styles.detailLabelFontSmall
            })));
        } else {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Step 2: Login to Adyen Portal')
            }, getTitleClass())));
        }
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Enter the adyen payment portal credentials.')
        }, getInfoTextClass())));

        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Merchant Account:')
        }, getTextClass())));
        contentView.add(merchantIdField);
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Username:')
        }, getTextClass())));
        contentView.add(usernameField);
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Password:')
        }, getTextClass())));
        contentView.add(passwordField);

        var loginOutView = Ti.UI.createView({
            height : 50,
            width : Ti.UI.SIZE,
            left : 0,
            layout : 'horizontal'
        });
        loginOutView.add(loginButton);
        loginOutView.add(logoutButton);
        contentView.add(loginOutView);
        if (EAUtils.isSymbolBasedLanguage()) {
            var availableDevicesLabel = Ti.UI.createLabel(_.extend({
                text : _L('Step 3: Select Device:')
            }, getTitleClass(), {
                top : 20,
                bottom : 14,
                font : Alloy.Styles.detailLabelFontSmall
            }));
        } else {
            var availableDevicesLabel = Ti.UI.createLabel(_.extend({
                text : _L('Step 3: Select Device:')
            }, getTitleClass(), {
                top : 20,
                bottom : 14
            }));
        }
        devicesRefresh = Ti.UI.createButton(_.extend({
            backgroundImage : Alloy.Styles.refreshButtonImage
        }, getRefreshButtonClass()));

        onDevicesRefreshClick = function() {
            devicesRefresh.animate(Alloy.Animations.bigBounce);
            updateDeviceTableView(devicesList);
        };
        devicesRefresh.addEventListener('click', onDevicesRefreshClick);

        onDevicesChanged = function(data) {
            logger.info('devicesChanged');
            updateDeviceTableView(devicesList);
        };
        adyen.addEventListener('devicesChanged', onDevicesChanged);

        var labelRefreshView = Ti.UI.createView({
            height : 30,
            width : Ti.UI.SIZE,
            left : 0,
            top : 0,
            layout : 'horizontal'
        });
        labelRefreshView.add(availableDevicesLabel);
        contentView.add(labelRefreshView);
        var textValue = _L('Selecting the device pairs the device with the EA application. If the device status does not change to "Initializing" when the device is selected, suspend & resume the device.');
        if (EAUtils.isSymbolBasedLanguage()) {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : textValue
            }, getInfoTextClass(), {
                font : Alloy.Styles.smallestErrorMessageFont,
                height : 50,
                width : 250,
                top : 10
            })));
        } else {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : textValue
            }, getInfoTextClass())));
        }
        var statusView = Ti.UI.createView({
            height : 30,
            width : Ti.UI.SIZE,
            left : 0,
            top : 0,
            layout : 'horizontal'
        });
        statusView.add(Ti.UI.createLabel(_.extend({
            text : _L('Device Status: ')
        }, getTitleClass(), {
            top : 10
        })));
        var deviceStatusLabel = Ti.UI.createLabel(_.extend({
            text : _L('Not selected')
        }, getTextClass(), {
            bottom : 5
        }));
        statusView.add(deviceStatusLabel);
        contentView.add(statusView);
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Possible Statuses')
        }, getInfoTextHeadingClass())));
        var textValue = _L('Stopped: Device not paired with App\nInitializing: Device paired with App; awaiting login\nNot Boarded: App logged into adyen; device not registered\nInitialized: Ready for Use');
        if (EAUtils.isSymbolBasedLanguage()) {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : textValue
            }, getInfoTextClass(), {
                font : Alloy.Styles.smallestErrorMessageFont
            })));
        } else {
            contentView.add(Ti.UI.createLabel(_.extend({
                text : textValue
            }, getInfoTextClass())));
        }
        contentView.add(devicesRefresh);

        // Devices list
        var devicesScrollView = Ti.UI.createScrollView(getScrollViewClass());
        devicesList = Ti.UI.createTableView(getTableViewClass());
        devicesScrollView.add(devicesList);
        if (adyen.isLoggedIn()) {
            updateDeviceTableView(devicesList);
        }
        onDevicesListClick = function(data) {
            var name = data.rowData.name;
            adyen.selectDevice(name);
            setTimeout(function() {
                updateDeviceTableView(devicesList);
            }, 1000);
            updateDeviceStatus();
        };
        devicesList.addEventListener('click', onDevicesListClick);
        contentView.add(devicesScrollView);
        contentView.add(boardButton);
        contentView.add(removeAllDevicesButton);

        // ADYDeviceStatusInitializing, 0
        // ADYDeviceStatusInitialized, ...
        // ADYDeviceStatusNotBoarded,
        // ADYDeviceStatusError,
        // ADYDeviceStatusStopped,
        // ADYDeviceStatusGone
        onDeviceManagerComplete = function() {
            adyenInfo.adyenInfo();
            updateDeviceStatus();
        };
        adyen.addEventListener('deviceManagerComplete', onDeviceManagerComplete);

        onUpdateDeviceStatus = function() {
            updateDeviceStatus();
        };
        adyen.addEventListener('deviceManagerDidCompleteStep', onUpdateDeviceStatus);
        adyen.addEventListener('deviceManagerDidFailStep', onUpdateDeviceStatus);

        updateLoginStatus();
        updateDeviceStatus();

        return contentView;

        /**
         * login - adyen login handling
         *
         * @api private
         */
        function login() {
            logger.info('login');
            var validated = true;

            // Capture login credentials
            var username = usernameField.value;
            var password = passwordField.value;
            var merchantId = merchantIdField.value;

            // This really should be a loop ...
            if (!username || username == '') {
                validated = false;
                // TODO: There should be a class defined for validation failure border color ...
                usernameField.borderColor = '#f00';
            } else {
                usernameField.borderColor = '#000';
            }
            if (!password || password == '') {
                validated = false;
                // TODO: There should be a class defined for validation failure border color ...
                passwordField.borderColor = '#f00';
            } else {
                passwordField.borderColor = '#000';
            }
            if (!merchantId || merchantId == '') {
                validated = false;
                // TODO: There should be a class defined for validation failure border color ...
                merchantIdField.borderColor = '#f00';
            } else {
                merchantIdField.borderColor = '#000';
            }

            if (!validated) {
                notify(_L('Please fill in all the required fields.'), {
                    preventAutoClose : true
                });
                loginDeferred.reject();
                return false;
            }

            // Clear the UI elements (one time capture)
            if (!Alloy.CFG.is_live) {
                //usernameField.value = passwordField.value = merchantIdField.value = '';
            }
            loginButton.setEnabled(false);
            // Do the login and potentially a boarding event as well ...
            adyen.login({
                username : username,
                password : password,
                merchantCode : merchantId
            });
        }

        /**
         * logout - adyen logout handling
         *
         * @api private
         */
        function logout() {
            logger.info('logout');

            adyen.logout();

            devicesList.setData([]);
            merchantIdField.value = '';
            usernameField.value = '';
            passwordField.value = '';
            boardButton.setEnabled(false);
        }

        /**
         * board - adyen boarding
         *
         * @api private
         */
        function board() {
            logger.info('board');

            boardingDeferred = new _.Deferred();
            Alloy.Router.showActivityIndicator(boardingDeferred);
            adyen.boardDevice();
        }

        /**
         * updateDeviceStatus - update the device status
         *
         * @api private
         */
        function updateDeviceStatus() {
            logger.info('updateDeviceStatus');

            var status = -1;
            var device = adyen.currentDevice();
            if (device && adyen.isLoggedIn()) {
                status = device.status;
            }

            switch( status ) {
            case -1:
                deviceStatusLabel.setText(_L('Not selected'));
                boardButton.enabled = false;

                break;
            case 0:
                deviceStatusLabel.setText(_L('Initializing...'));
                boardButton.enabled = false;
                break;
            case 1:
                deviceStatusLabel.setText(_L('Initialized'));
                boardButton.enabled = false;
                break;
            case 2:
                deviceStatusLabel.setText(_L('Not Boarded'));
                boardButton.enabled = true;
                break;
            case 3:
                deviceStatusLabel.setText(_L('Device Error'));
                break;
            case 4:
                deviceStatusLabel.setText(_L('Stopped'));
                boardButton.enabled = true;
                break;
            case 5:
                deviceStatusLabel.setText(_L('Disconnected'));
                break;
            }
        }

        /**
         * updateLoginStatus - update login status on buttons
         *
         * @api private
         */
        function updateLoginStatus() {
            var loggedIn = adyen.isLoggedIn();
            loginButton.setEnabled(!loggedIn);
            logoutButton.setEnabled(loggedIn);
            removeAllDevicesButton.setEnabled(loggedIn);
        }

        /**
         * updateDeviceTableView - update device table with device list
         *
         * @param {Array} devicesList
         *
         * @api private
         */
        function updateDeviceTableView(devicesList) {
            var devices = adyen.allDevices() || [];
            var device = adyen.selectedDevice();
            var selectedDevice = device ? device.name : null;
            var data = [];
            _.each(devices, function(device) {
                data.push({
                    title : device.name,
                    connection_type : device.connection_type,
                    name : device.name,
                    hostname : device.hostname,
                    hasCheck : selectedDevice && device.name == selectedDevice
                });
                if (selectedDevice && device.name == selectedDevice) {
                    // only update status if one is selected
                    updateDeviceStatus();
                }
            });
            if (devices.length == 0) {
                deviceStatusLabel.setText(_L('Not selected'));
            }
            devicesList.setData(data);
        }

    };

    /**
     * getInfoView - info view (left panel) for admin dashboard
     *
     * @return {Object} view
     * @api public
     */
    adyen.getInfoView = function() {
        var contentView = Ti.UI.createView(_.extend({}, getSectionClass()));
        var dataSectionLabel = Ti.UI.createLabel(_.extend({
            text : _L('Waiting for Adyen Info ...')
        }, getTitleClass()));

        contentView.add(dataSectionLabel);

        onLoginUpdatedProgress = function(data) {
            var progress = parseInt(data.progress * 100);
            dataSectionLabel.setText(String.format(_L('Logging in... %d complete.  Please wait.'), progress));
            dataSectionLabel.setColor(Alloy.Styles.accentColor);
            // reset color in case last color was red from an error
        };
        adyen.addEventListener('loginUpdatedProgress', onLoginUpdatedProgress);

        onLoginCompletedSuccessfullyWithInfo = function(data) {
            dataSectionLabel.setText(_L('Login successful.  Loading Adyen information.'));
            dataSectionLabel.setColor(Alloy.Styles.accentColor);
            // reset color in case last color was red from an error
            setTimeout(function() {
                adyen.adyenInfo();
            }, 500);
        };
        adyen.addEventListener('loginCompletedSuccessfullyWithInfo', onLoginCompletedSuccessfullyWithInfo);

        onLoginFailedWithError = function(data) {
            dataSectionLabel.setText(_L('Login failed with an error: ') + data.errorText);
            dataSectionLabel.setColor('#ff0000');
            // red
        };
        adyen.addEventListener('loginFailedWithError', onLoginFailedWithError);

        onAdyenInfo = function(info) {
            render(info);
        };

        adyen.addEventListener('adyenInfo', onAdyenInfo);

        render();

        // Trigger async info request from device / framework
        adyen.adyenInfo();

        return contentView;

        /**
         * render - renders the content info view
         *
         * @param {Object} data
         *
         * @api private
         */
        function render(data) {
            data = data || {};
            contentView.removeAllChildren();
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Application Information')
            }, getTitleClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Device Platform: ') + (data.devicePlatform || _L('n/a'))
            }, getTextClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Device Name: ') + (data.deviceName || _L('n/a'))
            }, getTextClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Device Version: ') + (data.deviceVersion || _L('n/a'))
            }, getTextClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Application Name: ') + (data.applicationName || _L('n/a'))
            }, getTextClass(), {
                bottom : 20
            })));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Adyen Information')
            }, getTitleClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Adyen Library Version: ') + (data.AdyenLibraryVersion || _L('n/a'))
            }, getTextClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Merchant Account: ') + (data.merchant || _L('n/a'))
            }, getTextClass())));
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Username: ') + (data.username || _L('n/a'))
            }, getTextClass())));
            var supportedMethodsArray = data.paymentMethods || [];
            var supportedMethods = supportedMethodsArray.length > 0 ? supportedMethodsArray.join(', ') : _L('n/a');
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Supported Payment Methods: ') + supportedMethods
            }, getTextClass())));
            var supportedCurrenciesArray = data.currencies || [];
            var supportedCurrencies = supportedCurrenciesArray.length > 0 ? supportedCurrenciesArray.join(', ') : _L('n/a');
            contentView.add(Ti.UI.createLabel(_.extend({
                text : _L('Supported Currencies: ') + supportedCurrencies
            }, getTextClass())));
        }

    };

    /**
     * getSectionClass - get section class styling
     *
     * @return {Object} style
     * @api private
     */
    function getSectionClass() {
        return {
            top : 15,
            left : 20,
            height : Ti.UI.SIZE,
            layout : 'vertical'
        };
    }

    /**
     * getTitleClass - get title class styling
     *
     * @return {Object} style
     * @api private
     */
    function getTitleClass() {
        return {
            font : Alloy.Styles.detailLabelFont,
            color : Alloy.Styles.accentColor,
            left : 0,
            bottom : 5
        };
    }

    /**
     * getTextClass - get text class styling
     *
     * @return {Object} style
     * @api private
     */
    function getTextClass() {
        return {
            font : Alloy.Styles.detailValueFont,
            left : 0
        };
    }

    /**
     * getInfoTextClass - get info text class styling
     *
     * @return {Object} style
     * @api private
     */
    function getInfoTextClass() {
        return {
            font : Alloy.Styles.detailInfoFont,
            left : 0,
            bottom : 4
        };
    }

    /**
     * getInfoTextHeadingClass - get text heading class styling
     *
     * @return {Object} style
     * @api private
     */
    function getInfoTextHeadingClass() {
        return {
            font : Alloy.Styles.detailInfoBoldFont,
            left : 0
        };
    }

    /**
     * getButtonClass - get button class styling
     *
     * @return {Object} style
     * @api private
     */
    function getButtonClass() {
        return {
            font : Alloy.Styles.smallButtonFont,
            backgroundImage : Alloy.Styles.primaryButtonImage,
            backgroundDisabledImage : Alloy.Styles.buttons.primary.backgroundDisabledImage,
            color : Alloy.Styles.buttons.primary.color,
            width : 115,
            height : 30,
            left : 2,
            top : 10,
            bottom : 10
        };
    }

    /**
     * getRefreshButtonClass - get refresh button styling
     *
     * @return {Object} style
     * @api private
     */
    function getRefreshButtonClass() {
        return {
            backgroundColor : 'transparent',
            color : Alloy.Styles.color.text.white,
            width : 24,
            height : 24,
            left : 210,
            top : 0,
            bottom : 6
        };
    }

    /**
     * getScrollViewClass - get scrollview class styling
     *
     * @return {Object} style
     * @api private
     */
    function getScrollViewClass() {
        return {
            borderWidth : 2,
            borderColor : '#bbb',
            borderRadius : 5,
            height : 100,
            width : 250,
            top : 0,
            left : 0
        };
    }

    /**
     * getTableViewClass - get table view class styling
     *
     * @return {Object} style
     * @api private
     */
    function getTableViewClass() {
        return {
            left : 0,
            top : 0,
            width : 250,
            height : 750,
            scrollable : true,
            editable : false,
            rowHeight : 40,
            style : Ti.UI.iOS.TableViewStyle.PLAIN
        };
    }

    //---------------------------------------------------
    // ## CONSTRUCTOR

    adyen.setup();

    module.exports = adyen;
})();
