// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/index.js - main application startup controller
 */

//---------------------------------------------------
// ## VARIABLES

// Runs through a list of actions that are necessary for successful application launch
var animation = require('alloy/animation');
require('reporter');
var analytics = require('analyticsBase');
var logger = require('logging')('application:index', getFullControllerPath($.__controllerPath));

var validateAppSettings = require('Validations').validateAppSettings;
var validateNetwork = require('Validations').validateNetwork;
var validateStorefront = require('Validations').validateStorefront;
var validateDevicesStartup = require('Validations').validateDevicesStartup;
var loadConfigurations = require('appConfiguration').loadConfigurations;
var showActivityIndicator = require('dialogUtils').showActivityIndicator;
var countryConfig = require('config/countries').countryConfig;
var geolocation = require('./geolocation');

var notifyReadDelay = 250;
var notifyDelayStartup = 10000;

var appSettings = require('appSettings');
var EAUtils = require('EAUtils');
var storePasswordHelpers = require('storePasswordHelpers');

// in an effort to avoid calling this multiple times based on this:
//http://docs.appcelerator.com/titanium/3.0/#!/guide/Coding_Best_Practices
Alloy.Platform = Ti.Platform.osname;

var loading = false,
    appIndexController,
    refreshing = false;

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'app:startup', init);

$.listenTo(Alloy.eventDispatcher, 'app:login', doAppLogin);

$.listenTo(Alloy.eventDispatcher, 'configurations:prelogin', onConfigsPreLogin);

$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', onConfigsPostLogin);

$.listenTo(Alloy.eventDispatcher, 'configurations:store_availability.max_distance_search', loadAllStores);

$.listenTo(Alloy.eventDispatcher, 'configurations:store_availability.distance_unit', loadAllStores);

$.listenTo(Alloy.eventDispatcher, 'associate_logout', onAssociateLogout);

$.listenTo(Alloy.eventDispatcher, 'tests:run', onTestsRun);

Ti.Network.addEventListener('change', networkDidChange);

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT - implements first time launching pre-flight checklist
 * called when app:startup is triggered
 *
 * @return {Deferred} promise
 * @api private
 */
