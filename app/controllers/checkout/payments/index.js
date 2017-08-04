// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/payments/index.js - Payments tab during checkout process
 */

//----------------------------------------------
// ## VARIABLES

var toCurrency = require('EAUtils').toCurrency;
var analytics = require('analyticsBase');
var logger = require('logging')('checkout:payments:index', getFullControllerPath($.__controllerPath));
var currentBasket = Alloy.Models.basket;
var currentCustomer = Alloy.Models.customer;
var countryConfig = require('config/countries').countryConfig;
var currencyConfig = require('config/countries').currencyConfig;
var paymentTerminal = require(Alloy.CFG.devices.payment_terminal_module);
var selectedButtonBackground = Alloy.Styles.creditCardButtonDownImage;
var deselectedButtonBackground = Alloy.Styles.creditCardButtonUpImage;
var selectedColor = Alloy.Styles.color.text.white;
var deselectedColor = Alloy.Styles.color.text.dark;
var listeningGC = false;
var listeningCC = false;
var singleTender = true;

var creditCardPaymentType = 'creditCard';
var giftCardPaymentType = 'giftCard';
var dot = currencyConfig[countryConfig[Alloy.CFG.countrySelected].appCurrency].delimiters.decimal;

var blankNumberEntered = '0' + dot + '00';
var usingMultipleCards = false;

// Localization constant
var buttonTextLength = 13;

//---------------------------------------------------
// ## UI EVENT LISTENERS

// event listeners for buttons on the page

$.multiple_cards_button.addEventListener('click', onMultipleCardsClick);

$.one_card_button.addEventListener('click', onOneCardClick);

$.credit_card_button.addEventListener('click', onCreditCardClick);

$.gift_card_button.addEventListener('click', onGiftCardClick);

$.swipe_card_in_keypad.addEventListener('click', onSwipeCardClick);

$.swipe_no_keypad.addEventListener('click', onSwipeNoKeypadClick);

$.cancel_order_button.addEventListener('click', cancelOrder);

$.cancel_no_keypad.addEventListener('click', cancelOrder);

$.one_button.addEventListener('click', onNumberButtonClick);

$.two_button.addEventListener('click', onNumberButtonClick);

$.three_button.addEventListener('click', onNumberButtonClick);

$.four_button.addEventListener('click', onNumberButtonClick);

$.five_button.addEventListener('click', onNumberButtonClick);

$.six_button.addEventListener('click', onNumberButtonClick);

$.seven_button.addEventListener('click', onNumberButtonClick);

$.eight_button.addEventListener('click', onNumberButtonClick);

$.nine_button.addEventListener('click', onNumberButtonClick);

$.zero_button.addEventListener('click', onNumberButtonClick);

$.delete_button.addEventListener('click', onDeleteButtonClick);

//---------------------------------------------------
// ## MODEL LISTENERS

// when there's a change in the basket, figure out how much balance is left
$.listenTo(currentBasket, 'change', function() {
    calculateBalanceDue();
});

$.listenTo(currentBasket, 'change:order_abandonded', function() {
    if (currentBasket.get('order_abandonded')) {
        $.number_text.setText('');
    }
});

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.render = render;
exports.deinit = deinit;
exports.applyGCPayment = applyGCPayment;
exports.stopPaymentListening = stopPaymentListening;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise
 * @api public
 */
function init() {
    logger.info('INIT called');
    var def = new _.Deferred();
    def.resolve();
    return def.promise();
}

/**
 * RENDER
 *
 * @api public
 */
