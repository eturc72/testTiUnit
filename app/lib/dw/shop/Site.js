// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Site.js - Functions for Site model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Site - Model for shopapi site
 *
 * @api public
 */
var Site = AssociatedModel.extend(
/* instance methods */
{
    url : '/site'
},
/* class methods */
{

});

module.exports = Site;
