// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/epsonPrinter.js - functions for the epson printer
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('devices:printer', 'app/lib/epsonPrinter');

/**
 * INIT
 *
 * @api private
 */
function init() {
    var printer = null;
    try {
        logger.info('loading "com.demandware.EpsonReceipt" module');
        printer = require('com.demandware.EpsonReceipt');
    } catch(ex) {
        logger.error('cannot load "com.demandware.EpsonReceipt" module, exception: ' + ex);
        return null;
    }

    var selectedPrinter = null;

    var hasStarted = false;

    var saveButton,
        onSaveButtonClick,
        bluetoothRadioButton,
        onBluetoothRadioButtonClick,
        ethernetRadioButton,
        onEthernetRadioButtonClick,
        languageView,
        onLanguageViewClick,
        smallRadioButton,
        onSmallRadioButtonClick,
        largeRadioButton,

        onLargeRadioButtonClick;

    logger.info('entered');

    if (!printer) {
        return null;
    }
    logger.info('not null');

    //---------------------------------------------------
    // ## DEVICE LISTENERS

    printer.addEventListener('printerlist:change', function(event) {
        event = event || {};
        logger.info('got printerlist:change event: ' + JSON.stringify(event));
        Alloy.eventDispatcher.trigger('printerlist:change', event);
    });

    //---------------------------------------------------
    // ## APP LISTENERS

    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'printer:select', function(event) {
        selectedPrinter = event.selectedPrinter;
        logger.info('got printerlist:change event: ' + selectedPrinter);
    });

    logger.info('adding printerlist:startdiscovery');
    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'printerlist:startdiscovery', function(event) {
        event = event || {};
        logger.info('got printerlist:startdiscover event: ' + JSON.stringify(event));
        if (!hasStarted) {
            var connType = Ti.App.Properties.getString('printerConnType') || 'tcp';
            var subnet = Ti.App.Properties.getString('printerSubnet') || '255.255.255.255';
            printer.startFind({
                printerDiscoverySubnet : subnet,
                printerConnectionType : connType
            });
            hasStarted = true;
        }
    });

    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'printerlist:stopdiscovery', function(event) {
        event = event || {};
        logger.info('got printerlist:stopdiscovery event: ' + JSON.stringify(event));
        if (hasStarted) {
            printer.stopFind();
            hasStarted = false;
        }
    });

    Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'print:receipt', function(event) {
        logger.info('printing receipt');

        if (!selectedPrinter) {
            logger.info('no selectedPrinter.  should show selector dialog.  using default config value');
            selectedPrinter = event.selectedPrinter;
        }

        notify(_L('Printing Receipt...'));

        var file = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, Alloy.Styles.receiptLogoImage);
        var logoImage = file.read();

        var output = [];
        populateImage(logoImage, 405, 83, 0, 0, output);
        populateReceiptHeader(output);
        populateOrderHeader(event, output);
        populateProductSummary(event, output);
        populateOrderSummary(event, output);
        populatePaymentDetails(event, output);
        populateShippingDetails(event, output);
        populateOrderLocatorCode(event, output);
        populatePromotionalMessage(output);
        populateCutCommand(output);

        var args = {
            selectedPrinter : selectedPrinter,
            output : output,
            fontSize : Ti.App.Properties.getString('printerFontSize') || 'small',
            otherPrinterLanguage : Ti.App.Properties.getString('printerLanguage') || 'ank'
        };
        printer.printReceipt(args);
    });

    Alloy.printerMgr = printer;

    //----------------------------------------------
    // ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

    /**
     * DEINIT - deinit for admin dashboard view
     *
     * @api public
     */
    printer.deinit = function() {
        logger.info('DEINIT called');
        bluetoothRadioButton.removeEventListener('click', onBluetoothRadioButtonClick);
        ethernetRadioButton.removeEventListener('click', onEthernetRadioButtonClick);
        saveButton.removeEventListener('click', onSaveButtonClick);
        languageView.removeEventListener('click', onLanguageViewClick);
        smallRadioButton.removeEventListener('click', onSmallRadioButtonClick);
        largeRadioButton.removeEventListener('click', onLargeRadioButtonClick);
    };

    //---------------------------------------------------
    // ## FUNCTIONS

    /**
     * getInfoView - info view (left panel) for admin dashboard
     *
     * @api public
     */
    printer.getInfoView = function() {
        var contentView = Ti.UI.createView(_.extend({}, getSectionClass()));
        return contentView;
    };

    /**
     * getConfigView - config view (right panel) for adming dashboard
     *
     * @api public
     */
    printer.getConfigView = function() {
        var contentView = Ti.UI.createScrollView(_.extend({}, getSectionClass()));

        var connType = Ti.App.Properties.getString('printerConnType') || 'tcp';
        var printerSubnet = Ti.App.Properties.getString('printerSubnet') || '255.255.255.255';
        var fontSize = Ti.App.Properties.getString('printerFontSize') || 'small';

        if (!connType) {
            connType = 'tcp';
            Ti.App.Properties.setString('printerConnType', connType);
        }

        var radioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0,
            top : 2
        }));
        radioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Configuration')
        }, getTitleClass())));

        var btRadioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'horizontal',
            left : 0,
            top : 4
        }));
        bluetoothRadioButton = Ti.UI.createImageView(_.extend({}, {
            image : connType == 'bluetooth' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0,
            top : 2
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
            image : connType == 'tcp' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0,
            top : 2
        }));
        ethRadioView.add(ethernetRadioButton);
        ethRadioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Ethernet')
        }, getTextClass())));
        radioView.add(ethRadioView);

        contentView.add(radioView);

        var enabled = connType == 'tcp';
        var ethernetConfigView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0,
            top : 14
        }));

        ethernetConfigView.add(Ti.UI.createLabel(_.extend({
            text : _L('Subnet')
        }, getTitleClass())));
        var subnetField = Ti.UI.createTextField({
            borderColor : '#000',
            width : 240,
            height : 28,
            left : 2,
            paddingLeft : 4,
            bottom : 5,
            enabled : enabled,
            color : enabled ? Alloy.Styles.color.text.black : Alloy.Styles.color.text.light
        });
        if (printerSubnet && printerSubnet.length > 0) {
            subnetField.value = printerSubnet;
        }
        ethernetConfigView.add(subnetField);

        saveButton = Ti.UI.createButton(_.extend({
            title : _L('Save')
        }, getButtonClass(), {
            width : 230,
            left : 4,
            bottom : 10,
            enabled : enabled
        }));
        onSaveButtonClick = function() {
            Ti.App.Properties.setString('printerSubnet', subnetField.value);
        };
        ethernetConfigView.add(saveButton);
        saveButton.addEventListener('click', onSaveButtonClick);
        contentView.add(ethernetConfigView);

        onEthernetRadioButtonClick = function() {
            Ti.App.Properties.setString('printerConnType', 'tcp');
            bluetoothRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
            ethernetRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
            subnetField.setEnabled(true);
            subnetField.setColor(Alloy.Styles.color.text.black);
            saveButton.setEnabled(true);
        };

        ethernetRadioButton.addEventListener('click', onEthernetRadioButtonClick);

        onBluetoothRadioButtonClick = function() {
            Ti.App.Properties.setString('printerConnType', 'bluetooth');
            bluetoothRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
            ethernetRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
            subnetField.setEnabled(false);
            subnetField.setColor(Alloy.Styles.color.text.light);
            saveButton.setEnabled(false);
        };
        bluetoothRadioButton.addEventListener('click', onBluetoothRadioButtonClick);

        var radioFontSizeView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0
        }));
        radioFontSizeView.add(Ti.UI.createLabel(_.extend({
            text : _L('Font Size')
        }, getTitleClass())));

        var smallRadioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'horizontal',
            left : 0,
            top : 2
        }));
        smallRadioButton = Ti.UI.createImageView(_.extend({}, {
            image : fontSize == 'small' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0,
            top : 2
        }));
        smallRadioView.add(smallRadioButton);
        smallRadioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Small')
        }, getTextClass())));
        radioFontSizeView.add(smallRadioView);

        var largeRadioView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'horizontal',
            left : 0,
            top : 4
        }));
        largeRadioButton = Ti.UI.createImageView(_.extend({}, {
            image : fontSize == 'large' ? Alloy.Styles.radioButtonOnImage : Alloy.Styles.radioButtonOffImage,
            left : 0,
            top : 2
        }));
        largeRadioView.add(largeRadioButton);
        largeRadioView.add(Ti.UI.createLabel(_.extend({
            text : _L('Large')
        }, getTextClass())));
        radioFontSizeView.add(largeRadioView);

        contentView.add(radioFontSizeView);

        onSmallRadioButtonClick = function() {
            Ti.App.Properties.setString('printerFontSize', 'small');
            largeRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
            smallRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
        };
        smallRadioButton.addEventListener('click', onSmallRadioButtonClick);

        onLargeRadioButtonClick = function() {
            Ti.App.Properties.setString('printerFontSize', 'large');
            largeRadioButton.setImage(Alloy.Styles.radioButtonOnImage);
            smallRadioButton.setImage(Alloy.Styles.radioButtonOffImage);
        };
        largeRadioButton.addEventListener('click', onLargeRadioButtonClick);

        var languageConfigView = Ti.UI.createView(_.extend({}, getSectionClass(), {
            layout : 'vertical',
            left : 0
        }));
        languageConfigView.add(Ti.UI.createLabel(_.extend({
            text : _L('Printer Language')
        }, getTitleClass())));

        languageView = Ti.UI.createTableView({
            borderWidth : 2,
            borderColor : '#bbb',
            borderRadius : 2,
            width : 250,
            height : 140,
            scrollable : true,
            editable : false,
            rowHeight : 40,
            allowsSelection : true,
            selectedColor : Alloy.Styles.accentColor,
            style : Ti.UI.iOS.TableViewStyle.PLAIN
        });
        var selected = Ti.App.Properties.getString('printerLanguage');
        var data = [];
        var index = 0;
        _.each(['ank', 'japanese', 'chinese', 'taiwan', 'korean', 'thai', 'southasia'], function(lang) {
            data.push({
                id : index,
                title : lang,
                selected : lang == selected
            });
            index++;
        });
        languageView.setData(data);
        _.each(languageView.getData()[0].getRows(), function(row) {
            if (row.selected) {
                languageView.selectRow(row.id);
            }
        });
        onLanguageViewClick = function(event) {
            Ti.App.Properties.setString('printerLanguage', event.row.title);
        };
        languageView.addEventListener('click', onLanguageViewClick);
        languageConfigView.add(languageView);

        contentView.add(languageConfigView);

        return contentView;
    };

    return printer;
}