function render() {
    logger.info('render called');
    var giftCardsAvailability = Alloy.CFG.gift_cards_available;
    if (!Alloy.CFG.enable_multi_tender_payments) {
        // no multipayments, so hide the multipayment selector and adjust some layout
        $.selectorRow.hide();
        $.selectorRow.setHeight(0);
        $.balance_due_container.setTop(40);
        $.payment_message_label.setTop(70);
        if (!paymentTerminal.supports('gift_cards') || !giftCardsAvailability) {
            $.just_swipe_container.setTop(0);
            $.payment_types_container.setTop(0);
        } else {
            $.payment_types_container.setTop(30);
        }
    } else {
        $.selectorRow.show();
        $.selectorRow.setHeight(51);
        $.balance_due_container.setTop(12);
        $.payment_message_label.setTop(50);

        $.multiple_cards_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
        $.one_card_button.setBackgroundImage(Alloy.Styles.buttonLeftOnImage);
        if (!paymentTerminal.supports('gift_cards') || !giftCardsAvailability) {
            $.just_swipe_container.setTop(10);
            $.payment_types_container.setTop(0);
        } else {
            $.payment_types_container.setTop(30);
        }
    }

    // if only credit cards, don't need to show either card selector button
    if (!paymentTerminal.supports('gift_cards') || !giftCardsAvailability) {
        $.payment_types_container.hide();
        $.payment_types_container.setHeight(0);
    } else {
        $.payment_types_container.show();
        $.payment_types_container.setHeight(Titanium.UI.SIZE);
        // if there is a credit card button and a gift card button, default to selecting
        // the credit card button
        selectButton($.credit_card_button, true);
        selectButton($.gift_card_button, false);
    }

    paymentMethodType = creditCardPaymentType;

    $.just_swipe_container.setHeight(Ti.UI.SIZE);
    $.just_swipe_container.show();

    $.number_entry_container.hide();
    $.number_entry_container.setHeight(0);
    $.tender_amount_container.setHeight(0);
    $.tender_amount_container.hide();
    $.number_entered.setText('0' + dot + '00');
    usingMultipleCards = false;
    if ($.swipe_card_in_keypad.getTitle().length > buttonTextLength || $.cancel_order_button.getTitle().length > buttonTextLength) {
        $.swipe_card_in_keypad.setFont(Alloy.Styles.smallButtonFont);
        $.cancel_order_button.setFont(Alloy.Styles.smallButtonFont);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    // stops listening to all listenTo events
    $.stopListening();
    $.multiple_cards_button.removeEventListener('click', onMultipleCardsClick);
    $.one_card_button.removeEventListener('click', onOneCardClick);
    $.credit_card_button.removeEventListener('click', onCreditCardClick);
    $.gift_card_button.removeEventListener('click', onGiftCardClick);
    $.swipe_card_in_keypad.removeEventListener('click', onSwipeCardClick);
    $.swipe_no_keypad.removeEventListener('click', onSwipeNoKeypadClick);
    $.cancel_order_button.removeEventListener('click', cancelOrder);
    $.cancel_no_keypad.removeEventListener('click', cancelOrder);
    $.one_button.removeEventListener('click', onNumberButtonClick);
    $.two_button.removeEventListener('click', onNumberButtonClick);
    $.three_button.removeEventListener('click', onNumberButtonClick);
    $.four_button.removeEventListener('click', onNumberButtonClick);
    $.five_button.removeEventListener('click', onNumberButtonClick);
    $.six_button.removeEventListener('click', onNumberButtonClick);
    $.seven_button.removeEventListener('click', onNumberButtonClick);
    $.eight_button.removeEventListener('click', onNumberButtonClick);
    $.nine_button.removeEventListener('click', onNumberButtonClick);
    $.zero_button.removeEventListener('click', onNumberButtonClick);
    $.delete_button.removeEventListener('click', onDeleteButtonClick);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * applyGCPayment - apply a gift card payment
 *
 * @param {Payment} payment - payment information
 * @param {Double} toApply - amount to apply
 * @api public
 */
function applyGCPayment(payment, toApply) {
    payment.redeem_amount = toApply;
    // authorize at the end
    if (Alloy.CFG.payment_process_flow === 'A') {
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        currentBasket.applyGiftCard(payment).done(function() {
            $.number_entered.setText(blankNumberEntered);
            // default back to credit card
            setPaymentType(creditCardPaymentType);
            // if balance is 0, authorize all the payments
            if (Math.abs(currentBasket.calculateBalanceDue()) < 0.001) {
                authorizePayments(deferred);
            } else {
                deferred.resolve();
            }
        }).fail(function(failedModel, failedOptions, failedParams) {
            logger.error(handleCardAuthorizationFailure(failedModel));
            // Cannot use backbone event here because retry may cause code path to return to enableRetry function
            // causing a loop. Backbone will block the event the second time.
            Ti.App.fireEvent('payment_terminal:enable_retry', {
                message : _L('Unable to complete order. Retry?'),
                payment_data : payment
            });
            // must use global event here
            deferred.reject();
        });
    } else if (Alloy.CFG.payment_process_flow === 'B') {
        // authorize as we go
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        currentBasket.authorizeGiftCard(payment).done(function(model, options, params) {
            $.number_entered.setText(blankNumberEntered);
            // default back to credit card
            setPaymentType(creditCardPaymentType);
            // see if order is completed
            if (currentBasket.isOrderConfirmed()) {
                $.trigger('payment:success', {
                    title : _L('Approved'),
                    message : _L('Payment Approved'),
                    completionFunction : function() {
                        fetchOrder();
                    }
                });
                sendAnalyticsEvents();
                deferred.resolve();
            } else if (currentBasket.getPaymentBalance() == 0) {
                // Once the payment balance has hits zero the order needs to be confirmed by the server.  Otherwise EA will not continue
                // with the order and give you the ability to print/email receipt.
                deferred.reject();
                $.trigger('payment:error', {
                    title : _L('Payment Status'),
                    message : _L('Error applying gift card. \nThe order has not been confirmed on server.')
                });
            } else {
                $.trigger('payment:success', {
                    title : _L('Approved'),
                    message : _L('Payment Approved')
                });
                deferred.resolve();
            }
        }).fail(function(failedModel, failedOptions, failedParams) {
            logger.error(handleCardAuthorizationFailure(failedModel));
            // Cannot use backbone event here because retry may cause code path to return to enableRetry function
            // causing a loop. Backbone will block the event the second time.
            Ti.App.fireEvent('payment_terminal:enable_retry', {
                message : _L('Unable to complete order. Retry?'),
                payment_data : payment
            });
            // must use global event here
            deferred.reject();
        });
    }
}

/**
 * stopPaymentListening - stop listening for any payment events

 * @api public
 */
function stopPaymentListening() {
    listeningCC = false;
    listeningGC = false;
    $.stopListening(Alloy.eventDispatcher, 'payment:cc_approved', ccPaymentApproved);
    $.stopListening(Alloy.eventDispatcher, 'payment:credit_card_data', ccPaymentEntered);
    $.stopListening(Alloy.eventDispatcher, 'payment:cc_declined', ccPaymentDeclined);
    $.stopListening(Alloy.eventDispatcher, 'payment:cc_error', ccPaymentError);
    $.stopListening(Alloy.eventDispatcher, 'payment:gift_card_data', gcPaymentEntered);
    $.stopListening(Alloy.eventDispatcher, 'payment:stop_payment_listening', stopPaymentListening);
    Alloy.eventDispatcher.trigger('payment:payment_listeners_stopped');
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * addNumber - add a value to the number entered text field
 *
 * @param {String} number
 * @api private
 */
function addNumber(number) {
    // if the number can be added, add it (e.g. don't add 3 places after a decimal)
    var numberEntered = $.number_entered.getText();

    var floatingPointPart = numberEntered.substring(numberEntered.indexOf(dot) + 1);
    var integerPart = numberEntered.substring(0, numberEntered.indexOf(dot));
    if (integerPart.substring(0, 1) == '0') {
        integerPart = '';
    }

    var newNumber = integerPart + floatingPointPart.substring(0, 1) + dot + floatingPointPart.substring(1) + number;
    $.number_entered.setText(newNumber);
}

/**
 * onMultipleCardsClick - multi card button has been clicked
 *
 * @api private
 */
function onMultipleCardsClick() {
    $.tender_amount_container.show();
    $.tender_amount_container.setHeight(Ti.UI.SIZE);
    $.number_entry_container.show();
    $.number_entry_container.setHeight(Ti.UI.SIZE);
    $.just_swipe_container.hide();
    $.just_swipe_container.setHeight(0);

    $.multiple_cards_button.setBackgroundImage(Alloy.Styles.buttonRightOnImage);
    $.one_card_button.setBackgroundImage(Alloy.Styles.buttonLeftOffImage);
    $.payment_message_label.setTop(20);
    usingMultipleCards = true;
}

/**
 * onOneCardClick - one card button has been clicked
 *
 * @api private
 */
function onOneCardClick() {
    $.tender_amount_container.hide();
    $.tender_amount_container.setHeight(0);
    $.number_entry_container.hide();
    $.number_entry_container.setHeight(0);
    $.just_swipe_container.show();
    $.just_swipe_container.setHeight(Ti.UI.SIZE);
    $.multiple_cards_button.setBackgroundImage(Alloy.Styles.buttonRightOffImage);
    $.one_card_button.setBackgroundImage(Alloy.Styles.buttonLeftOnImage);
    usingMultipleCards = false;
}

/**
 * onCreditCardClick - credit card button has been clicked
 *
 * @api private
 */
function onCreditCardClick() {
    logger.info('credit card button tapped');
    setPaymentType(creditCardPaymentType);
}

/**
 * onGiftCardClick - gift card button has been clicked
 *
 * @api private
 */
function onGiftCardClick() {
    logger.info('gift card button tapped');
    setPaymentType(giftCardPaymentType);
}

/**
 * onSwipeCardClick - enter button has been clicked for swiping card
 *
 * @api private
 */
function onSwipeCardClick() {
    logger.info('enter button tapped');
    if ($.number_entered.getText().trim() == blankNumberEntered) {
        var value = currentBasket.calculateBalanceDue().toFixed(2);
        value = value.replace('.', dot);
        $.number_entered.setText(value);
    }

    var amount = parseFloat($.number_entered.text).toFixed(2);
    handleSwipeButton(amount);
}

/**
 * onSwipeNoKeypadClick - swipe no button has been clicked
 *
 * @api private
 */
function onSwipeNoKeypadClick() {
    handleSwipeButton(currentBasket.calculateBalanceDue().toFixed(2));
}

/**
 * onDeleteButtonClick - delete button has been clicked
 *
 * @api private
 */
function onDeleteButtonClick() {
    var number = $.number_entered.getText();
    var floatPart = number.substring(number.indexOf(dot) + 1);
    var integerPart = number.substring(0, number.indexOf(dot));

    var newIntegerPart = integerPart.substring(0, integerPart.length - 1);
    if (newIntegerPart.length == 0) {
        newIntegerPart = '0';
    }
    var newFloatPart = integerPart.substring(integerPart.length - 1) + floatPart.substring(0, 1);
    $.number_entered.setText(newIntegerPart + dot + newFloatPart);
}

/**
 * onNumberButtonClick - a number button has been clicked
 *
 * @api private
 */
function onNumberButtonClick(event) {
    // get the title and add the number
    logger.info('onNumberButtonClick ' + JSON.stringify(event));
    addNumber(event.source.title);

}

/**
 * ccPaymentEntered - a credit card has been swiped
 *
 * @param {Object} event
 * @api private
 */
function ccPaymentEntered(event) {
    logger.secureLog('Attempting to complete order with credit card info: ' + JSON.stringify(event));
    var payment = {
        track_1 : event.track_1,
        track_2 : event.track_2,
        pan : event.pan,
        expire_date : (event.month && event.year) ? event.month + '/' + event.year : null,
        order_no : currentBasket.getOrderNumber(),
        transaction_id : event.transaction_id,
        payment_reference_id : event.payment_reference_id,
        owner : event.owner,
        card_type : event.card_type,
        is_contactless : event.is_contactless,
        terminal_id : event.terminal_id
    };
    // payment process flow A authorizes all payments after the payments have been collected
    if (Alloy.CFG.payment_process_flow === 'A') {
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        currentBasket.applyCreditCard(payment).done(function(model, options, params) {
            $.number_entered.setText(blankNumberEntered);
            // if the balance due is sufficiently small (should really be 0), authorize all the payments now
            if (Math.abs(currentBasket.calculateBalanceDue()) < 0.001) {
                authorizePayments(deferred);
            } else {
                deferred.resolve();
            }
            stopPaymentListening();
            Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
        }).fail(function(failedModel, failedOptions, failedParams) {
            logger.error(handleCardAuthorizationFailure(failedModel));
            // Cannot use backbone event here because retry may cause code path to return to enableRetry function
            // causing a loop. Backbone will block the event the second time.
            Ti.App.fireEvent('payment_terminal:enable_retry', {
                message : _L('Unable to complete order. Retry?'),
                payment_data : event
            });
            // must use global event here
            deferred.reject();
        });
    } else if (Alloy.CFG.payment_process_flow === 'B') {
        // if no amount entered, use the balance due
        var amountToApply = currentBasket.calculateBalanceDue();
        // if using multiple cards, get the amount from the amount entered, if any
        if (usingMultipleCards) {
            // authorize each payment as it is applied
            var amountEntered = $.number_entered.getText();
            //if an amount was entered, use that, but only up to the balance due
            if (amountEntered !== blankNumberEntered) {
                var enteredNumber = formatAmount(amountEntered);
                var entered = enteredNumber - 0;
                if (entered < amountToApply) {
                    amountToApply = enteredNumber - 0;
                }
            }
        }
        payment.auth_amount = amountToApply;

        if (event.transaction_id) {
            logger.info('IS PAID!');
        }
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        currentBasket.authorizeCreditCard(payment).done(function(model, options, params) {
            $.number_entered.setText(blankNumberEntered);
            // check the order is complete
            if (currentBasket.isOrderConfirmed()) {
                Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
                $.trigger('payment:success', {
                    title : _L('Approved'),
                    message : _L('Payment Approved'),
                    completionFunction : function() {
                        fetchOrder();
                    }
                });
                stopPaymentListening();
                sendAnalyticsEvents();
                deferred.resolve();
            } else if (currentBasket.getPaymentBalance() == 0) {
                // Once the payment balance has hits zero the order needs to be confirmed by the server.  Otherwise EA will not continue
                // with the order and give you the ability to print/email receipt.
                deferred.reject();
                Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
                $.trigger('payment:error', {
                    title : _L('Payment Status'),
                    message : _L('Error applying credit card. \nThe order has not been confirmed on server.')
                });
                stopPaymentListening();
            } else {
                $.trigger('payment:success', {
                    title : _L('Approved'),
                    message : _L('Payment Approved')
                });
                deferred.resolve();
            }
        }).fail(function(failedModel, failedOptions, failedParams) {
            logger.error(handleCardAuthorizationFailure(failedModel));
            // Cannot use backbone event here because retry may cause code path to return to enableRetry function
            // causing a loop. Backbone will block the event the second time.
            Ti.App.fireEvent('payment_terminal:enable_retry', {
                message : _L('Unable to complete order. Retry?'),
                payment_data : event
            });
            // must use global event here
            deferred.reject();
        });
    }
}

/**
 * formatAmount - format the amount in the correct format depending on the country selected
 *
 * @param {String} amountEntered
 * @api private
 */
function formatAmount(amountEntered) {
    return amountEntered.substring(0, amountEntered.indexOf(dot)) + '.' + amountEntered.substring(amountEntered.indexOf(dot) + 1, amountEntered.length);
}

/**
 * handleCardAuthorizationFailure - handle the case where card auth fails/is declined
 *
 * @param {Object} failedModel
 * @api private
 */
function handleCardAuthorizationFailure(failedModel) {
    var alertMessage = _L('Error applying credit card. \nPlease try again.');
    if (failedModel.has('fault') && failedModel.get('fault')) {
        var fault = failedModel.get('fault');
        if (fault) {
            if (fault.message && fault.message != '') {
                alertMessage = fault.message;
            } else if (fault.decision && fault.decision == 'REJECT') {
                alertMessage = _L('Card was declined. Please try another card.');
            }

            if (fault.description && fault.description != '') {
                alertMessage += '\n' + fault.description;
            }
            if (fault.reasonCode && fault.reasonCode != '') {
                alertMessage += ' (' + _L('Reason Code: ') + fault.reasonCode + ')';
            }
        }
    }

    return alertMessage;
}

/**
 * ccPaymentApproved - a credit card payment has been approved
 *
 * @param {Object} event
 * @api private
 */
function ccPaymentApproved(event) {
    return ccPaymentEntered(event);
}

/**
 * ccPaymentDeclined - a credit card payment has been declined
 *
 * @param {Object} event
 * @api private
 */
function ccPaymentDeclined(event) {
    Alloy.Dialog.showAlertDialog({
        messageString : event.description,
        titleString : _L('Payment Declined')
    });
}

/**
 * ccPaymentError - a credit card payment has an error
 *
 * @param {Object} event
 * @api private
 */
function ccPaymentError(event) {
    Alloy.Dialog.showAlertDialog({
        messageString : event.message,
        titleString : _L('Payment Error')
    });
}

/**
 * swipeCreditCard - user wants to swipe a credit card
 *
 * @param {Object} options
 * @api private
 */
function swipeCreditCard(options) {
    // only want to be listening for CC events once
    if (!listeningCC) {
        // For payment devices that capture only credit card data
        $.listenTo(Alloy.eventDispatcher, 'payment:credit_card_data', ccPaymentEntered);
        // For payment devices that have offline/external auth/capture and don't expose CC data to DW at all
        $.listenTo(Alloy.eventDispatcher, 'payment:cc_approved', ccPaymentApproved);
        // Handle payment declined
        $.listenTo(Alloy.eventDispatcher, 'payment:cc_declined', ccPaymentDeclined);
        // Handle payment error
        $.listenTo(Alloy.eventDispatcher, 'payment:cc_error', ccPaymentError);
        // Handle stop listening from paymentTerminal
        $.listenTo(Alloy.eventDispatcher, 'payment:stop_payment_listening', stopPaymentListening);
        listeningCC = true;
    }
    // simulate payments? for testing purposes only
    if (Alloy.CFG.allow_simulate_payment && Alloy.CFG.devices.payment_terminal_module != 'adyenDevice') {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/payments/simulatePayment',
            initOptions : {
                event_type : 'payment:credit_card_data',
                button_data : [{
                    track_1 : '%B4111111111111111^LEBOWSKI/JEFF ^1812101000000000011111111000000?',
                    track_2 : ';4111111111111111=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Visa'
                }, {
                    track_1 : '%5555555555554444^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';5555555555554444=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Mastercard'
                }, {
                    track_1 : '%378282246310005^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';378282246310005=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate AMEX'
                }, {
                    track_1 : '%6011822463100051^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';6011822463100051=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Discover'
                }, {
                    track_1 : '%30569309025904^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';30569309025904=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Diners Club'
                }, {
                    track_1 : '%3528000700000000^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';3528000700000000=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate JCB'
                }, {
                    track_1 : '%6759649826438453^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';6759649826438453=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Maestro'
                }, {
                    track_1 : '%630495060000000000^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';630495060000000000=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Laser'
                }, {
                    track_1 : '%6334960300099354^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';6334960300099354=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Solo'
                }, {
                    track_1 : '%6395129637937969^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';6395129637937969=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate Instapayment'
                }, {
                    track_1 : '%6240008631401148^SOZE/KEYSER ^1812101000000000011111111000000?',
                    track_2 : ';6240008631401148=181210111111111?',
                    is_contactless : false,
                    title : 'Simulate China Unionpay'
                }]
            },
            cancelEvent : 'simulate_payment:dismiss',
            continueEvent : 'simulate_payment:swipe',
            continueFunction : function() {
                $.trigger('payment:use_terminal', options);
            },
        });
    } else if (Alloy.CFG.allow_simulate_payment && Alloy.CFG.devices.payment_terminal_module == 'adyenDevice') {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/payments/simulatePayment',
            initOptions : {
                event_type : 'payment:cc_approved',
                button_data : [{
                    owner : 'TC04_MC_Approved_DCC',
                    card_type : 'Mastercard',
                    pan : 'xxxx-xxxx-xxxx-9990',
                    month : '02',
                    year : '2028',
                    transaction_id : '8814782013951911',
                    payment_reference_id : '123456',
                    is_contactless : false,
                    terminal_id : 'E355-400163777',
                    tender_reference : 'zDNA001162668548081',
                    final_state : 47,
                    final_state_string : 'APPROVED',
                    title : 'Simulate Adyen (Mastercard)'
                }]
            },
            cancelEvent : 'simulate_payment:dismiss',
            continueEvent : 'simulate_payment:swipe',
            continueFunction : function() {
                $.trigger('payment:use_terminal', options);
            },
        });
    } else {
        logger.info('trigger use payment terminal event');
        $.trigger('payment:use_terminal', options);
    }
}