function init() {
    var deferred = new _.Deferred();

    if (loading) {
        deferred.reject();
        return deferred.promise();
    }
    loading = true;
    // in case failure occurs during startup we want to remove any previous notify messages
    removeNotify();

    allowAppSleep(true);

    // get the local db settings for startup configuration (store id)
    loadConfigurations(true).done(function() {
        // check for restart of the app and move back to index if needed
        if ($.appIndex) {
            switchToIndex().always(function() {
                doStartupValidations().done(function() {
                    deferred.resolve();
                }).fail(function() {
                    deferred.reject();
                });
            });
        } else {
            doStartupValidations().done(function() {
                deferred.resolve();
            }).fail(function() {
                deferred.reject();
            });
        }
    }).fail(function() {
        deferred.reject();
        failStartup(_L('Unable to load application settings.'));
    });

    return deferred.promise();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * doStartupValidations - where all the application validations are done to check for readiness of starting app
 *
 * @return {Deferred} promise
 * @api private
 */
function doStartupValidations() {
    var deferred = new _.Deferred();
    logger.info('Doing startup');
    if (Alloy.CFG.languageSelected) {
        Ti.Locale.setLanguage(Alloy.CFG.languageSelected);
    }
    validateAppSettings().fail(function() {
        failStartup(_L('Unable to validate application settings.'));
        deferred.reject();
    }).done(function() {
        validateNetwork().fail(function() {
            failStartup(_L('Unable to connect to a network.'));
            deferred.reject();
        }).done(function() {
            validateStorefront().fail(function(responseText) {
                failStartup(_L('Unable to connect to storefront.'), responseText);
                deferred.reject();
            }).done(function() {
                // storefront is required for stores in welcome dialog, validate devices requires store id
                welcomeMessage().always(function() {
                    validateDevicesStartup().fail(function(response) {
                        failStartup(response.faultDescription, response);
                        deferred.reject();
                    }).done(function() {
                        // Validations passed so now load the application requirements and start app
                        loadModels(_L('Loading Countries...'), 'countriesStates').fail(function() {
                            // failure message handled in loadModels
                            deferred.reject();
                        }).done(function() {
                            notify(_L('Initializing Application...'), {
                                timeout : notifyDelayStartup
                            });
                            startApplication();
                            deferred.resolve();
                        });
                    });
                });
            });
        });
    });
    return deferred.promise();
}

/**
 * showKioskMessage - will display the kiosk message on the splash screen
 *
 * @param {Boolean} enable if true then show the message
 * @api private
 */
function showKioskMessage(enable) {
    if (EAUtils.isSymbolBasedLanguage() || EAUtils.isLatinBasedLanguage()) {
        $.kiosk_message.setFont(Alloy.Styles.calloutFont);
    }
    // ensure the message is translated to the correct language when we show the screen
    $.kiosk_message.setText(_L('Touch Screen to Begin'));
    if (enable) {
        $.kiosk_message.show();
    } else {
        $.kiosk_message.hide();
    }
}

/**
 * failStartup - presents a dialog to the user when there is a problem starting the application
 *
 * @param {String} message is the reason for the startup failure
 * @param {Object} fault is the error that came back from the request
 * @param {boolean} loginOnly if true will only restart login and not the app
 * @api private
 */
function failStartup(message, fault, loginOnly) {
    loading = false;
    removeNotify();
    var messageString = _L('Reason: ') + message;
    // if the fault returns stores in the response then we need a popover that can present the stores to the user to pick from
    if (fault && fault.stores) {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'components/startupPopover',
            initOptions : {
                message : messageString,
                fault : fault
            },
            continueEvent : 'startupPopover:dismiss',
            continueFunction : function() {
                Alloy.eventDispatcher.trigger('app:startup');
            },
            cancelEvent : 'startupPopover:appConfiguration',
            cancelFunction : function() {
                showAppConfigurationDialog();
            }
        });
    } else {
        if (_.isString(fault)) {
            messageString += '\n\n' + _L('Message: ') + fault;
        }
        Alloy.Dialog.showConfirmationDialog({
            messageString : messageString,
            titleString : _L('Unable to start the application'),
            okButtonString : _L('Retry'),
            cancelButtonString : _L('Configuration'),
            cancelFunction : function() {
                showAppConfigurationDialog(loginOnly);
            },
            okFunction : function() {
                removeNotify();
                if (loginOnly) {
                    Alloy.eventDispatcher.trigger('app:login');
                } else {
                    Alloy.eventDispatcher.trigger('app:startup');
                }
            }
        });
    }
}

/**
 * showAppConfigurationDialog - present the application configuration dialog on start up fail
 *
 * @param {Boolean} isLogin - is it a login
 * @api private
 */
function showAppConfigurationDialog(isLogin) {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'support/components/appConfigurationDialog',
        continueEvent : 'appConfigurationDialog:dismiss',
        continueFunction : function() {
            if (isLogin) {
                Alloy.eventDispatcher.trigger('app:login');
            } else {
                Alloy.eventDispatcher.trigger('app:startup');
            }
        }
    });
}

/**
 * welcomeMessage - present the welcome dialog to the user to pick the startup settings
 *
 * @return {Deferred} promise
 * @api private
 */
function welcomeMessage() {
    var deferred = new _.Deferred();
    /* Checking if the country and the store id has been set on the startup
     (This is in case you select the country and not the store id and quit the app, it should show the startup
     wizard once the app is started again)*/
    if (appSettings.dbExists() && Alloy.CFG.countrySelected && countryConfig[Alloy.CFG.countrySelected] && Alloy.CFG.store_id && Alloy.CFG.appCurrency) {
        deferred.resolve();
        return deferred.promise();
    }
    loading = false;
    removeNotify();
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'components/welcomePopover',
        continueEvent : 'welcomePopover:dismiss',
        continueFunction : function() {
            deferred.resolve();
        }
    });
    return deferred.promise();
}

/**
 * presentLogin - display the appropriate login screen for the app
 *
 * @param {Object} event
 * @api private
 */