/**
 * populateImage - populates the image on receipt
 *
 * @param {Object} image
 * @param {Object} width
 * @param {Object} height
 * @param {Object} x
 * @param {Object} y
 * @param {Object} out
 * @api private
 */
function populateImage(image, width, height, x, y, out) {
    addToOutput(out, createImage(image, width, height, x, y, {
        align : 'center'
    }));
}

/**
 * populateReceiptHeader - populate the header on receipt
 *
 * @param {Object} out
 * @api private
 */
function populateReceiptHeader(out) {
    var info = Alloy.Models.storeInfo;

    addToOutput(out, createNewline());
    if (info.get('address1')) {
        addToOutput(out, createText(info.get('address1'), {
            align : 'center'
        }));
    }
    if (info.get('address2')) {
        addToOutput(out, createText(info.get('address2'), {
            align : 'center'
        }));
    }

    var line = '';
    if (info.get('city')) {
        line += info.get('city');
    }
    if (info.get('stateCode')) {
        line += ', ' + info.get('stateCode');
    }
    if (info.get('postalCode')) {
        line += ' ' + info.get('postalCode');
    }
    if (line) {
        addToOutput(out, createText(line, {
            align : 'center'
        }));
    }

    if (info.get('phone')) {
        addToOutput(out, createText(info.get('phone'), {
            align : 'center'
        }));
    }
}

