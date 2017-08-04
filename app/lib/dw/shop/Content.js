// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Content.js - Functions for Content model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Content - Model for shopapi content
 *
 * @api public
 */
var Content = AssociatedModel.extend(
/* instance methods */
{
    url : '/content'
},
/* class methods */
{

});

module.exports = Content;
