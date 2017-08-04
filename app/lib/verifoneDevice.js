// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/verifoneDevice.js - Functions for verifone device
 */

(function() {

    //---------------------------------------------------
    // ## VARIABLES

    var verifone = null;
    var eaUtils = require('EAUtils');
    var logger = require('logging')('devices:payment', 'app/lib/verifoneDevice');
    try {
        logger.info('loading "com.demandware.verifone" module');
        verifone = require('com.demandware.verifone');
    } catch(ex) {
        logger.error('cannot load "com.demandware.verifone" module, exception: ' + ex);
        return null;
    }

    // listener methods
    var onRegistartClick,
        onVerifoneRegistart,
        onManualButton,
        onSwipeButton,
        onEmailButton,
        onMagneticCardData,
        registartButton;

    var infoView = null;
    var features = ['barcode_scanner', 'manual_entry', 'payment_terminal_cancel', 'gift_cards', 'solicited'];
    var terminalID = null;

    verifone.needsSignature = false;
    verifone.signaturePromptedViaDevice = false;

    //---------------------------------------------------
    // ## DEVICE LISTENERS

    verifone.addEventListener('barcodeReady', function() {
        logger.info('Barcode Device Enabled');
        verifone.scannerOn();
    });

    verifone.addEventListener('pinpadReady', function() {
        logger.info('Pinpad Device Enabled');
    });

    verifone.addEventListener('connectionState', handleConnectionState);
    verifone.addEventListener('barcodeDataWithType', handleBarcodeDataWithType);
    verifone.addEventListener('magneticCardData', handleMagneticCardData);
    verifone.addEventListener('manualCardDataOn', handleManualCardDataOn);
    verifone.addEventListener('manualCardDataOff', handleManualCardDataOff);
    verifone.addEventListener('magneticCardEncryptedData', handleMagneticCardEncryptedData);
    verifone.addEventListener('magneticCardError', handleMagneticCardError);
    verifone.addEventListener('magneticCardTimeout', handleMagneticCardTimeout);
    verifone.addEventListener('magneticCardCancelled', handleMagneticCardCancelled);

    verifone.addEventListener('payment:error', function(error) {
        if (error && error.device_error) {
            // FIXME: We need to localize the message for end-user consumption
            Alloy.Dialog.showAlertDialog({
                messageString : error.device_error
            });
        } else if (error && error.transaction_error) {
            // FIXME: We need to localize the message for end-user consumption
            notify(error.transaction_error, {
                preventAutoClose : true
            });
        }
    });

    //----------------------------------------------
    // ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

    /**
     * DEINIT - deinit for admin dashboard view
     *
     * @api public
     */
    verifone.deinit = function() {
        logger.info('DEINIT called');
        registartButton.removeEventListener('click', onRegistartClick);
        verifone.removeEventListener('registart', onVerifoneRegistart);
        swipeButton.removeEventListener('click', onSwipeButton);
        manualButton.removeEventListener('click', onManualButton);
        emailButton.removeEventListener('click', onEmailButton);
        verifone.removeEventListener('magneticCardData', onMagneticCardData);
        verifone.removeEventListener('deviceInfo', createContentView);
    };

    //---------------------------------------------------
    // ## FUNCTIONS

    /**
     * handleMagneticCardData - handles the magnetic card data
     *
     * @param {Object} data
     * @api private
     */
    function handleMagneticCardData(data) {
        logger.secureLog('verifone:magneticCardData\n' + JSON.stringify(data, null, 2));
        var pan = '' + data.pan;
        if (pan && pan.length < 13 && Alloy.CFG.gift_cards_available) {
            Alloy.eventDispatcher.trigger('payment:gift_card_data', {
                track_1 : data.track1,
                track_2 : data.track2,
                is_contactless : data.contactless == 'true'
            });
        } else if (pan && pan.length >= 13) {
            Alloy.eventDispatcher.trigger('payment:credit_card_data', {
                track_1 : data.track1,
                track_2 : data.track2,
                pan : data.pan,
                month : data.month,
                year : data.year,
                is_contactless : data.contactless == 'true',
                terminal_id : data.terminal_id
            });
        } else {
            Alloy.Dialog.showAlertDialog({
                messageString : _L('Card number entered is invalid. Please cancel payment and try again.')
            });
        }
    }

    /**
     * handleMagneticCardEncryptedData - handle magnetic card encrypted data
     *
     * @param {Object} data
     * @api private
     */
    function handleMagneticCardEncryptedData(data) {
        logger.secureLog('verifone:magneticCardEncryptedData\n' + JSON.stringify(data, null, 2));
    }

    /**
     * handleConnectionState - handle connection state data
     *
     * @param {Object} data
     * @api private
     */
    function handleConnectionState(data) {
        logger.info('verifone:connectionState\n' + JSON.stringify(data, null, 2));
    }

    /**
     * handleBarcodeDataWithType - handle barcode data with type
     *
     * @param {Object} data
     * @api private
     */
    function handleBarcodeDataWithType(data) {
        logger.info('verifone:barcodeDataWithType\n' + JSON.stringify(data, null, 2));

        logger.info('Searching for something with: ' + data.barcode);
        var barcode = ('' + data.barcode).trim();

        if (barcode.indexOf('{') == 0) {
            var data = JSON.parse(barcode);
            Alloy.eventDispatcher.trigger('barcode:json', data);
            Alloy.Models.basket.setCustomerInfo({
                email : data.email
            }).done(function() {
                delete data.email;
                Alloy.Models.basket.setShippingAddress(data);
            });
            return;
        }

        // TODO: Hard-coded to match length to route direct to PDP
        Alloy.Router.navigateToProductSearch({
            query : barcode,
            category_id : Alloy.CFG.root_category_id
        });
    }

    /**
     * handleMagneticCardError - handle magnetic card error
     *
     * @param {Object} data
     * @api private
     */
    function handleMagneticCardError(data) {
        logger.info('verifone:magneticCardError\n' + JSON.stringify(data, null, 2));
        if (data.hasOwnProperty('message')) {
            Alloy.eventDispatcher.trigger('payment:cc_error', data);
        }
    }

    /**
     * handleManualCardDataOn - handle manual card data on
     *
     * @param {Object} data
     * @api private
     */
    function handleManualCardDataOn(data) {
        Alloy.eventDispatcher.trigger('payment_terminal:manual_card_data_on', data);
    }

    /**
     * handleManualCardDataOff - handle manual card data off
     *
     * @param {Object} data
     * @api private
     */
    function handleManualCardDataOff(data) {
        Alloy.eventDispatcher.trigger('payment_terminal:manual_card_data_off', data);
    }

    /**
     * handleMagneticCardTimeout - handle magnetic card timeout
     *
     * @api private
     */
    function handleMagneticCardTimeout() {
        verifone.cancelPayment();
        Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
    }

    /**
     * handleMagneticCardCancelled - handle magnetic card cancelled
     *
     * @api private
     */
    function handleMagneticCardCancelled() {
        Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
    }

    /**
     * acceptPayment - tell device to accept card payment
     *
     * @param {Object} data
     * @api public
     */
    verifone.acceptPayment = function(data) {
        if (!data.hasOwnProperty('manual')) {
            data.timeout = Alloy.CFG.devices.verifone.card_swipe_timeout > 0 ? Alloy.CFG.devices.verifone.card_swipe_timeout : 120;
        }
        if (Alloy.CFG.devices.verifone.hasOwnProperty('use_alternate_card_entry')) {
            data.options.use_alternate_card_entry = Alloy.CFG.devices.verifone.use_alternate_card_entry;
        } else {
            data.options.use_alternate_card_entry = true;
        }
        verifone._acceptPayment(data);
    };

    /**
     * cancelServerTransaction - cancel server transaction
     *
     * @api public
     */
    verifone.cancelServerTransaction = function() {
        // This is a no-op. Needs to be implemented by the payment classes.
    };

    /**
     * signatureApproved - Associate has confirmed and approved the signature of the customer
     *
     * @api public
     */
    verifone.signatureApproved = function() {
        logger.info('signatureApproved called');
        // Not used for verifone
    };

    /**
     * signatureCollected - Signature for card has been collected and ready for approval
     * by associate or submitting with order
     *
     * @api public
     */
    verifone.signatureCollected = function() {
        logger.info('signatureApproved called');
        // Not used for verifone
    };

    /**
     * signatureDeclined - Associate has declined the signature of the customer
     *
     * @api public
     */
    verifone.signatureDeclined = function() {
        logger.info('signatureDeclined called');
        // Not used for verifone
    };

    /**
     * verifyDeviceConnection - verify the device connection
     *
     * @return {Boolean} connected
     * @api public
     */
    verifone.verifyDeviceConnection = function() {
        var connected = verifone._verifyDeviceConnection();
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
    verifone.supports = function(feature) {
        return !!(features.indexOf(feature) > -1);
    };

    /**
     * getNoDeviceConnectionMessage - get the message to display for not device connected
     *
     * @return {String}
     * @api public
     */
    verifone.getNoDeviceConnectionMessage = function() {
        return _L('No Connection To Payment Device Message Verifone');
    };

    /**
     * getNoDeviceConnectionImage - get the image to display for device
     *
     * @return {Image}
     * @api public
     */
    verifone.getNoDeviceConnectionImage = function() {
        return 'demandware/images/checkout/verifonePaymentTerminal.png';
    };

    // Admin Dashboard support.  Settings & device setup controls.

    /**
     * getConfigView - config view (right panel) for adming dashboard
     *
     * @return {Object} view
     * @api public
     */
    verifone.getConfigView = function() {
        var contentView = Ti.UI.createView(_.extend({}, getSectionClass()));
        var scrollView = Ti.UI.createScrollView({
            borderColor : '#a8a8a8',
            height : 160,
            left : 4,
            width : '90%'
        });
        var consoleView = Ti.UI.createLabel({
            text : '',
            width : '100%'
        });
        scrollView.add(consoleView);

        registartButton = Ti.UI.createButton(_.extend({
            title : _L('Registart')
        }, getButtonClass()));
        onRegistartClick = function() {
            // Do the login and potentially a boarding event as well ...
            verifone.registart();
        };
        registartButton.addEventListener('click', onRegistartClick);
        onVerifoneRegistart = function(event) {
            var http = Ti.Network.createHTTPClient({
                timeout : Alloy.CFG.storefront.timeout,
                validatesSecureCertificate : Alloy.CFG.storefront.validate_secure_cert
            });
            var validation_url = eaUtils.buildStorefrontURL('https', Alloy.CFG.devices.verifone.registart_url);
            logger.log('request', 'registart request POST ' + validation_url);
            var deferred = new _.Deferred();
            var body = {
                terminal_id : terminalID,
                track_1 : event.track1,
                track_2 : event.track2
            };
            Alloy.Router.showActivityIndicator(deferred);
            http.open('POST', validation_url);
            http.onload = function(eResp) {
                logger.info('request-success', 'registart request GET ' + validation_url);
                if (http.responseText) {
                    logger.secureLog('registart response ' + JSON.stringify(http.responseText, null, 2), 'request-response');
                }
                if (http.status == 200 && http.responseText) {
                    var response = {};
                    try {
                        response = JSON.parse(http.responseText);
                        if (response.httpStatus && response.httpStatus == '200') {
                            consoleView.setText(_L('VALID DEVICE') + '\n\n' + JSON.stringify(response, null, 2) + '\n\n' + JSON.stringify(event, null, 2));
                        } else {
                            http.onerror(eResp);
                        }
                    } catch (ex) {
                        logger.error('cannot parse registart response: ' + ex.message);
                        http.onerror(eResp);
                    }
                } else {
                    http.onerror(eResp);
                }
                deferred.resolve();
            };

            http.onerror = function(eResp) {
                logger.error('registart error occurred!\n url: ' + validation_url + '\n status: [' + http.status + ']\n response: [' + http.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');
                consoleView.setText(_L('Cannot validate device') + '\n\n' + http.status + '\n\n' + validation_url + '\n\n' + JSON.stringify(http.responseText, null, 2) + '\n\n' + JSON.stringify(event, null, 2));
                deferred.reject();
                notify(_L('Unable to registart device.'), {
                    preventAutoClose : true
                });
            };

            http.send(body);
        };
        verifone.addEventListener('registart', onVerifoneRegistart);
        swipeButton = Ti.UI.createButton(_.extend({
            title : _L('Swipe Card')
        }, getButtonClass(), {
            bottom : 0
        }));
        onSwipeButton = function() {
            verifone.acceptPayment({
                amount : 1.00,
                options : {
                    solicited : true
                }
            });
        };
        swipeButton.addEventListener('click', onSwipeButton);
        manualButton = Ti.UI.createButton(_.extend({
            title : _L('Manual Entry')
        }, getButtonClass()));
        onManualButton = function() {
            verifone.acceptPayment({
                amount : 1.00,
                options : {
                    manual : true
                }
            });
        };
        manualButton.addEventListener('click', onManualButton);
        emailButton = Ti.UI.createButton(_.extend({
            title : _L('Email')
        }, getButtonClass()));
        onEmailButton = function(data) {
            var text = consoleView.text;
            if (text && text.length > 0) {
                eaUtils.emailLogs(text);
            }
        };
        emailButton.addEventListener('click', onEmailButton);
        onMagneticCardData = function(data) {
            consoleView.setText(JSON.stringify(data, null, 2));
        };
        verifone.addEventListener('magneticCardData', onMagneticCardData);

        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Registart Heading')
        }, getTitleClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Registart is necessary to initiate VSP encryption between server and client.')
        }, getTextClass())));
        contentView.add(registartButton);
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Capturing Data')
        }, getTitleClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Trigger a solicited swipe, to test basic functionality.')
        }, getTextClass())));
        contentView.add(swipeButton);
        contentView.add(manualButton);

        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Console')
        }, getTitleClass())));
        contentView.add(scrollView);
        contentView.add(emailButton);

        return contentView;
    };

    /**
     * getInfoView - info view (left panel) for admin dashboard
     *
     * @return {Object} view
     * @api public
     */
    verifone.getInfoView = function() {
        var contentView = Ti.UI.createView(_.extend({}, getSectionClass()));
        var dataSectionLabel = Ti.UI.createLabel(_.extend({
            text : _L('Waiting for device information...')
        }, getTitleClass()));

        contentView.add(dataSectionLabel);
        infoView = contentView;

        verifone.addEventListener('deviceInfo', createContentView);

        // Trigger async info request from device / framework
        verifone.deviceInfo();

        return contentView;
    };

    /**
     * createContentView - create the content view
     *
     * @param {Object} data
     * @api private
     */
    function createContentView(data) {
        var contentView = infoView;

        logger.secureLog('Device Info: ' + JSON.stringify(data, null, 2));
        terminalID = data.pinpadSerialNumber;
        contentView.removeAllChildren();
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Device Information')
        }, getTitleClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Device Name: ') + data.pinpadName
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Serial Number: ') + data.pinpadSerialNumber
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Manufacturer: ') + data.pinpadManufacturer
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Model Number: ') + data.pinpadModelNumber
        }, getTextClass())));

        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Version Information')
        }, getTitleClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Hardware Revision: ') + data.pinpadHardwareRevision
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Framework Revision: ') + data.frameworkVersion
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('XPI Version: ') + data.xpiVersion
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('VSP Version: ') + data.vspVersion
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('EMV Version: ') + data.emvVersion
        }, getTextClass())));
        contentView.add(Ti.UI.createLabel(_.extend({
            text : _L('Encryption Type: ') + data.encryptionMode
        }, getTextClass())));
    }

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
            bottom : 10
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
     * getButtonClass - get button class styling
     *
     * @return {Object} style
     * @api private
     */
    function getButtonClass() {
        return {
            font : Alloy.Styles.smallButtonFont,
            backgroundImage : Alloy.Styles.primaryButtonImage,
            color : Alloy.Styles.buttons.primary.color,
            width : 240,
            height : 30,
            left : 4,
            top : 10,
            bottom : 40
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
            borderWidth : 2,
            borderColor : '#bbb',
            borderRadius : 5,
            width : 250,
            height : 160,
            left : 1,
            scrollable : true,
            editable : false,
            rowHeight : 40,
            style : Ti.UI.iOS.TableViewStyle.PLAIN
        };
    }

    //---------------------------------------------------
    // ## CONSTRUCTOR

    verifone.setup();
    verifone.displayMessage({
        line1 : 'Welcome to the',
        line2 : 'Salesforce',
        line3 : 'Commerce Cloud',
        line4 : 'Endless Aisle'
    });

    module.exports = verifone;
})();