/**
 * gcPaymentEntered - gift card has been swiped
 *
 * @param {Object} event
 * @api private
 */
function gcPaymentEntered(event) {
    stopPaymentListening();
    var payment = {
        track_1 : event.track_1,
        track_2 : event.track_2,
        order_no : currentBasket.getOrderNumber()
    };
    var checkBalance = currentBasket.giftCardBalance(payment);
    Alloy.Router.showActivityIndicator(checkBalance);
    // get the gift card balance
    checkBalance.done(function(model, options, params) {
        var balanceOnCard = model.getBalance();
        var amountToApply = 0;
        var remainingBalance;
        if (balanceOnCard != 0) {
            // got the gift card balance.
            // see if it's sufficient for the amount entered in the text box.
            // if nothing entered in the text box, see what's bigger - balance on gift card or balance remaining
            // if balance remaining is > balance on gift card, apply balance on gift card
            // if balance remaining is <= balance on gift card, apply balance remaining
            var amountEntered = $.number_entered.getText();
            var amountToApply = currentBasket.calculateBalanceDue();
            if (usingMultipleCards) {
                //if an amount was entered, use that, but only up to the balance due
                if (amountEntered !== blankNumberEntered) {
                    var enteredNumber = formatAmount(amountEntered);
                    var entered = enteredNumber - 0;
                    if (entered < amountToApply) {
                        amountToApply = enteredNumber - 0;
                    }
                }
                var toApply = 0;
                if (amountEntered !== blankNumberEntered && amountToApply > balanceOnCard) {
                    amountToApply = balanceOnCard;
                } else if (amountToApply > balanceOnCard) {
                    // using only one card, but the amount to pay is more than the balance, so
                    // just use the balance on the card
                    amountToApply = balanceOnCard;

                }
            } else if (amountToApply > balanceOnCard) {
                amountToApply = balanceOnCard;
            }
        }
        var lastFour = model.getMaskedCode();
        lastFour = lastFour.substr(lastFour.length - 4);
        remainingBalance = balanceOnCard - amountToApply;
        // show the gift card balance modal
        $.trigger('payment:gc_balance', {
            message : _L('Details for gift card ending in:') + ' ' + lastFour,
            toApply : amountToApply,
            currentBalance : balanceOnCard,
            remainingBalance : remainingBalance,
            track_1 : event.track_1,
            track_2 : event.track_2,
            order_no : currentBasket.getOrderNumber()
        });
    }).fail(function(failModel, failOptions, failParams) {
        $.trigger('payment:error', {
            title : _L('Payment Status'),
            message : _L('The Gift Card is not recognized by the gift card processor. Please try again or choose a different payment method.')
        });
    });
}