/**
 * populateOrderHeader - populate the order header section on receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populateOrderHeader(event, out) {
    addToOutput(out, createNewline());
    addToOutput(out, createText(_L('WEB ORDER')));
    addToOutput(out, createText(' ' + _L('Web Order Number: #') + event.order_no));
    addToOutput(out, createText(' ' + _L('Date:') + ' ' + event.creation_date));
    addToOutput(out, createText(' ' + _L('Store_ID:') + ' ' + event.store_name));
    addToOutput(out, createText(' ' + _L('Associate:') + ' ' + event.employee_name + ' / ' + event.employee_id));
}

/**
 * populateProductSummary - populate the product summary on the receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populateProductSummary(event, out) {
    addToOutput(out, createTextLine());
    addToOutput(out, createText(_L('PRODUCT SUMMARY')));

    _.each(event.product_items, function(pli) {
        var pid = pli.product_id;
        var quantity = pli.quantity.toString();
        var price = eaUtils.toCurrency(pli.price);
        var productName = pli.item_text;

        var line = pid + ' ';

        var numSpaces = 5 - quantity.length;
        for (var i = 0; i < numSpaces; i++) {
            line += ' ';
        }
        line += quantity;

        var numSpaces = 39 - (line.length + price.length);
        for (var i = 0; i < numSpaces; i++) {
            line += ' ';
        }
        line += price;

        addToOutput(out, createNewline());
        addToOutput(out, createText(line));
        addToOutput(out, createText(productName));
        addToOutput(out, createText(_L('Return Value:') + ' ' + price));

        populatePriceOverride(pli, out);
        populateProductOptions(pli, out);
    });
}

/**
 * populatePriceOverride - populate the price override information on the receipt
 *
 * @param {Object} pli
 * @param {Object} out
 * @api private
 */
