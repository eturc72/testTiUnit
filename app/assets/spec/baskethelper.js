// ©2013-2017 salesforce.com, inc. All rights reserved.

var helper = require('testhelper');
var firstName = Alloy.CFG.customerInfoConfiguration.firstName;
var lastName = Alloy.CFG.customerInfoConfiguration.lastName;
var address_1 = Alloy.CFG.customerInfoConfiguration.address_1;
var address_2 = Alloy.CFG.customerInfoConfiguration.address_2;
var cityName = Alloy.CFG.customerInfoConfiguration.cityName;
var state = Alloy.CFG.customerInfoConfiguration.state;
var zipCode = Alloy.CFG.customerInfoConfiguration.zipCode;
var country = Alloy.CFG.customerInfoConfiguration.country;
var phn = Alloy.CFG.customerInfoConfiguration.phn;
var afterCouponApplied = Alloy.CFG.modelTestsConfiguration.afterCouponAmount;
var coupon = Alloy.CFG.modelTestsConfiguration.coupon;
var shippingMethods,
    method;

exports.newBasket = function(clearCookies, employeeId, afterNewBasketClosure) {
    // Must reset cookies to get a guaranteed empty basket - does bad things though ...
    if (clearCookies) {
        Alloy.Globals.resetCookies();
    }
    it.eventually('fetch an empty basket', function(done) {
        var basket = helper.newBasketModel();
        basket.getBasket({
            c_eaEmployeeId : employeeId
        }).fail(function(error) {
            helper.failure(error);
        }).done(function() {
            helper.equals(basket.getProductItems().length, 0);
            it('check no shipping method in empty basket', function() {
                helper.isUndefined(basket.get('shipments[0]').get('shipping_method'));
            });

            afterNewBasketClosure(basket);

        }).always(function() {
            done();
        });
    });
};

exports.newBasketAddProduct = function(productId, productQuantity, employeeId, storeId, clearCookies, afterAddProductClosure) {
    // Must reset cookies to get a guaranteed empty basket - does bad things though ...
    if (clearCookies) {
        Alloy.Globals.resetCookies();
    }
    var self = this;
    this.newBasket(false, employeeId, function(basket) {
        self.addProduct(basket, productId, productQuantity, employeeId, storeId, clearCookies, afterAddProductClosure);
    });
};

exports.addProduct = function(basket, productId, productQuantity, employeeId, storeId, clearCookies, afterAddProductClosure) {
    it.eventually('add a product to the basket', function(done) {
        basket.addProduct({
            product_id : productId,
            quantity : productQuantity,
        }, {
            c_employee_id : employeeId,
            c_store_id : storeId
        }).fail(function(error) {
            helper.failure(error);
        }).done(function() {
            helper.equals(basket.getProductItems().length, 1);
            it('check product quantity', function() {
                helper.equals(basket.getProductItemsCollection().models[0].getQuantity(), productQuantity);
            });
            afterAddProductClosure(basket);

        }).always(function() {
            done();
        });
    });

};

exports.loginAssociateWithCredentials = function(employeeID, employeePasscode, clearCookies, afterLoginClosure) {
    // Must reset cookies to get a guaranteed empty basket - does bad things though ...
    if (clearCookies) {
        Alloy.Globals.resetCookies();
    }

    it.eventually('login as associate', function(done) {
        var associate = helper.newAssociateModel();
        associate.loginAssociate({
            employee_id : employeeID,
            passcode : employeePasscode
        }).fail(function(error) {
            helper.failure(error);
        }).done(function() {
            helper.isTrue(associate.isLoggedIn());
            Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).fail(function(model) {
                helper.failure(error);
            }).done(function() {
                afterLoginClosure(associate);
            }).always(function() {
                done();
            });
        });
    });
};

exports.logoutAssociate = function(associate, afterLogoutClosure) {
    it.eventually('logout associate', function(done) {
        associate.logout().fail(function(error) {
            helper.failure(error);
        }).done(function() {
            helper.isFalse(associate.isLoggedIn());

            afterLogoutClosure();

        }).always(function() {
            done();
        });
    });
};

