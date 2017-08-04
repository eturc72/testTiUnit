// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/ContentSearch.js - Functions for ContentSearch model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * ContentSearch - Model for shopapi content search
 *
 * @api public
 */
var ContentSearch = AssociatedModel.extend(
/* instance methods */
{
    url : '/content_search'
},
/* class methods */
{

});

module.exports = ContentSearch;
