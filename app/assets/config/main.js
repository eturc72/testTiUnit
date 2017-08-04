// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/main.js  - configuration for application configuration
 */

module.exports = {
    // The storefront host the dss application should connect to.
    storefront_host : 'override-in-user.js.demandware.net',
    // The storefront homepage url.
    storefront_home : '/on/demandware.store/Sites-SiteGenesis-Site',

    // The id of the root category
    root_category_id : 'root',

    // If you imported the EA_CustomObjects_Organization.xml instead of EA_CustomObjects_Site.xml and the scope of your Endless Aisle custom objects are Organization.
    organization_custom_object_types : true,

    // The default amount of time (in milliseconds) for the notification growl to appear on the screen
    notification_display_timeout : 1000,

    // Allow payments to be simulated
    allow_simulate_payment : false,

    // Flag which specifies whether or not the barcode scanner is enabled.
    enable_barcode_scanner : true,
    // List of all barcode types.
    allBarcodeScannerTypes : ['Aztec', 'Code128', 'Code39', 'Code39Mod43', 'Code93', 'UPCE', 'EAN13', 'EAN8', 'PDF417', 'QR', 'Interleaved2of5', 'ITF14', 'DataMatrix'],
    // List of accepted barcode types.
    acceptedBarcodeScannerTypes : ['UPCE', 'EAN13', 'EAN8'],

    // The categories to include in logging.

    /*
     Example:
     -   Let's say you only want to log things from these two files "controllers/checkout/cart/index.js" and "controllers/checkout/index.js"
     you must specify this array ["checkout:cart:index", "checkout:index"] as  loggableCategories.

     -   Or if you only want to log things from these files "controllers/checkout/components/header.js", "controllers/checkout/components/paymentSummary.js" and "lib/appSettings"
     you must specify this array ["checkout:components:header" , "checkout:components:paymentSummary", "application:appSettings"] as  loggableCategories.

     -   if you want to log  everything under this directory "controllers/checkout/cart"
     you must specify this array ["checkout:cart"] as  loggableCategories.

     -   if you want to log  everything under this directory "controllers/checkout"
     you must only specify  this array ["checkout"] as  loggableCategories.

     -   if you want to log  everything under these directories "controllers/checkout" ,  "controllers/support",  "controllers/associate" and "lib"
     you must specify this array ["checkout", "support", "associate", "application"] as  loggableCategories.

     Note:
         •   Every file under controllers/checkout/payments will be logged by default regardless.
         •   Setting loggableCategories to  ["all"] will log everything.
         •   Using "request", "request-response" and "request-success" will output most request related logs.
     */
    loggableCategories : [],

    theme : 'wireframe',
    is_live : false,
    use_appcelerator_analytics : false,
    // Use this for test automation to specify a config.json like file on a web server.
    // This file will be loaded into the Alloy.CFG confirguation at startup.
    // For example: 'test_configuration_url': 'http://localhost/~jenkins/dss-test.json',
    // Business Manager application settings and Admin Dashboard App Settings tab will override settings in this json file
    test_configuration_url : '',
    use_log_to_file : true,

    // By default we enable the crash reporter to catch errors and display a dialog to add additional comments.
    // In some cases during development, you may want to disable the crash reporter and allow the red error screen
    // to be used/displayed instead. Setting this property to false will allow you to disable the crash reporter
    // and allow the red error screen to be displayed instead.
    use_crash_reporter : true,

    app_url_scheme : 'dwea',

    defaultCustomerPage : 'addresses',

    // If using pay through web you need to set to 'web' as well as set the devices.payment_terminal_module to 'webDevice'
    payment_entry : 'default',

    regexes : {
        email : '^[A-Z0-9._%-]+@[A-Z0-9.-]+\\.[A-Z]{2,4}$',
        phone : {
            US : '^([0-9]( |-)?)?(\\(?[0-9]{3}\\)?|[0-9]{3})( |-|\\.)?([0-9]{3}( |-|\\.)?[0-9]{4}|[a-zA-Z0-9]{7})$',
            CA : '^([0-9]( |-)?)?(\\(?[0-9]{3}\\)?|[0-9]{3})( |-|\\.)?([0-9]{3}( |-|\\.)?[0-9]{4}|[a-zA-Z0-9]{7})$',
            DE : '^([+][0-9]{1,3}[ .-])?([(]{1}[0-9]{1,6}[)])?([0-9 .-/]{3,20})((x|ext|extension)[ ]?[0-9]{1,4})?$',
        },

        postal_code : {
            US : '^\\d{5}(-\\d{4})?$',
            CA : '^[ABCEGHJKLMNPRSTVXY]{1}\\d{1}[A-Z]{1} *\\d{1}[A-Z]{1}\\d{1}$'
        }
    },

    webViewCssReset : 'html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video { margin: 0; padding: 0; border: 0; font-size: 100%; vertical-align: baseline; }',

    receipt_promotional_message_string_resource : 'receipt_promotional_message',

    // run model tests at startup of application
    perform_tests : false
};