exports.loginCustomer = function(clearCookies, afterLoginClosure) {
    this.loginCustomerWithEmail(null, clearCookies, afterLoginClosure);
};

exports.loginCustomerWithEmail = function(emailAddress, basket, clearCookies, afterLoginClosure) {
    // Must reset cookies to get a guaranteed empty basket - does bad things though ...
    if (clearCookies) {
        Alloy.Globals.resetCookies();
    }

    var email = emailAddress;
    if (email === undefined || email === null) {
        email = Alloy.CFG.modelTestsConfiguration.customerEmail;
    }

    it.eventually('login as customer', function(done) {
        var customer = helper.newCustomerModel();
        customer.loginCustomer({
            login : email
        }, basket).fail(function(error) {
            helper.failure(error);
        }).done(function() {
            helper.isTrue(customer.isLoggedIn());

            afterLoginClosure(customer);

        }).always(function() {
            done();
        });
    });
};

exports.logoutCustomer = function(customer, basket, employee_code, afterLogoutClosure) {
    it.eventually('logout customer', function(done) {
        customer.syncSavedProducts(basket, {
            c_employee_id : employee_code
        }).fail(function(error) {
            helper.failure(error);
        }).done(function() {
            basket.deleteBasket().done(function() {
                if (afterLogoutClosure) {
                    afterLogoutClosure();
                }
            }).fail(function(error) {
                helper.failure(error);
            }).always(function() {
                done();
            });
        });
    });
};