/**
 * swipeGiftCard - gift card has asked to be swiped
 *
 * @param {Object} options
 * @api private
 */
function swipeGiftCard(options) {
    // only listen once
    if (!listeningGC) {
        $.listenTo(Alloy.eventDispatcher, 'payment:gift_card_data', gcPaymentEntered);
        listeningGC = true;
    }
    // allow simulate payment? for testing purposes only
    if (Alloy.CFG.allow_simulate_payment) {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'checkout/payments/simulatePayment',
            initOptions : {
                event_type : 'payment:gift_card_data',
                button_data : [{
                    track_1 : '%B89897686443^YOU/A GIFT FOR            ^1905122100606873?',
                    track_2 : ';89897686443=190512210060687300000?',
                    title : 'Simulate 200k'
                }, {
                    track_1 : '%B45198732542^YOU/A GIFT FOR            ^1905122100606873?',
                    track_2 : ';45198732542=190512210060687300000?',
                    title : 'Simulate 0'
                }, {
                    track_1 : '%B77812450912^YOU/A GIFT FOR            ^1905122100606873?',
                    track_2 : ';7781240912=190512210060687300000?',
                    title : 'Simulate bad card'
                }]
            },
            cancelEvent : 'simulate_payment:dismiss',
            continueEvent : 'simulate_payment:swipe',
            continueFunction : function() {
                $.trigger('payment:use_terminal', options);
            },
        });
    } else {
        // show the use payment terminal modal
        $.trigger('payment:use_terminal', options);
    }
}