function presentLogin(event) {
    // need to get the theme for login and kiosk username/password and want this to happen before app:login is triggered
    loadConfigurations().done(function() {
        var continueLogin = function() {
            if (loadStartupModules()) {
                Alloy.eventDispatcher.trigger('configurations:prelogin');
                removeNotify();
                if (isKioskMode()) {
                    validateKioskCredentials();
                } else {
                    if (!Alloy.CFG.country_configuration || !Alloy.CFG.country_configuration[Alloy.CFG.countrySelected] || !Alloy.CFG.country_configuration[Alloy.CFG.countrySelected].list_price_book) {
                        failStartup(String.format(_L('Price book mapping missing from Endless Aisle Preferences for the value \'%s\'.'), Alloy.CFG.countrySelected));
                    } else {
                        presentAssociateLogin(event);
                    }
                }
            }
        };
        if (Alloy.CFG.navigation.use_mega_menu) {
            // bootstrapModels depends on having Alloy.CFG.image_service set from BM, so need to load this after loadConfigurations is called
            loadModels(null, 'bootstrapModels', true).done(function() {
                continueLogin();
            });
        } else {
            continueLogin();
        }
    }).fail(function() {
        failStartup(_L('Unable to load application settings.'));
    });
}

/**
 * presentAssociateLogin - will display the login panel at startup
 *
 * @param {Object} info
 * @api private
 */
function presentAssociateLogin(info) {
    var associate_login = Alloy.Dialog.showCustomDialog({
        controllerPath : 'associate/login',
        initOptions : info,
        ignoreHideAuxillary : true,
        fadeOut : true,
        continueEvent : 'login:dismiss',
        continueFunction : function(event) {
            $.backdrop.setOpacity(0);
            if (event) {
                var location = info ? info.location : null;
                var promise = postLogin(event.employee_id, location);
                showActivityIndicator(promise);
            }
        }
    });
    $.backdrop.animate({
        opacity : 0.5,
        duration : 500
    }, function() {
        animation.popIn(associate_login.getView());
    });
}

/**
 * postAuthorization - This function contains logic which is to be executed after kiosk manager authorization, but before
 * the authorization check logs out.
 *
 * @param dialog - the authorization dialog will be passed to this callback function
 *
 * @return {Deferred} promise
 * @api private
 */
function postAuthorization(dialog) {
    var cfgSettings = Alloy.createModel('cfgSettings');
    var promise = cfgSettings.loadKioskServerConfigs(Alloy.CFG.store_id);
    promise.done(function() {
        var serverSettings = cfgSettings.getSettings();
        if (serverSettings) {
            appSettings.setSetting('kiosk_mode.username', serverSettings.kiosk_mode.username);
            appSettings.setSetting('kiosk_mode.password', serverSettings.kiosk_mode.password);
        }
        Alloy.CFG.kiosk_mode.associate_credentials_entered = true;
        // manager credentials were just entered for kiosk enablement.
        storePasswordHelpers.checkStorePasswordWarning(true).always(function() {
            // even though we have a failure we still want the app to continue
            showKioskMessage(true);
        });
    });
    promise.fail(function(model) {
        dialog.showErrorMessage(_L('Unable to retrieve kiosk settings'));
    });

    return promise;
}

/**
 * validateKioskCredentials - Validates the credentials for kiosk mode before presenting the kiosk welcome screen
 *
 * @api private
 */
function validateKioskCredentials() {
    if (Alloy.CFG.kiosk_mode.associate_credentials_entered) {
        showKioskMessage(true);
    } else {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'associate/authorization',
            initOptions : {
                subTitleText : _L('Associate Login To Enable Kiosk'),
                successMessage : _L('Manager Credentials Accepted'),
                showCancelButton : false,
                postAuthorizationFunction : postAuthorization
            },
            continueEvent : 'authorization:dismiss',
            continueFunction : function(result) {
                if (result && !result.result) {
                    failStartup(_L('Unable to login kiosk user.'), null, true);
                }
            }
        });
    }
}

/**
 * kioskLogin - happens when click on backdrop to continue with kiosk login
 *
 * @api private
 */
