// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/address/addressConfig.js - configuration for address form
 * in this file we  map  the right UI layout file to the current locale setting
 * (country)  of the device.  More configurations like validation and more could
 * be added here for each country and taken care of in the enterAddressDynamic module
 */

module.exports = {
    local_address : {
        US : 'config/address/addressForm_NA',
        IT : 'config/address/addressForm_EU',
        CA : 'config/address/addressForm_NA',
        FR : 'config/address/addressForm_EU',
        NL : 'config/address/addressForm_EU',
        GB : 'config/address/addressForm_EU',
        ES : 'config/address/addressForm_EU',
        DE : 'config/address/addressForm_EU',
        JP : 'config/address/addressForm_Asia',
        CN : 'config/address/addressForm_Asia',
        default : 'config/address/addressForm_NA'
    }
};

