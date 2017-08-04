// ©2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/address/storePickupConfig.js - configuration for store pickup address form
 * in this file we  map the right UI layout file to the current locale setting
 * (country) of the device. More configurations like validation and more could
 * be added here for each country and taken care of in the differentStorePickupAddress module
 */

module.exports = {
    local_address : {
        US : 'config/address/storePickup_NA',
        IT : 'config/address/storePickup_EU',
        CA : 'config/address/storePickup_NA',
        FR : 'config/address/storePickup_EU',
        NL : 'config/address/storePickup_EU',
        GB : 'config/address/storePickup_EU',
        ES : 'config/address/storePickup_EU',
        DE : 'config/address/storePickup_EU',
        JP : 'config/address/storePickup_Asia',
        CN : 'config/address/storePickup_Asia',
        default : 'config/address/storePickup_NA'
    }
};