// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Store.js - Functions for Store model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Store - Model for shopapi store
 *
 * @api public
 */
var Store = AssociatedModel.extend(
/* instance methods */
{
    /**
     * initialize - for initialization of model
     */
    initialize : function() {
    },

    idAttribute : 'id',
    urlRoot : '/stores'
},

/* class methods */
{

});

var mixinApiMethods = require('ocapi_methods');

/* init API schema from metadata dump */
mixinApiMethods(Store, require('dw/shop/metadata/store'));

module.exports = Store;