/**
 * authorize payments  - authorize all the payments
 *
 * @param {Deferred} deferred
 * @api private
 */
function authorizePayments(deferred) {
    currentBasket.authorizePayment().done(function() {
        // payment went well, show approval dialog and then fetch new basket when dialog is dismissed
        deferred.resolve();
        $.trigger('payment:success', {
            title : _L('Approved'),
            message : _L('Payment Approved'),
            completionFunction : function() {
                fetchOrder();
            }
        });
    }).fail(function() {
        deferred.reject();
        notify(_L('Payments could not be authorized'), {
            preventAutoClose : true
        });
    });
}

/**
 * fetchOrder - fetch the newly completed order from the server
 *
 * @param {Deferred} deferred
 * @api private
 */
function fetchOrder(deferred) {
    var order_no = currentBasket.getOrderNumber();
    var b = currentBasket.clone();

    if (!deferred) {
        deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
    }
    currentBasket.clear({
        silent : true
    });
    // reset the basket
    currentBasket.getBasket({
        c_eaEmployeeId : Alloy.Models.associate.getEmployeeId()
    }).done(function() {
        if (currentCustomer.isLoggedIn()) {
            currentCustomer.claimBasket(currentBasket).done(function() {
                finishFetchOrder(order_no, deferred);
            }).fail(function() {
                deferred.reject();
            });
        } else {
            finishFetchOrder(order_no, deferred);
        }

    }).fail(function() {
        deferred.reject();
    });
}