function populatePriceOverride(pli, out) {
    if (pli.price_override == 'true') {
        var line = _L('Price Override:') + ' ';
        var priceOverrideValue = null;
        if (pli.price_override_type == 'percent') {
            var num = pli.price_override_value * 100;
            priceOverrideValue = num.toString() + '% ' + _L('Price Override Pct Off');
        } else {
            priceOverrideValue = eaUtils.toCurrency(parseFloat(pli.price_override_value));
            if (pli.price_override_type == 'amount') {
                priceOverrideValue = '-' + priceOverrideValue;
            }
        }
        numSpaces = 39 - (line.length + priceOverrideValue.length);
        for (var i = 0; i < numSpaces; i++) {
            line += ' ';
        }
        line += priceOverrideValue;
        addToOutput(out, createText(line, {
            textStyle : 'bold'
        }));
    }
}

/**
 * populateProductOptions - populate the product options on the receipt
 *
 * @param {Object} pli
 * @param {Object} out
 * @api private
 */
function populateProductOptions(pli, out) {
    _.each(pli.option_items, function(option) {
        var optionText = option.item_text;
        var quantity = option.quantity;
        var price = eaUtils.toCurrency(option.price);

        if (optionText) {
            if (optionText.length > 29) {
                optionText = optionText.substr(0, 28);
            }
            var line = optionText + ' ';

            var numSpaces = 5 - quantity.length;
            for (var i = 0; i < numSpaces; i++) {
                line += ' ';
            }
            line += quantity;

            var numSpaces = 39 - (line.length + price.length);
            for (var i = 0; i < numSpaces; i++) {
                line += ' ';
            }
            line += price;

            addToOutput(out, createText(line));
        }
    });
}

/**
 * populateOrderSummary - populate the order summary on the receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populateOrderSummary(event, out) {
    addToOutput(out, createTextLine());
    addToOutput(out, createText(_L('ORDER SUMMARY')));
    addToOutput(out, createNewline());

    populateCoupons(event.coupons, out);

    addLabelWithAmount(out, _L('Subtotal:') + ' ', event.product_sub_total);

    addToOutput(out, createText(_L('Shipping Method:')));
    _.each(event.shipments, function(shipment) {
        addLabelWithAmount(out, '  ' + shipment.shipping_method.name, event.shipping_total);
    });

    populateOrderPriceAdjustments(event.order_price_adjustments, out);

    addLabelWithAmount(out, _L('Sales Tax:') + ' ', event.tax_total);

    addToOutput(out, createNewline());
    addLabelWithAmount(out, _L('Order Total:') + ' ', event.order_total, {
        textStyle : 'bold'
    });
}

/**
 * populateCoupons - populate coupons on the receipt
 *
 * @param {Object} coupons
 * @param {Object} out
 * @api private
 */
function populateCoupons(coupons, out) {
    _.each(coupons, function(coupon) {
        if (coupon.coupon_applied == 'true' && coupon.coupon_code) {
            addToOutput(out, createText(_L('Coupon Applied:') + ' ' + coupon.coupon_code));
        }
    });
}