function kioskLogin() {
    if (!$.kiosk_message.getVisible()) {
        return;
    }
    logger.info('kioskLogin');
    // change back to default in case we restart, plus this indicates you tapped
    showKioskMessage(false);

    var deferred = new _.Deferred();
    showActivityIndicator(deferred);
    var loginInfo = {
        employee_id : Alloy.CFG.kiosk_mode.username,
        passcode : Alloy.CFG.kiosk_mode.password
    };
    Alloy.Models.associate.loginAssociate(loginInfo).done(function() {
        postLogin(Alloy.CFG.kiosk_mode.username).always(function() {
            deferred.resolve();
        });
    }).fail(function() {
        deferred.resolve();
        // only need to restart login here
        failStartup(_L('Unable to login kiosk user.'), null, true);
    });
}

/**
 * postLogin - Once kiosk or associate login is complete then fire login analytics and navigate to application
 *
 * @param employee_code - employee id
 * @param location - route location
 * @return {Deferred} promise
 * @api private
 */
function postLogin(employee_code, location) {
    var deferred = new _.Deferred();
    // an oAuth token is needed for anything related to baskets or customers, so fetch one now
    Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function(model) {
        Alloy.Models.basket.getBasket({
            c_eaEmployeeId : employee_code
        }).done(function() {
            // load one last time b/c the login dialog or kiosk click could be sitting open for a while
            loadConfigurations().done(function() {
                analytics.fireAnalyticsEvent({
                    category : _L('Users'),
                    action : _L('Associate Login'),
                    label : employee_code
                });
                analytics.fireUserEvent({
                    category : _L('Users'),
                    action : _L('Associate Login'),
                    userId : employee_code
                });
                analytics.fireAnalyticsEvent({
                    category : _L('Store'),
                    action : _L('Login'),
                    label : Alloy.Models.storeInfo.getId()
                });

                switchToAppIndex().always(function() {
                    setTimeout(function() {
                        // For auth redirection usage
                        if (location && location.route != 'associate_login') {
                            logger.info('Redirecting to ' + JSON.stringify(location));
                            Alloy.Router.navigate(location);
                        } else {
                            Alloy.Router.navigateToHome();
                        }
                        Alloy.eventDispatcher.trigger('app:ready');
                        deferred.resolve();
                    }, 0);
                });

                // do this after appIndex has been created, which is done in switchToAppIndex
                Alloy.eventDispatcher.trigger('configurations:postlogin');

            }).fail(function() {
                deferred.resolve();
                failStartup(_L('Unable to load application settings.'), null, true);
            });
        }).fail(function() {
            deferred.resolve();
            failStartup(_L('Unable to start the application'), null, true);
        }).always(function() {
            deferred.resolve();
        });
    }).fail(function(fault) {
        deferred.resolve();
        if (fault && (fault.isBadLogin() || fault.isEmptyClientCredentials())) {
            handleAuthorizationTokenError(fault);
        } else {
            failStartup(_L('Unable to start the application'), null, true);
        }
    });
    return deferred.promise();
}

/**
 * loadModels - will load models required for startup
 *
 * @param {String} label the label for the notify message while loading
 * @param {String} modelName the model file name
 * @param {Boolean} login if true will only restart login and not the app
 * @return {Deferred} promise
 * @api private
 *
 */
function loadModels(label, modelName, login) {
    var deferred = new _.Deferred();
    login = login || false;
    if (label) {
        notify(label, {
            timeout : notifyDelayStartup
        });
    }
    setTimeout(function() {
        logger.trace('Loading ' + modelName);
        require(modelName).done(function() {
            logger.trace('Done loading ' + modelName);
            deferred.resolve();
        }).fail(function(model) {
            var fault = null;
            if (model && model.has('fault')) {
                var faultAttrs = model.get('fault');
                fault = faultAttrs.message ? faultAttrs.message : null;
            }
            failStartup(String.format(_L('Unable to load \'%s\'.'), modelName), fault, login);
            deferred.reject();
        });
    }, notifyReadDelay);
    return deferred.promise();
}

/**
 * startApplication - is called after all validations are done and application can be launched
 *
 * @api private
 */
function startApplication() {
    setTimeout(function() {
        loading = false;
        Alloy.TopController = $;
        Alloy.TopWindow = $.index;
        Alloy.eventDispatcher.trigger('app:login');
        // fired to doAppLogin
    }, notifyReadDelay);
}

/**
 * doAppLogin - is called when app:login is fired and app needs to present login to user
 *
 * @api private
 */