/**
 * finishFetchOrder - finish fetching the newly completed order from the server
 *
 * @param {String} order_no
 * @param {Deferred} deferred
 * @api private
 */
function finishFetchOrder(order_no, deferred) {
    currentBasket.trigger('change');
    currentBasket.trigger('basket_sync');
    // get the order
    var customerOrder = Alloy.createModel('baskets');
    customerOrder.getOrder({
        order_no : order_no
    }).done(function() {
        // let listeners know the order succeeded
        Alloy.Models.order = this;
        Alloy.eventDispatcher.trigger('order_just_created', this);
        deferred.resolve();
    }).fail(function() {
        deferred.reject();
    });
}

/**
 * selectButton - set the selected state of a button
 *
 * @param {Button} button
 * @param {Boolean} selected
 * @api private
 */
function selectButton(button, selected) {
    if (selected) {
        button.setBackgroundImage(selectedButtonBackground);
        button.setColor(selectedColor);
    } else {
        button.setBackgroundImage(deselectedButtonBackground);
        button.setColor(deselectedColor);
    }
}

/**
 * calculateBalanceDue - how much is left?
 *
 * @api private
 */
function calculateBalanceDue() {
    var balance = currentBasket.calculateBalanceDue();
    $.balance_due.setText(toCurrency(balance));
    $.credit_card_button.setEnabled(balance != 0);
    $.gift_card_button.setEnabled(balance != 0);

    Alloy.eventDispatcher.trigger('payment_terminal:dismiss');
    return balance;
}