/**
 * populateOrderPriceAdjustments - populate price adjustments on the receipt
 *
 * @param {Object} orderPriceAdjustments
 * @param {Object} out
 * @api private
 */
function populateOrderPriceAdjustments(orderPriceAdjustments, out) {
    _.each(orderPriceAdjustments, function(priceAdjustment) {
        var priceAdjText = priceAdjustment.item_text;
        var price = eaUtils.toCurrency(priceAdjustment.price);
        if (priceAdjText) {
            var line = _L('Order Discount:') + ' ';
            var numSpaces = 39 - (line.length + price.length);
            for (var i = 0; i < numSpaces; i++) {
                line += ' ';
            }
            line += price;
            addToOutput(out, createText(line));
        }
    });
}

/**
 * populatePaymentDetails - populate payment details on the receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populatePaymentDetails(event, out) {
    addToOutput(out, createTextLine());
    addToOutput(out, createText(_L('PAYMENT DETAILS')));
    addToOutput(out, createNewline());

    _.each(event.payment_details, function(details) {
        var label = details.credit_card_type;
        if (details.payment_method == 'GIFT_CERTIFICATE') {
            label = _L('Gift Card');
        }
        addLabelWithAmount(out, label, details.amt_auth);
        if (details.last_four_digits) {
            addToOutput(out, createText('  ' + _L('Ending In:') + ' ' + details.last_four_digits));
        }
        addToOutput(out, createNewline());
    });

    if (Alloy.sigBlob) {
        var sigImage = Alloy.sigBlob.imageAsResized(440, 70);
        populateImage(sigImage, 440, 70, 0, 0, out);
    }
}

/**
 * populateShippingDetails - populate shipping details on the receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populateShippingDetails(event, out) {
    addToOutput(out, createTextLine());
    addToOutput(out, createText(_L('SHIPPING DETAILS')));
    addToOutput(out, createNewline());

    _.each(event.shipments, function(shipment) {
        addToOutput(out, createText(' ' + shipment.shipping_address.first_name + ' ' + shipment.shipping_address.last_name));
        if (shipment.shipping_address.address1) {
            addToOutput(out, createText(' ' + shipment.shipping_address.address1));
        }
        if (shipment.shipping_address.address2) {
            addToOutput(out, createText(' ' + shipment.shipping_address.address2));
        }

        var line = ' ';
        if (shipment.shipping_address.city) {
            line += shipment.shipping_address.city;
        }
        if (shipment.shipping_address.state_code && shipment.shipping_address.state_code != 'null') {
            line += ', ' + shipment.shipping_address.state_code;
        }
        if (shipment.shipping_address.postal_code) {
            line += ' ' + shipment.shipping_address.postal_code;
        }
        addToOutput(out, createText(line));

        if (shipment.shipping_address.country_code) {
            addToOutput(out, createText(' ' + shipment.shipping_address.country_code));
        }
        if (shipment.shipping_address.phone) {
            addToOutput(out, createText(' ' + shipment.shipping_address.phone));
        }
        if (event.customer_info.email) {
            addToOutput(out, createText(' ' + _L('Email: ') + event.customer_info.email));
        }
        if (shipment.shipping_method.name) {
            addToOutput(out, createText(' ' + _L('Shipping Method:')));
            addToOutput(out, createText('   ' + shipment.shipping_method.name));
        }
    });
}

/**
 * populateOrderLocatorCode - populate order locator code on the receipt
 *
 * @param {Object} event
 * @param {Object} out
 * @api private
 */
function populateOrderLocatorCode(event, out) {
    addToOutput(out, createTextLine());
    addToOutput(out, createText(_L('ORDER LOCATOR CODE')));
    addToOutput(out, createNewline());

    var receiptQRCodeURL = Alloy.CFG.receipt_qrcode_url || '/Order-History';
    var url = eaUtils.buildStorefrontURL('https', receiptQRCodeURL);
    addToOutput(out, createCommand({
        orderLocator : url
    }));
}

/**
 * populatePromotionalMessage - populate promotion message on the receipt
 *
 * @param {Object} out
 * @api private
 */
function populatePromotionalMessage(out) {
    addToOutput(out, createNewline());
    addToOutput(out, createText(_L(Alloy.CFG.receipt_promotional_message_string_resource)));
}

