// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/instore/Address.js - Functions for Address model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;
var getAddressStringFromAddressDataOrderAndType = require('EAUtils').getAddressStringFromAddressDataOrderAndType;

/**
 * Address - Model for address
 *
 * @api public
 */
var Address = AssociatedModel.extend(
/* instance methods */
{

    /**
     * initialize - for initialization of model
     */
    initialize : function() {
    },

    /**
     * getFirstName - returns first name
     * @return {String}
     */
    getFirstName : function() {
        return this.get('first_name');
    },

    /**
     * getLastName - returns last name
     * @return {String}
     */
    getLastName : function() {
        return this.get('last_name');
    },

    /**
     * getFullName - returns full name
     * @return {String}
     */
    getFullName : function() {
        return this.get('full_name');
    },

    /**
     * getPostalCode - returns postal code
     * @return {String}
     */
    getPostalCode : function() {
        return this.get('postal_code');
    },

    /**
     * getStateCode - returns state code
     * @return {String}
     */
    getStateCode : function() {
        return this.get('state_code');
    },

    /**
     * getCountryCode - returns country code
     * @return {String}
     */
    getCountryCode : function() {
        return this.get('country_code');
    },

    /**
     * getAddress1 - returns address1
     * @return {String}
     */
    getAddress1 : function() {
        return this.get('address1');
    },

    /**
     * getAddress2 - returns address
     * @return {String}
     */
    getAddress2 : function() {
        return this.get('address2');
    },

    /**
     * getCity - returns city
     * @return {String}
     */
    getCity : function() {
        return this.get('city');
    },

    /**
     * getPhone - returns phone
     * @return {String}
     */
    getPhone : function() {
        return this.get('phone');
    },

    /**
     * getAddressId - returns address id
     * @return {String}
     */
    getAddressId : function() {
        return this.get('address_id');
    },

    /**
     * getAddressDisplay - returns address display based on address form order
     * @param {String} addressType, either 'customer', 'shipping', or 'billing'
     * @return {String}
     */
    getAddressDisplay : function(addressType) {
        return getAddressStringFromAddressDataOrderAndType(this.toJSON(), require(Alloy.CFG.addressform).getAddressOrder(), addressType);
    },

    /**
     * isPreferredAddress - returns if a preferred address
     * @return {String}
     */
    isPreferredAddress : function() {
        return this.get('preferred');
    },

    /**
     * setAddressId - set address id
     * @param {String} name - the id
     * @param {Object} options
     */
    setAddressId : function(name, options) {
        this.set('address_id', name, options);
    },

    /**
     * setAddress2 - set address 2
     * @param {String} address2
     * @param {Object} options
     */
    setAddress2 : function(address2, options) {
        this.set('address2', address2, options);
    },

    /**
     * setCountryCode - set country code
     * @param {String} code
     * @param {Object} options
     */
    setCountryCode : function(code, options) {
        this.set('country_code', code, options);
    },

    /**
     * setPhone - set phone
     * @param {String} phone
     * @param {Object} options
     */
    setPhone : function(phone, options) {
        this.set('phone', phone, options);
    }
},
/* class methods */
{

});

module.exports = Address;