/**
 * canAddNumber - determine if another number can be added to the number entered text field
 *
 * @api private
 */
function canAddNumber() {
    if (!Alloy.CFG.enable_multi_tender_payments) {
        return false;
    }
    var number = $.number_entered.getText();
    return (number.indexOf('.') < 0 || number.indexOf('.') >= number.length - 2);
}

/**
 * cancelOrder - cancel the order and leave the payment screen
 *
 * @api private
 */
function cancelOrder() {
    logger.info('cancel order button tapped');
    // no longer listen to payment messages when the cancel order button has been tapped
    stopPaymentListening();

    var orderNo = currentBasket.getOrderNo();
    // execute in a timeout to avoid a possible race condition where the request to
    // cancel the transaction arrives before the transaction is created in the payment
    // provider's systems
    setTimeout(function() {
        logger.info('payments/index(cancelOrder): cancelServerTransaction for order: ' + orderNo);
        paymentTerminal.cancelServerTransaction({
            order_no : orderNo
        });
    }, 5000);

    var promise = currentBasket.abandonOrder(Alloy.Models.associate.getEmployeeId(), Alloy.Models.associate.getPasscode(), Alloy.CFG.store_id);
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        // cart abandonded, reset this page
        selectButton($.credit_card_button, false);
        selectButton($.gift_card_button, false);
        $.number_entered.setText('');
        $.trigger('orderAbandoned', {});
    }).fail(function() {
        Alloy.Dialog.showConfirmationDialog({
            messageString : _L('The order needs to be cancelled before you can continue. Please try again.'),
            titleString : _L('Unable to cancel order.'),
            okButtonString : _L('Retry'),
            cancelButtonString : _L('Cancel'),
            hideCancel : false,
            okFunction : function() {
                removeNotify();
                cancelOrder();
            },
            cancelFunction : function() {
                removeNotify();
            }
        });
    });
}