/**
 * populateCutCommand - populate cut command on the receipt
 *
 * @param {Object} out
 * @api private
 */
function populateCutCommand(out) {
    addToOutput(out, createCommand({
        linefeed : '60'
    }));
    addToOutput(out, createCommand({
        cutReceipt : 'true'
    }));
}

/**
 * addToOutput - add to the receipt output
 *
 * @param {Object} output
 * @param {Object} obj
 * @api private
 */
function addToOutput(output, obj) {
    if (_.isArray(obj)) {
        _.each(obj, function(o) {
            output.push(o);
        });
    } else {
        output.push(obj);
    }
}

/**
 * addLabelWithAmount - add label to receipt with currency amount
 *
 * @param {Object} out
 * @param {Object} label
 * @param {Object} amount
 * @param {Object} modifier
 * @api private
 */
function addLabelWithAmount(out, label, amount, modifier) {
    var line = label;
    var amountStr = eaUtils.toCurrency(amount);
    var numSpaces = 39 - (line.length + amountStr.length);
    for (var i = 0; i < numSpaces; i++) {
        line += ' ';
    }
    line += amountStr;
    addToOutput(out, createText(line, modifier));
}

/**
 * createText - create text for the printer
 *
 * @param {Object} text
 * @param {Object} modifier
 * @return {String} text
 * @api private
 */
function createText(text, modifier) {
    var textArray = [];

    var mod = null;
    if (modifier) {
        mod = modifier;
    }

    if (!text) {
        text = '<null>';
    }

    var str = text;
    if (str.length > 41) {
        str = text.substr(0, 41);
    }

    textArray.push({
        text : str,
        image : null,
        modifier : mod
    });
    if (mod) {
        logger.log('printing text: ' + str + ' (' + JSON.stringify(modifier) + ')');
    } else {
        logger.log('printing text: ' + str);
    }

    return textArray;
}

/**
 * createNewline - create a new line on receipt output
 *
 * @return {String} new line
 * @api private
 */
function createNewline() {
    return createText(' ');
}

/**
 * createTextLine - create a line seperator on the receipt
 *
 * @param {Object} text
 * @return {String} line text
 * @api private
 */
function createTextLine(text) {
    return createText('________________________________________');
}

/**
 * createImage - create image output on the receipt
 *
 * @param {Object} image
 * @param {Object} width
 * @param {Object} height
 * @param {Object} x
 * @param {Object} y
 * @param {Object} modifier
 * @return {Object} image info
 * @api private
 */
function createImage(image, width, height, x, y, modifier) {
    var mod = null;
    if (modifier) {
        mod = modifier;
    }

    if (mod) {
        logger.log('printing image: ' + x + ' ' + y + ' ' + width + ' ' + height + ' (' + JSON.stringify(modifier) + ')');
    } else {
        logger.log('printing image: ' + x + ' ' + y + ' ' + width + ' ' + height);
    }

    return {
        text : null,
        image : image,
        width : width,
        height : height,
        x : x,
        y : y,
        modifier : mod
    };
}

/**
 * createCommand - create command
 *
 * @param {Object} modifier
 * @return {String} text
 * @api private
 */
function createCommand(modifier) {
    return createText(' ', modifier);
}

/**
 * getSectionClass - get styling for section class
 *
 * @return {Object} style
 * @api private
 */
function getSectionClass() {
    return {
        top : 15,
        left : 20,
        height : Ti.UI.SIZE,
        width : Ti.UI.SIZE,
        layout : 'vertical'
    };
}

/**
 * getTitleClass - get styling for title class
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
 * getTextClass - get styling for text class
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
 * getButtonClass - get styling for button class
 *
 * @return {Object} style
 * @api private
 */
function getButtonClass() {
    return {
        font : Alloy.Styles.smallButtonFont,
        backgroundImage : Alloy.Styles.buttons.primary.backgroundImage,
        backgroundDisabledImage : Alloy.Styles.buttons.primary.backgroundDisabledImage,
        color : Alloy.Styles.buttons.primary.color,
        width : 100,
        height : 30,
        top : 10,
        left : 0
    };
}

/**
 * getTableViewClass - get styling for table view class
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
        scrollable : true,
        editable : false,
        rowHeight : 40,
        style : Ti.UI.iOS.TableViewStyle.PLAIN
    };
}

module.exports = init();