exports.logoutCustomerWithPromise = function(customer, basket, employee_code, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('logout customer', function(done) {
            customer.syncSavedProducts(basket, {
                c_employee_id : employee_code
            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                basket.deleteBasket().done(function() {
                    thisDeferred.resolve();
                }).always(function() {
                    done();
                });

            }).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// run the removeProduct test
exports.removeProductTest = function(basket, index, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('remove product from basket', function(done) {
            var id = basket.getProductItems()[index].getItemId();
            basket.removeItem(id).fail(function(error) {
                helper.failure(error.get('fault'));
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.getProductItems().length, 0);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// Add shipping address
function addShippingAddress(basket, employee_id, address, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('set shipping address', function(done) {
            address = address || getAddress();
            basket.setShippingAddress(address, {
                c_employee_id : employee_id
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function(model) {
                var shipments = basket.get('shipments');
                helper.equals(shipments.length, 1);

                var shippingAddress = basket.getShippingAddress();
                var fName = shippingAddress.getFirstName();
                helper.equals(fName, firstName);

                var lName = shippingAddress.getLastName();
                helper.equals(lName, lastName);

                var address1 = shippingAddress.getAddress1();
                helper.equals(address1, address_1);

                var address2 = shippingAddress.getAddress2();
                helper.equals(address2, address_2);

                var postal_code = shippingAddress.getPostalCode();
                helper.equals(postal_code, zipCode);

                var city = shippingAddress.getCity();
                helper.equals(city, cityName);

                var state_code = shippingAddress.getStateCode();
                helper.equals(state_code, state);

                var country_code = shippingAddress.getCountryCode();
                helper.equals(country_code, country);

                var phone = shippingAddress.getPhone();
                helper.equals(phone, phn);

                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// set the shipping address and email into the basket
exports.setShippingAddressAndEmail = function(basket, employee_id, address, emailAddress, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        var def = addShippingAddress(basket, employee_id, address);
        def = addCustomerEmail(basket, emailAddress, def);
        def.done(function() {
            thisDeferred.resolve();
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// get basket shipping methods available
exports.getBasketShippingMethods = function(basket, employee_id, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('get basket shipping methods', function(done) {
            basket.getShippingMethods({
                c_employee_id : employee_id
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function(model) {
                shippingMethods = basket.shippingMethods;
                helper.equals(shippingMethods.length, 4);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// set basket shipping method
exports.setBasketShippingMethod = function(basket, shippingMethodId, employeeId, expectedShippingTotal, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('set basket shipping method', function(done) {
            basket.setShippingMethod({
                id : shippingMethodId
            }, null, {
                c_employee_id : employeeId
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                shipments = basket.get('shipments');
                if (shipments.length > 0) {
                    var methodSet = shipments.at(0).get('shipping_method');
                    helper.equals(basket.get('shipping_total'), expectedShippingTotal);
                } else {
                    helper.failure({
                        type : 'basketPriceOverrides Error',
                        message : 'The shipments length should not be 0'
                    });
                }
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

exports.setBasketGiftMessage = function(basket, giftMessage, giftBoolean, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('set gift message method', function(done) {
            basket.updateShipment({
                gift : giftBoolean,
                gift_message : giftMessage
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                shipments = basket.get('shipments');
                if (shipments.length > 0) {
                    var methodSet = shipments.at(0).get('gift_message');
                    helper.equals(methodSet, giftMessage);
                } else {
                    helper.failure({
                        type : 'basketPriceOverrides Error',
                        message : 'The shipments length should not be 0'
                    });
                }
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};
// set billing address
exports.setBillingAddress = function(basket, employee_id, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('add a payment address', function(done) {
            basket.setBillingAddress(getAddress(), {
                c_employee_id : employee_id
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var billingAddress = basket.getBillingAddress();

                var fName = billingAddress.getFirstName();
                helper.equals(fName, firstName);

                var lName = billingAddress.getLastName();
                helper.equals(lName, lastName);

                var address1 = billingAddress.getAddress1();
                helper.equals(address1, address_1);

                var address2 = billingAddress.getAddress2();
                helper.equals(address2, address_2);

                var postal_code = billingAddress.getPostalCode();
                helper.equals(postal_code, zipCode);

                var city = billingAddress.getCity();
                helper.equals(city, cityName);

                var state_code = billingAddress.getStateCode();
                helper.equals(state_code, state);

                var country_code = billingAddress.getCountryCode();
                helper.equals(country_code, country);

                var phone = billingAddress.getPhone();
                helper.equals(phone, phn);

                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

function getAddress() {
    return {
        first_name : firstName,
        last_name : lastName,
        address1 : address_1,
        address2 : address_2,
        postal_code : zipCode,
        city : cityName,
        state_code : state,
        country_code : country,
        phone : phn
    };
};

// add customer email
function addCustomerEmail(basket, emailToSet, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('add customer info(email)', function(done) {
            basket.setCustomerInfo(getCustomerInfo(emailToSet)).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var email = basket.get('customer_info').email;
                helper.equals(email, emailToSet);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
}

// get customer email
function getCustomerInfo(email) {
    return {
        email : email
    };
}

//create a new order
exports.createNewOrder = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        // create a new order
        it.eventually('create a new order', function(done) {
            basket.createOrder().fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isNotUndefined(basket.getOrderNo());
                helper.isNotNull(basket.getOrderNo());
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// send Email
exports.sendEmail = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('send order email', function(done) {
            basket.emailOrder(basket.getOrderNo()).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

//check gift card balance
exports.checkGiftcardBalance = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('check gift card balance', function(done) {
            basket.giftCardBalance({
                track_1 : '%B89897686443^YOU/A GIFT FOR            ^1905122100606873?',
                track_2 : ';89897686443=190512210060687300000?'
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function(balance) {
                helper.equals(balance.get('balance_available'), 'true');
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// authorizegift card
exports.authorizeGiftCard = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('authorize gift card', function(done) {
            basket.authorizeGiftCard({
                order_no : basket.getOrderNo(),
                track_1 : '%B89897686443^YOU/A GIFT FOR            ^1905122100606873?',
                track_2 : ';89897686443=190512210060687300000?',
                redeem_amount : 5.0
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var gcDetails = basket.getPaymentDetails()[0];
                helper.equals(gcDetails.payment_method, 'GIFT_CERTIFICATE');
                helper.equals(gcDetails.status, 'ok');
                helper.equals(gcDetails.amt_auth, 5);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// remove gift card
exports.removeGiftCard = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {

        it.eventually('remove gift card', function(done) {
            basket.removeGiftCard({
                order_no : basket.getOrderNo(),
                gift_card_last_four : '6443'
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isUndefined(basket.getPaymentDetails());
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// authorize credit card
exports.authorizeCreditCard = function(basket, amount, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {

        it.eventually('authorize credit card', function(done) {
            amount = !amount ? basket.getOrderTotal() : amount;
            basket.authorizeCreditCard({
                order_no : basket.getOrderNo(),
                track_1 : '%B4111111111111111^LEBOWSKI/JEFF ^1812101000000000011111111000000?',
                track_2 : ';4111111111111111=181210111111111?',
                auth_amount : amount
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                var ccDetails = basket.getPaymentDetails()[0];
                helper.equals(ccDetails.payment_method, 'EA_Credit_Card 1111');
                helper.equals(ccDetails.status, 'ok');
                helper.equals(ccDetails.amt_auth, amount);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// remove credit card
exports.removeCreditCard = function(basket, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {

        it.eventually('remove credit card', function(done) {
            basket.removeCreditCard({
                order_no : basket.getOrderNo(),
                credit_card_last_four : '1111'
            }).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isUndefined(basket.getPaymentDetails());
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// abandon order
exports.abandonOrder = function(basket, employeeId, employeePasscode, storeId, giftMessage, shippingMethodId, expectedShippingTotal, priceAfterOverrideAmount, expectedAmount, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {

        it.eventually('abandon order', function(done) {
            basket.abandonOrder(employeeId, employeePasscode, storeId).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {

                // Verifying gift message
                if (giftMessage) {
                    helper.equals(basket.getGiftMessage(), giftMessage);
                }
                helper.isUndefined(basket.getPaymentDetails());

                // Verifying shipping address
                var shippingAddress = basket.getShippingAddress();
                var fName = shippingAddress.getFirstName();
                helper.equals(fName, firstName);

                var lName = shippingAddress.getLastName();
                helper.equals(lName, lastName);

                var address1 = shippingAddress.getAddress1();
                helper.equals(address1, address_1);

                var address2 = shippingAddress.getAddress2();
                helper.equals(address2, address_2);

                var postal_code = shippingAddress.getPostalCode();
                helper.equals(postal_code, zipCode);

                var city = shippingAddress.getCity();
                helper.equals(city, cityName);

                var state_code = shippingAddress.getStateCode();
                helper.equals(state_code, state);

                var country_code = shippingAddress.getCountryCode();
                helper.equals(country_code, country);

                var phone = shippingAddress.getPhone();
                helper.equals(phone, phn);

                //Verifying shipping method , shipping override
                var methodSet = basket.getShippingMethod();
                helper.equals(basket.getShippingTotal(), priceAfterOverrideAmount);
                helper.equals(methodSet.get('id'), shippingMethodId);

                //Verifying billing address
                var billingAddress = basket.getBillingAddress();
                var fName = billingAddress.getFirstName();
                helper.equals(fName, firstName);

                var lName = billingAddress.getLastName();
                helper.equals(lName, lastName);

                var address1 = billingAddress.getAddress1();
                helper.equals(address1, address_1);

                var address2 = billingAddress.getAddress2();
                helper.equals(address2, address_2);

                var postal_code = billingAddress.getPostalCode();
                helper.equals(postal_code, zipCode);

                var city = billingAddress.getCity();
                helper.equals(city, cityName);

                var state_code = billingAddress.getStateCode();
                helper.equals(state_code, state);

                var country_code = billingAddress.getCountryCode();
                helper.equals(country_code, country);

                var phone = billingAddress.getPhone();
                helper.equals(phone, phn);

                //Verifying the product price override
                var productPriceOverride = basket.getProductTotal();
                helper.equals(productPriceOverride, afterCouponApplied);

                // Verifying the coupon
                helper.equals(basket.getCouponItems()[0].get('code'), coupon);

                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// set basket shipping price override
exports.setShippingPriceOverride = function(basket, shippingMethodId, productsCount, overrideValue, overrideType, overrideReason, employeeId, employeePasscode, storeId, managerId, managerPasscode, actualPrice, expectedPriceAfterOverride, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('set shipping price override', function(done) {
            basket.setShippingPriceOverride({
                shipping_method_id : shippingMethodId,
                price_override_value : overrideValue,
                price_override_type : overrideType,
                price_override_reason_code : overrideReason,
                manager_employee_id : managerId,
                manager_employee_passcode : managerPasscode,
                employee_id : employeeId,
                employee_passcode : employeePasscode,
                store_id : storeId,
            }, {
                c_employee_id : employeeId
            }).fail(function(error) {
                helper.failure(error.get('fault'));
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.get('shipping_total'), expectedPriceAfterOverride);
                helper.equals(basket.getProductItems().length, productsCount);
                var overrideDetails = basket.getShippingMethod();
                helper.equals(overrideDetails.get('price_override'), 'true');
                helper.equals(overrideDetails.get('base_price'), actualPrice);
                helper.equals(overrideDetails.get('price_override_value'), overrideValue);
                helper.equals(overrideDetails.get('price_override_type'), overrideType);
                helper.equals(overrideDetails.get('base_price_override'), expectedPriceAfterOverride);
                helper.equals(overrideDetails.get('price_override_reason_code'), overrideReason);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

//remove override test
exports.removeShippingPriceOverride = function(basket, shippingMethodId, expectedShippingTotal, employeeId, employeePasscode, storeId, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('remove shipping price override', function(done) {
            basket.setShippingPriceOverride({
                shipping_method_id : shippingMethodId,
                price_override_type : 'none',
                employee_id : employeeId,
                employee_passcode : employeePasscode,
                store_id : storeId,
            }, {
                c_employee_id : employeeId
            }).fail(function(error) {
                helper.failure(error.get('fault'));
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.get('shipping_total'), expectedShippingTotal);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// apply override test
exports.setProductPriceOverride = function(basket, productId, index, overrideValue, overrideType, overrideReason, employeeId, employeePasscode, storeId, managerId, managerPasscode, expectedAmount, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('set product price override', function(done) {

            basket.setProductPriceOverride({
                product_id : productId,
                price_override_value : overrideValue,
                price_override_type : overrideType,
                price_override_reason_code : overrideReason,
                manager_employee_id : managerId,
                manager_employee_passcode : managerPasscode,
                employee_id : employeeId,
                employee_passcode : employeePasscode,
                store_id : storeId,
                index : index
            }, {
                c_employee_id : employeeId
            }).fail(function(error) {
                helper.failure(error.get('fault'));
                thisDeferred.reject();
            }).done(function() {
                helper.equals(basket.getProductItems()[0].getPrice(), expectedAmount);
                helper.equals(basket.getProductItems()[0].getPriceOverrideType(), overrideType);
                helper.equals(basket.getProductItems()[0].getPriceOverrideReasonCode(), overrideReason);
                helper.equals(basket.getProductItems()[0].getPriceOverrideValue(), overrideValue);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

// run the addCoupon test
exports.addCouponTest = function(basket, coupon, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('add a coupon', function(done) {
            basket.addCoupon(coupon).fail(function() {
                helper.failure();
                thisDeferred.reject();
            }).done(function() {
                helper.isTrue(basket.hasCoupon(coupon));
                it('check coupon code', function() {
                    helper.equals(basket.getCouponItems()[0].get('code'), coupon);
                });
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

exports.logoutAssociatePromise = function(associate, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('logout associate', function(done) {
            associate.logout().fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.isFalse(associate.isLoggedIn());
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

exports.loginCustomerPromise = function(customerEmail, basket, clearCookies, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('login as customer', function(done) {
            if (clearCookies) {
                Alloy.Globals.resetCookies();
            }
            var customer = helper.newCustomerModel();
            customer.loginCustomer({
                login : customerEmail
            }, basket).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.isTrue(customer.isLoggedIn());
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};

exports.removeSavedProduct = function(customer, product, deferred) {
    var thisDeferred = new _.Deferred();
    var func = function() {
        it.eventually('remove saved product', function(done) {
            var numSavedProducts = customer.getSavedProducts().length;
            customer.removeSavedProduct(product).fail(function(error) {
                helper.failure(error);
                thisDeferred.reject();
            }).done(function() {
                helper.equals(customer.getSavedProducts().length, numSavedProducts - 1);
                thisDeferred.resolve();
            }).always(function() {
                done();
            });
        });
    };
    deferred ? deferred.done(func) : func();
    return thisDeferred.promise();
};