/**
 * handleSwipeButton - handle the swipe button tap
 *
 * @param {Number} amount
 * @api private
 */
function handleSwipeButton(amount) {
    logger.info('enter button tapped');
    if (paymentMethodType === creditCardPaymentType) {
        swipeCreditCard({
            amount : amount
        });
    } else if (paymentMethodType === giftCardPaymentType) {
        swipeGiftCard({
            amount : amount
        });
    }
}

/**
 * setPaymentType - set the payment type (supports credit card and gift cards)
 *
 * @param {String} type
 * @api private
 */
function setPaymentType(type) {
    if (type === creditCardPaymentType) {
        selectButton($.credit_card_button, true);
        selectButton($.gift_card_button, false);
    } else if (type == giftCardPaymentType) {
        selectButton($.credit_card_button, false);
        selectButton($.gift_card_button, true);
    }
    paymentMethodType = type;
}

/**
 * sendAnalyticsEvents - send an analytics event
 *
 * @api private
 */
function sendAnalyticsEvents() {
    analytics.fireTransactionEvent({
        orderId : currentBasket.getOrderNo(),
        storeId : Alloy.Models.storeInfo.getId(),
        total : currentBasket.getOrderTotal(),
        tax : currentBasket.getTaxTotal(),
        shipping : currentBasket.getShippingTotal(),
        currency : currentBasket.getCurrency()
    });

    var products = currentBasket.getProductItems();
    if (!products) {
        return;
    }

    _.each(products, function(product) {
        analytics.fireTransactionItemEvent({
            orderId : currentBasket.getOrderNo(),
            name : product.getProductName(),
            productId : product.getProductId(),
            price : product.getPrice(),
            quantity : product.getQuantity(),
            currency : currentBasket.getCurrency()
        });
    });
}
