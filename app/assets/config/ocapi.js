// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/ocapi.js  - configuration for OCAPI settings
 */

module.exports = {
    ocapi :  {
        // Flag which specifies whether or not to enable the proxy cache.
        enable_proxy_cache :  true,
        // Flag which specifies whether or not to enable the http cache.
        enable_http_cache :  true,
        // Specifies whether or not to validate the secure certificate.
        validate_secure_cert :  false,
        data_site_url : '/s/-',
        data_base_url : '/dw/data/',
        // The base site url for shop ocapi requests. Appended after the hostname in the url.
        site_url :  '/s/SiteGenesis',
        // The base url for ocapi requests. Appended after the site_url.
        base_url :  '/dw/shop/',
        // The customer's given ocapi client_id.
        client_id :  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        // The default locale for ocapi requests.
        default_locale :  'default',
        //default ocapi version
        version :  'v17_6',
        // Version for cache db, increase to clean out ocapi cache db
        cache_version : 2
    }
};
