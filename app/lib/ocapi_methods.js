// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/ocapi_methods.js - Mixin api methods for ocapi
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('ocapi:ocapi_methods', 'app/lib/ocapi_methods');

//---------------------------------------------------
// ## FUNCTIONS

function mixinApiMethods(modelClass, metadata) {
    modelClass.prototype.modelHash = modelClass.prototype.modelHash || {};

    // Unless we've already been extended ...
    //  The _get thing allows for get('') to use custom accessors
    if (modelClass.prototype._get) {
        return;
    }

    modelClass.prototype._get = modelClass.prototype.get;
    modelClass.prototype.get = function(key) {
        if (!key) {
            return null;
        }
        // Look for matching accessor function first
        var camelKey = _.capitalize(_.camelize(key));
        var getMethod = 'get' + camelKey;

        // Look thru relations to find out if to many or to one
        var relations = this.relations || [],
            relation;

        for (var i = 0; i < relations.length; i++) {
            relation = relations[i];
            if (relation.key == key) {
                if (relation.type == Backbone.Many) {
                    getMethod += 'Collection';
                }
                break;
            }
        }
        if (this[getMethod]) {
            return this[getMethod]();
        }

        return this._get(key);
    };

    modelClass.prototype.modelHash[metadata.name] = modelClass;
    logger.info('mixinApiMethods adding to modelHash ' + metadata.name);

    // Pull down (or hard-code) the service metadata, to serve as basis for the OCAPI schema
    var metaprops = metadata.properties;

    var properties = _.keys(metaprops);
    _.each(properties, function(property) {
        var classDescription = metaprops[property];
        if (classDescription.type == 'string') {
            // Simple string property
            ensureAPIStringProperty(modelClass, classDescription);
        } else if (classDescription.type == 'number') {
            // Simple number property
            ensureAPINumberProperty(modelClass, classDescription);
        } else if (classDescription.type == 'integer') {
            // Simple number property
            ensureAPIIntegerProperty(modelClass, classDescription);
        } else if (classDescription.type == 'boolean') {
            // Simple number property
            ensureAPIBooleanProperty(modelClass, classDescription);
        } else if (classDescription.type == 'object' && classDescription.format == 'map') {
            // Key-Value map
            ensureAPIMapProperty(modelClass, classDescription);
        } else if (classDescription.type == 'object') {
            // To-one relationship
            ensureAPIToOneRelationship(modelClass, classDescription);
        } else if (classDescription.type == 'array') {
            // Array of objects
            ensureAPIToManyRelationship(modelClass, classDescription);
        }
    });
}

/**
 * ensureAPIStringProperty - ensure api has string property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIStringProperty(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
}

/**
 * ensureAPINumberProperty - ensure api has number property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPINumberProperty(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
}

/**
 * ensureAPIIntegerProperty - ensure api has integer property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIIntegerProperty(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
}

/**
 * ensureAPIBooleanProperty - ensure api has boolean property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIBooleanProperty(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'is' + camelMethod;
    var setMethod = 'setIs' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
}

/**
 * ensureAPIToOneRelationship - ensure api has one relationship property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIToOneRelationship(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
    // Now create a Backbone.Model class model for the class (if not already there)
    var nestedObjectClass = classObject.prototype.modelHash[property.name];
    if (!nestedObjectClass) {
        nestedObjectClass = Backbone.Model.extend({});
        // Add myself to the stack
        mixinApiMethods(nestedObjectClass, property);

        // with relationship definitions for Associated Model
        classObject.prototype.modelHash[property.label] = nestedObjectClass;
        logger.info('ensureAPIToOneRelationship adding to modelHash ' + property.label);
    } else {
        logger.info('ensureAPIToOneRelationship SKIPPING adding to modelHash ' + property.label + ' obtained with ' + property.name);
    }
    var className = _.capitalize(_.camelize(property.label));
    if (!classObject[className]) {
        classObject[className] = nestedObjectClass;
    }

    classObject.prototype.relations = classObject.prototype.relations || [];
    classObject.prototype.relations.push({
        type : Backbone.One,
        key : property.label,
        relatedModel : nestedObjectClass
    });
    logger.info('Relation Count: ' + classObject.prototype.relations.length);
}

/**
 * ensureAPIToManyRelationship - ensure api has to many relationship property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIToManyRelationship(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod + 'Collection';
    var getArrayMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getArrayMethod]) {
        classObject.prototype[getArrayMethod] = function() {
            var collection = this._get(method);
            return ( collection ? collection.models : []);
        };
    }
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            var collection = this._get(method);
            return ( collection ? collection : new Backbone.Collection([], {
                model : classObject
            }));
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this._get(method) != null;
        };
    }
    // Now create a Backbone.Model class model for the class (if not already there)
    var nestedObjectClass = classObject.prototype.modelHash[property.items.name];
    if (!nestedObjectClass) {
        nestedObjectClass = Backbone.Model.extend({});
        // Add myself to the stack
        mixinApiMethods(nestedObjectClass, property.items);
        // with relationship definitions for Associated Model
        classObject.prototype.modelHash[property.items.name] = nestedObjectClass;
        logger.info('ensureAPIToManyRelationship adding to modelHash ' + property.items.name);
    } else {
        logger.info('ensureAPIToManyRelationship SKIPPING adding to modelHash ' + property.items.name);
    }
    var className = _.capitalize(_.camelize(property.items.name));
    if (!classObject[className]) {
        classObject[className] = nestedObjectClass;
    }
    classObject.prototype.relations = classObject.prototype.relations || [];
    classObject.prototype.relations.push({
        type : Backbone.Many,
        key : property.label,
        relatedModel : nestedObjectClass
    });
    logger.info('Relation Count: ' + classObject.prototype.relations.length);
}

/**
 * ensureAPIMapProperty - ensure api has map property
 *
 * @param {Object} classObject
 * @param {Object} property
 * @api private
 */
function ensureAPIMapProperty(classObject, property) {
    var method = property.label;
    var camelMethod = _.capitalize(_.camelize(method));
    var getMethod = 'get' + camelMethod;
    var setMethod = 'set' + camelMethod;
    var hasMethod = 'has' + camelMethod;
    if (!classObject.prototype[getMethod]) {
        classObject.prototype[getMethod] = function() {
            return this._get(method);
        };
    }
    if (!classObject.prototype[setMethod]) {
        classObject.prototype[setMethod] = function(value, options) {
            // setName( value, options ) ... calls
            // set( 'name', value, options )
            return this.set(method, value, options);
        };
    }
    if (!classObject.prototype[hasMethod]) {
        classObject.prototype[hasMethod] = function() {
            return this.has(method);
        };
    }
}

module.exports = mixinApiMethods;
