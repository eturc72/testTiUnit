// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/alloyAdditions.js - functions for additional features to alloy
 */

var Backbone = require('alloy/backbone');

/**
 * Alloy.M -The sync() function for Models and Collections should return a result ... otherwise fetch() and save(), etc
 * won't return a result ... unlike jQuery usage, which returns a jqXHR (a Deferred object)
 *
 * @param name
 * @param modelDesc
 * @param migrations
 *
 * @api public
 */
Alloy.M = function(name, modelDesc, migrations) {
    var config = modelDesc.config,
        type = (config.adapter ? config.adapter.type : null) || 'localDefault';

    type === 'localDefault' && ( type = 'sql');
    var adapter = require('alloy/sync/' + type);
    var extendObj = {
        defaults : config.defaults,
        sync : function(method, model, opts) {
            var config = model.config || {},
                adapterObj = config.adapter || {},
                type = (config.adapter ? config.adapter.type : null) || 'localDefault';
            type === 'localDefault' && ( type = 'sql');
            // Make sure to return the value from this ...
            return require('alloy/sync/' + type).sync(method, model, opts);
        }
    };
    var extendClass = {};
    migrations && (extendClass.migrations = migrations);
    _.isFunction(adapter.beforeModelCreate) && ( config = adapter.beforeModelCreate(config, name) || config);

    // Add support for custom super-class
    var superClass = config.superClass || Backbone.Model;
    var Model = superClass.extend(extendObj, extendClass);
    Model.prototype.config = config;
    _.isFunction(modelDesc.extendModel) && ( Model = modelDesc.extendModel(Model) || Model);
    _.isFunction(adapter.afterModelCreate) && adapter.afterModelCreate(Model, name);
    return Model;
};

/**
 * Alloy.C - collection model
 *
 * @param name
 * @param modelDesc
 * @param model
 *
 * @api public
 */
Alloy.C = function(name, modelDesc, model) {
    // Add support for custom super-class
    modelDesc.config = modelDesc.config || {};
    var superClass = Backbone.Collection;
    var extendObj = {
        model : model,
        sync : function(method, model, opts) {
            // Make sure to return the value from this ...
            return this.adapter.sync(method, model, opts);
        }
    };
    var Collection = superClass.extend(extendObj),
        config = Collection.prototype.config = model.prototype.config;

    var _adapter = config.collection_adapter || config.adapter || {
        type : 'localDefault'
    };
    var type = _adapter.type;
    Collection.prototype.adapter = require('alloy/sync/' + type);
    var adapter = require('alloy/sync/' + type);

    _.isFunction(adapter.afterCollectionCreate) && adapter.afterCollectionCreate(Collection);
    _.isFunction(modelDesc.extendCollection) && ( Collection = modelDesc.extendCollection(Collection) || Collection);

    return Collection;
};

// Replace Backbone.Model with Associated.Model for nested object support
var AssociatedModel = require('backbone-associations').AssociatedModel;
var BackboneModel = Backbone.Model;
Backbone.Model = AssociatedModel;

// Add support for deferreds
Alloy._.mixin(require('underscore.deferred'));

// Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
Alloy._.mixin(require('underscore.string'));

/**
 * makePrintable - turns string into key name found in strings.xml
 *
 * @param {String} inString
 *
 * @api public
 */
var makePrintable = function(inString) {
    inString = inString || '';

    return '_' + inString.replace(/[^a-z0-9_]/gi, '_');
};

/**
 * _L = localize the string
 *
 * @param {String} locale_string
 * @return {String} localized string
 *
 * @api public
 */
_L = function(locale_string) {
    if (locale_string == '$') {
        locale_string = 'CurrencySymbol';
    }
    return L(makePrintable(locale_string));
};
