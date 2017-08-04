// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Promotion.js - Functions for Promotion model
 */
var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Promotion - Model for shopapi promotions
 *
 * @api public
 */
var Promotion = AssociatedModel.extend(
/* instance methods */
{
    url : '/promotions'
},
/* class methods */
{

});

module.exports = Promotion;
