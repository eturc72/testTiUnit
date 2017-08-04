// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/countries.js  - configuration for country/site and language
 * Refer to user.js.sample file if you want to add another country.
 */

module.exports = {
    countryConfig : {
        US : {
            ocapi : {
                site_url : '/s/SiteGenesis'
            },
            storefront : {
                site_url : '/on/demandware.store/Sites-SiteGenesis-Site'
            },
            languagesSupported : ['en', 'fr', 'zh-CN', 'ja', 'de'], //This definition of these languages is in languageConfig
            displayName : 'United States', //This string needs to be in strings.xml file.
            value : 'US', // This value has to be unique, should have a corresponding entry in addressConfig.js and should match the key
            appCurrency : 'USD' //This value is for which currency you want to shop in. The definiton of this currency is in currencyConfig
        }
    },
    languageConfig : [{
        displayName : 'English',
        ocapi_locale : 'en-US',
        storefront_locale : '/en_US',
        value : 'en'
    }, {
        displayName : 'French',
        ocapi_locale : 'fr-FR',
        storefront_locale : '/fr_FR',
        value : 'fr'
    }, {
        displayName : 'Chinese',
        ocapi_locale : 'zh-CN',
        storefront_locale : '/zh_CN',
        value : 'zh-CN'
    }, {
        displayName : 'Japanese',
        ocapi_locale : 'ja-JP',
        storefront_locale : '/ja_JP',
        value : 'ja'
    }, {
        displayName : 'German',
        ocapi_locale : 'de-DE',
        storefront_locale : '/de_DE',
        value : 'de'
    }],
    currencyConfig : {
        USD : {
            currencyFormat : '$0,0.00', //currency symbol placement format
            currencyLocale : 'en',
            delimiters : {
                thousands : ',', //define the thousand delimiter
                decimal : '.' //define the decimal delimiter
            },
            currencySymbol : '$', //define the currency symbol for that country
        },
        EUR : {
            currencyFormat : '0,0.00$', //currency symbol placement format
            currencyLocale : 'en',
            delimiters : {
                thousands : '.', //define the thousand delimiter
                decimal : ',' //define the decimal delimiter
            },
            currencySymbol : '€', //define the currency symbol for that country
        },
        JPY : {
            currencyFormat : '$0,0', //currency symbol placement format
            currencyLocale : 'en',
            delimiters : {
                thousands : ',', //define the thousand delimiter
                decimal : '.' //define the decimal delimiter
            },
            currencySymbol : '¥', //define the currency symbol for that country
        }
    }
};