function doAppLogin(event) {
    logger.info('doAppLogin - app:login fired');
    Alloy.Globals.resetCookies();
    allowAppSleep(true);
    if ($.appIndex) {
        // moving from appIndex back to index
        switchToIndex().always(function() {
            presentLogin(event);
        });
    } else {
        // during first time startup
        presentLogin(event);
    }
}

/**
 * onTouchApp - event listener for touchstart on the appIndex.
 * This does not capture events for when a field is clicked on.
 *
 * @api private
 */
function onTouchApp() {
    logger.info('*** touchstart on topwindow');
    Alloy.eventDispatcher.trigger('session:renew');
}

/**
 * switchToIndex - will move back to index from appIndex
 *
 * @return {Deferred} promise
 * @api private
 */
function switchToIndex() {
    logger.info('switchToIndex called');
    var deferred = new _.Deferred();
    // tell DialogMgr to use $.index instead of $.appIndex
    Alloy.Dialog.setWindow($.index);
    $.index.open();
    $.appIndex.removeEventListener('touchstart', onTouchApp);
    // switch from appIndex back to index
    animation.crossFade($.appIndex, $.index, 500, function() {
        logger.info('closing and deinit appIndex');
        $.appIndex.close();
        appIndexController.deinit();
        $.appIndex = null;
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * switchToAppIndex - will move from index to appIndex
 *
 * @return {Deferred} promise
 * @api private
 */
function switchToAppIndex() {
    logger.info('switchToAppIndex called');
    var deferred = new _.Deferred();
    allowAppSleep(false);

    logger.info('creating new appIndexController');
    appIndexController = Alloy.createController('appIndex');
    Alloy.AppWindow = $.appIndex = appIndexController.getView();
    // tell DialogMgr to use $.appIndex instead of $.index
    Alloy.Dialog.setWindow($.appIndex);
    appIndexController.init();
    Alloy.Router = appIndexController.router;
    Alloy.ViewManager = appIndexController.viewManager;
    $.appIndex.open();
    $.appIndex.addEventListener('touchstart', onTouchApp);
    animation.crossFade($.index, $.appIndex, 100, function() {
        $.index.close();
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * networkDidChange - Simple network listener to let users know
 *
 * @api private
 */
function networkDidChange() {
    if (Ti.Network.online) {
        removeNotify(_L('Network is unavailable'));
        notify(_L('Network is now available'));
    } else {
        notify(_L('Network is unavailable'), {
            preventAutoClose : true
        });
    }
}

/**
 * executeModelTests - executes model tests
 *
 * @param testNames - name of tests to run
 * @param junit_file_location - test location
 * @param logFunc - function for logging
 * @api private
 */
function executeModelTests(testNames, junit_file_location, logFunc) {
    setTimeout(function() {
        var behave = require('behave');
        var testsToLoad = testNames || Alloy.CFG.active_tests;

        if (testsToLoad && testsToLoad.length > 0) {
            _.each(testsToLoad, function(testName) {
                try {
                    var spec = require('spec/' + testName);
                    spec.define();
                } catch(exception) {
                    if ( exception instanceof Error && exception.code === 'MODULE_NOT_FOUND')
                        notify(testName + ' is not a test that can be executed.');
                    else
                        throw exception;
                }
            });
        }

        behave.run(junit_file_location, logFunc);
    }, 1000);
}

/**
 * onConfigsPreLogin - Aloy.CFG has been loaded from all sources and pre login
 * Loading models post configuration as some of these depend on Alloy.CFG.image_service coming from BM
 *
 * @api private
 */
function onConfigsPreLogin() {
    logger.info('onConfigsPreLogin called');
    // Declare global storage for bootstrap objects
    Alloy.Models.product = Alloy.Models.product || Alloy.createModel('product');
    Alloy.Models.productSearch = Alloy.Models.productSearch || Alloy.createModel('productSearch');
    Alloy.Models.category = Alloy.Models.category || Alloy.createModel('category');
    Alloy.Models.customer = Alloy.Models.customer || Alloy.createModel('customer');
    Alloy.Models.associate = Alloy.Models.associate || Alloy.createModel('associate');
    Alloy.Models.basket = Alloy.Models.basket || Alloy.createModel('baskets');
    Alloy.Models.customerAddress = Alloy.Models.customerAddress || Alloy.createModel('customerAddress');
    Alloy.Models.customerOrder = Alloy.Models.customerOrder || Alloy.createModel('baskets');
    Alloy.Collections.customerOrderHistory = Alloy.Collections.customerOrderHistory || Alloy.createCollection('customerOrderHistory');
    Alloy.Models.storeInfo = Alloy.Models.storeInfo || Alloy.createModel('store');
    Alloy.Models.authorizationToken = Alloy.Models.authorizationToken || Alloy.createModel('authorizationToken');

    // Global Collections
    Alloy.Collections.allStores = Alloy.Collections.allStores || Alloy.createCollection('store');

    // Basis for audit trail
    Alloy.Collections.history = Alloy.Collections.history || Alloy.createCollection('history');
    Alloy.Collections.customer = Alloy.Collections.customer || Alloy.createCollection('customer');
}

/**
 * loadStartupModules - load the modules required at startup
 *
 * @return {Boolean} boolean - verify success or failure
 * @api private
 */
function loadStartupModules() {
    if (Alloy.CFG.devices.payment_terminal_module && !Alloy.paymentTerminal) {
        // enables listeners for payment terminal
        Alloy.paymentTerminal = loadModule(Alloy.CFG.devices.payment_terminal_module);
        if (Alloy.paymentTerminal) {
            if (!_.isFunction(Alloy.paymentTerminal.supports)) {
                // paymentTerminals will always return something when loading lib module, need to check further
                failStartup(String.format(_L('Unable to load \'%s\'.'), Alloy.CFG.devices.payment_terminal_module));
                // set to null in case of retry
                Alloy.paymentTerminal = null;
                return false;
            }
        } else {
            return false;
        }
    }
    if (Alloy.CFG.enable_barcode_scanner && !Alloy.barcodeScanner) {
        // enables listeners for barcode scanner
        Alloy.barcodeScanner = loadModule('barcodeScanner');
        if (!Alloy.barcodeScanner) {
            return false;
        }
    }
    if (Alloy.CFG.printer_availability && !Alloy.receiptPrinter) {
        // enables listeners for receipt printer
        Alloy.receiptPrinter = loadModule(Alloy.CFG.devices.printer_module);
        if (!Alloy.receiptPrinter) {
            return false;
        }
    }
    if (Alloy.CFG.payment_entry === 'web') {
        var safariDialog = loadModule('ti.safaridialog');
        if (safariDialog) {
            var isSupported = safariDialog.isSupported();
            logger.info('ti.safaridialog.isSupported() ' + isSupported);

            if (!isSupported) {
                failStartup(_L('This version of iOS is not supported.  Please upgrade to a supported version.'));
                return false;
            }
        } else {
            // loadModule handles the error, but we don't want an exception trying to use safariDialog
            return false;
        }
    }
    return true;
}

/**
 * loadModule - loads the module and checks for problems
 *
 * @param {String} moduleName - name of the module to load
 * @return {Object} module - what was loaded
 * @api private
 */
function loadModule(moduleName) {
    var module = null;
    try {
        logger.info('loading module: "' + moduleName + '"');
        module = require(moduleName);
        if (!module) {
            failStartup(String.format(_L('Unable to load \'%s\'.'), moduleName));
        }
    } catch(ex) {
        logger.error('cannot load module: "' + moduleName + '", exception: ' + ex);
        failStartup(ex);
    }
    return module;
}

/**
 * onConfigsPostLogin - Aloy.CFG has been loaded from all sources and post login, which could have been sitting idle
 *
 * @api private
 */
function onConfigsPostLogin() {
    logger.info('onConfigsPostLogin called');
    // only if store information is required should it be fetched. If there are other reasons to fetch the store info,
    // add them here
    Alloy.Models.storeInfo.getStore(Alloy.CFG.store_id).done(function() {
        var collectingBillingAddress = Alloy.CFG.collect_billing_address || Alloy.CFG.devices.payment_terminal_module === 'webDevice';
        if (!collectingBillingAddress || Alloy.CFG.printer_availability || Alloy.CFG.store_availability.enabled) {
            // after the agent has logged in, get the store info
            loadAllStores();
        }
        if (Alloy.Models.storeInfo.getLatitude() == null && Alloy.Models.storeInfo.getLongitude() == null) {
            // if store latitude and longitude are not provided by bussiness mananger, use GPS for current location
            getCurrentLocation();
        }
    });

}

/**
 * loadAllStores - loads all stores from server
 *
 * @api private
 */
function loadAllStores() {
    if (Alloy.CFG.store_availability.enabled) {
        Alloy.Collections.allStores.reset([]);
        Alloy.Collections.allStores.getAllStores().done(function() {
            logger.info('retrieved allStores');
            logger.secureLog(JSON.stringify(Alloy.Collections.allStores.models, null, 2));
        }).fail(function() {
            logger.error('failure retrieving allStores');
        });
    }
}

/**
 * onAssociateLogout - associate has logged out and we need to unload things that may need to be reloaded based on configuration chagnes
 *
 * @param private
 */
function onAssociateLogout() {
    Alloy.eventDispatcher.trigger('configurations:unload');
    if (Alloy.CFG.store_availability.enabled) {
        Alloy.Collections.allStores.reset([]);
    }
}

/**
 * onTestsRun - a model test is being requested to run
 *
 * @param {Object} event
 * @api private
 */
function onTestsRun(event) {
    var behaveLogger = require('behaveLoggerExt');
    executeModelTests(event.tests, event.junit_file_location, behaveLogger.getLoggerFunction());
}

/**
 * handleAuthorizationTokenError - handle an error when fetching the oauth token
 *
 * @param {Object} fault
 * @api private
 */
function handleAuthorizationTokenError(fault) {
    var title = _L('Unable to start the application');
    var message = _L('Unable to start the application');
    if (fault) {
        if (fault.isBadLogin()) {
            title = _L('Store password incorrect');
            message = _L('The password for the store is incorrect. Please contact your admininstrator to fix this problem.');
        } else if (fault.isEmptyClientCredentials()) {
            title = _L('Client Credentials Not Set Up');
            message = _L('The client credentials are not set up correctly. Please contact your admininstrator to fix this problem.');
        }
    }

    Alloy.Dialog.showConfirmationDialog({
        messageString : message,
        titleString : title,
        okButtonString : _L('Restart App'),
        hideCancel : true,
        okFunction : function() {
            removeNotify();
            restartAppAfterTokenFailure();
        }
    });
}

/**
 * restartAppAfterTokenFailure - restart the app after an oauth failure
 *
 * @api private
 */
function restartAppAfterTokenFailure() {
    var deferred = new _.Deferred();
    showActivityIndicator(deferred);

    // if this is an order, try to cancel the order
    if (Alloy.Models.basket.getOrderNumber()) {
        logger.info('has order number');
        Alloy.Models.basket.simpleAbandonOrder().always(function() {
            doLogout(deferred);
        });
    } else {
        doLogout(deferred);
    }
}

/**
 * doLogout - logout the app
 *
 * @param {Deferred} deferred - to resolve when logout is complete
 * @api private
 */
function doLogout(deferred) {
    Alloy.Collections.history.reset([]);
    // clean up the server basket
    Alloy.Models.basket.clear();
    delete Alloy.Models.basket.shippingMethods;
    Alloy.Models.basket.trigger('basket_sync');
    Alloy.Models.associate.logout().always(function() {
        logger.info('associateLogout done()');
        Alloy.eventDispatcher.trigger('associate_logout');
        // Should hide everything again and set login to trigger home action
        if (Alloy.Router) {
            Alloy.Router.navigateToHome();
        }
        Alloy.eventDispatcher.trigger('app:login', {});
        deferred.resolve();
    });
}

/**
 * getCurrentLocation - called to fetch the current location of the device.
 *
 * @api private
 */
function getCurrentLocation() {
    if (!Alloy.CFG.enable_address_autocomplete) {
        return;
    }
    geolocation.getCurrentLocation(function(coordinates) {
        Alloy.CFG.latitudeOnStartup = coordinates.latitude;
        Alloy.CFG.longitudeOnStartup = coordinates.longitude;
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

$.index.open();
Alloy.Dialog.setWindow($.index);
init().done(function() {
    if (Ti.App.deployType !== 'production' && Alloy.CFG.perform_tests) {
        executeModelTests(undefined, Alloy.CFG.junit_file_location);
    }
});
