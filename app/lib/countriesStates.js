// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/countriesStates.js - Functions for handling countries and states
 */

//---------------------------------------------------
// ## VARIABLES

var deferred = new _.Deferred();

Alloy.Models.storeCountriesStates = Alloy.createModel('storeCountriesStates');

//---------------------------------------------------
// ## APP LISTENERS

// country change event listener -
// to refetch the countries and states because the shipping,billing and customer address can be different for a country
Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'countryChange:selected', function() {
    Alloy.Models.storeCountriesStates.clear({
        silent : true
    });
    getCountriesStates();
});

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getCountriesStates - Fetches the countries and states for a particular store
 *
 * @api private
 */
function getCountriesStates() {
    Alloy.Models.storeCountriesStates.getStoreCountriesStates().done(function() {
        logger.info('Came in here');
        var customerCountriesList = this.get('customerAddress').countries;
        setGlobalStatesAndCountries(customerCountriesList, 'customer');

        var billingCountriesList = this.get('billingAddress').countries;
        setGlobalStatesAndCountries(billingCountriesList, 'billing');

        var shippingCountriesList = this.get('shippingAddress').countries;
        setGlobalStatesAndCountries(shippingCountriesList, 'shipping');
        deferred.resolve();
    }).fail(function(model) {
        deferred.reject(model);
    });
}

/**
 * setGlobalStatesAndCountries
 *
 * @param {Object} countriesList - country output
 * @param {Object} customName - either shipping, billing or customer
 *
 * @api private
 */
function setGlobalStatesAndCountries(countriesList, customName) {
    if (countriesList) {
        var globalCountries = _.map(countriesList, function(country) {
            return {
                countryCode : _.keys(country)[0],
                countryName : _.values(country)[0]
            };
        });
    }
    var globalStates = [];
    _.each(countriesList, function(country) {
        var countryCode = _.keys(country)[0];
        var statesList = country.states;
        var formattedList = [];
        if (statesList && statesList.length > 0) {
            formattedList = _.map(statesList, function(state) {
                return {
                    stateCode : _.keys(state)[0],
                    stateName : _.values(state)[0]
                };
            });
        } else {
            formattedList = [{
                stateCode : '',
                stateName : _L('Other')
            }];
        }
        globalStates[countryCode] = formattedList;
    });
    if (customName == 'customer') {
        Alloy.Globals.customerGlobalCountries = globalCountries;
        Alloy.Globals.customerGlobalStates = globalStates;
    } else if (customName == 'billing') {
        Alloy.Globals.billingGlobalCountries = globalCountries;
        Alloy.Globals.billingGlobalStates = globalStates;
    } else if (customName == 'shipping') {
        Alloy.Globals.shippingGlobalCountries = globalCountries;
        Alloy.Globals.shippingGlobalStates = globalStates;
    }
}

//---------------------------------------------------
// ## CONSTRUCTOR

// The intent behind this is to load all the countries and states for a particular store, once, when the application starts
// and refetch these values when the country is changed.
getCountriesStates();

module.exports = deferred.promise();
