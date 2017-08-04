// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/storefront.js  - configuration for storefront API
 */

module.exports = {
    storefront :  {
        // Flag which specifies whether or not to enable the proxy cache.
        enable_proxy_cache :  true,
        // Flag which specifies whether or not to enable the http cache.
        enable_http_cache :  true,
        // Specifies whether or not to validate the secure certificate.
        validate_secure_cert :  false,
        // The storefront site url.
        site_url :  '/on/demandware.store/Sites-SiteGenesis-Site',
        // The locale to use for the site url.
        locale_url :  '/default'
    }
};
