// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/support/components/buildInfoDataColumn.js - App's build configuration view
 */

//---------------------------------------------------
// ## VARIABLES

var args = $.args;

//----------------------------------------------
// ## PUBLIC API

exports.getAppConfiguration = getAppConfiguration;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getAppConfiguration - get app configuration
 *
 * @return {String}
 * @api public
 */
function getAppConfiguration() {
    return  $.app_uuid_title.getText() + '\n' + swissArmyUtils.getUUID() + '\n\n'
            + $.version_title.getText() + '\n' + getBuildVersion() + '\n\n'
            + $.config_title.getText() + '\n' + getConfigSettings();
}

/**
 * getBuildVersion - get the build version data
 *
 * @return {String}
 * @api private
 */
function getBuildVersion() {
    var versionText = _L('Client Version: ') + Ti.App.getVersion() + '\n';
    versionText += _L('Server Version: ') + (Alloy.CFG.server_version ? Alloy.CFG.server_version : _L('No Value')) + '\n';
    versionText += (!Alloy.CFG.supported_client_versions || Alloy.CFG.supported_client_versions.length == 1) ? _L('Server Supported Version: ') : _L('Server Supported Versions: ');
    versionText += (Alloy.CFG.supported_client_versions ? Alloy.CFG.supported_client_versions.join(', ') : _L('No Value'));

    return versionText;
}

/**
 * getConfigSettings - return the configuration settings data
 *
 * @return {String}
 * @api private
 */
function getConfigSettings() {
    var configText = _L('Host: ') + Alloy.CFG.storefront_host + '\n\n';
    configText += _L('Storefront Settings:') + '\n\n';
    configText += '    ' + _L('Site URL: ') + Alloy.CFG.storefront.site_url + '\n';
    configText += '    ' + _L('Locale URL: ') + Alloy.CFG.storefront.locale_url + '\n';
    configText += '    ' + _L('Timeout: ') + Alloy.CFG.storefront.timeout + '\n';

    configText += '\n' + _L('OCAPI Settings:') + '\n\n';
    configText += '    ' + _L('Site URL: ') + Alloy.CFG.ocapi.site_url + '\n';
    configText += '    ' + _L('Base URL: ') + Alloy.CFG.ocapi.base_url + '\n';
    configText += '    ' + _L('Base Version: ') + Alloy.CFG.ocapi.version + '\n';
    configText += '    ' + _L('Locale: ') + Alloy.CFG.ocapi.default_locale + '\n';
    configText += '    ' + _L('Timeout: ') + Alloy.CFG.ocapi.timeout + '\n';
    configText += '    ' + _L('Client ID: ') + Alloy.CFG.ocapi.client_id + '\n';
    
    configText += '\n' + _L('Country Settings:') + '\n\n';
    configText += '    ' + _L('Country: ') + require('config/countries').countryConfig[Alloy.CFG.countrySelected].displayName + '\n';
    configText += '    ' + _L('Currency: ') + Alloy.CFG.appCurrency + '\n';
    configText += '    ' + _L('List Price Book: ') + Alloy.CFG.country_configuration[Alloy.CFG.countrySelected].list_price_book + '\n';
    configText += '    ' + _L('Sale Price Book: ') + Alloy.CFG.country_configuration[Alloy.CFG.countrySelected].sale_price_book + '\n';

    return configText;
}

//----------------------------------------------------
// ## CONSTRUCTOR

$.build_version.setText(getBuildVersion());
$.config_text.setText(getConfigSettings());
$.app_uuid_text.setText(swissArmyUtils.getUUID());
