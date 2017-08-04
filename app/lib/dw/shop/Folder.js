// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Folder.js - Functions for Folder model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * Folder - Model for shopapi folders
 *
 * @api public
 */
var Folder = AssociatedModel.extend(
/* instance methods */
{
    url : '/folders'
},
/* class methods */
{

});

module.exports = Folder;
