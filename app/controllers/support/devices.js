// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/devices.js - admin dashboard screen for showing device information
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};

var deviceType = args.device;
var deviceModule;

var logger = require('logging')('support:devices', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api private
 */
function init(deviceType) {
    logger.info('INIT called');
    $.data_column.removeAllChildren();
    $.action_column.removeAllChildren();

    if (!deviceType) {
        logger.error('No device type defined.  Unable to render view for support dashboard.');
        return false;
    }

    // By convention, the service provider configuration is the name of the device with a '_module' suffix
    var deviceModulePath = Alloy.CFG.devices[deviceType + '_module'];

    if (!deviceModulePath) {
        logger.error('No device configuration found for device type: ' + deviceType + '_module');
        return false;
    }

    deviceModule = require(deviceModulePath);

    var infoView = 'getInfoView' in deviceModule && deviceModule.getInfoView();
    var configView = 'getConfigView' in deviceModule && deviceModule.getConfigView();

    if (infoView) {
        $.data_column.add(infoView);
    }
    if (configView) {
        $.action_column.add(configView);
    }

    // Should return false if neither view is implemented
    return !!(infoView || configView);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    'deinit' in deviceModule && deviceModule.deinit();
    removeAllChildren($.data_column);
    removeAllChildren($.action_column);
    // stops listening to all listenTo events
    $.stopListening();
    $.destroy();
}

//----------------------------------------------------
// ## CONSTRUCTOR

init(deviceType);

