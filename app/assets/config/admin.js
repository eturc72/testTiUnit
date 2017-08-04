// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/admin.js  - configuration for the App Settings in the Admin Dashboard
 */

module.exports = {

    appSettings : [{
        labelID : '_Store_ID_',
        configName : 'store_id',
        descriptionID : '_The_store_id_to_connect_to_at_startup_',
        messageWhenNoSelection : 'Select Store ID',
        restartRequired : true,
        startupRequest : true,
        type : 'dropdown',
        options : {
            storefrontURL : 'EAStore-GetStores',
            responseRoot : 'stores'
        },
    }, {
        labelID : '_Session_Timeout_',
        configName : 'session_timeout',
        descriptionID : '_The_amount_of_time_before_the_application_logs_out_the_associate_',
        type : 'dropdown',
        optionType : 'milliseconds',
        options : [{
            value : 30000
        }, {
            value : 60000
        }, {
            value : 120000
        }, {
            value : 300000
        }, {
            value : 600000
        }, {
            value : 900000
        }, {
            value : 1200000
        }, {
            value : 1500000
        }],
    }, {
        labelID : '_Kiosk_Mode_',
        configName : 'kiosk_mode.enabled',
        showWhen : 'kiosk_mode.has_credentials',
        descriptionID : '_Kiosk_Mode_Description_',
        restartRequired : true,
        type : 'boolean',
        startupRequest : true
    }, {
        labelID : '_STORE_INVENTORY',
        descriptionID : '_Settings_related_to_Store_Inventory_',
        showWhen : 'store_availability.enabled',
        items : [{
            configName : 'store_availability.max_distance_search',
            labelID : '_Search_Distance_',
            depends : 'store_availability.enabled',
            type : 'dropdown',
            options : [{
                labelID : '5',
                value : '5'
            }, {
                labelID : '10',
                value : '10'
            }, {
                labelID : '20',
                value : '20'
            }, {
                labelID : '30',
                value : '30'
            }, {
                labelID : '40',
                value : '40'
            }, {
                labelID : '50',
                value : '50'
            }, {
                labelID : '75',
                value : '75'
            }, {
                labelID : '100',
                value : '100'
            }]
        }, {
            labelID : '_Distance_Unit_',
            configName : 'store_availability.distance_unit',
            type : 'dropdown',
            depends : 'store_availability.enabled',
            options : [{
                labelID : '_Miles',
                value : 'mi'
            }, {
                labelID : '_Kilometers',
                value : 'km'
            }]
        }]
    }, {
        labelID : '_Image_Zoom_',
        configName : 'enable_zoom_image',
        descriptionID : '_For_low_bandwidth_connections_disable_this_feature_',
        type : 'boolean'
    }, {
        labelID : '_Simulate_Payments_',
        configName : 'allow_simulate_payment',
        descriptionID : '_Used_for_development_',
        type : 'boolean',
        developmentOnly : true
    }]
};
