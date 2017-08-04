// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/testhelper.js - helper functions for model tests
 */

//---------------------------------------------------
// ## PUBLIC API

exports.equals = equals;
exports.isTrue = isTrue;
exports.isFalse = isFalse;
exports.isUndefined = isUndefined;
exports.isNotUndefined = isNotUndefined;
exports.isNull = isNull;
exports.isNotNull = isNotNull;
exports.failure = failure;
exports.functionsDefined = functionsDefined;
exports.testDynamicNumberFunctions = testDynamicNumberFunctions;
exports.testDynamicIntegerFunctions = testDynamicIntegerFunctions;
exports.testDynamicStringFunctions = testDynamicStringFunctions;
exports.testDynamicDateFunctions = testDynamicDateFunctions;
exports.testDynamicBooleanFunctions = testDynamicBooleanFunctions;
exports.testDynamicObjectFunctions = testDynamicObjectFunctions;
exports.testDynamicArrayFunctions = testDynamicArrayFunctions;
exports.testDynamicMapFunctions = testDynamicMapFunctions;
exports.runDynamicMethodTestsForChildObject = runDynamicMethodTestsForChildObject;
exports.compareAddresses = compareAddresses;
exports.newCategoryModel = newCategoryModel;
exports.newContentModel = newContentModel;
exports.newProductModel = newProductModel;
exports.newProductSearchModel = newProductSearchModel;
exports.newBasketModel = newBasketModel;
exports.newAssociateModel = newAssociateModel;
exports.newCustomerModel = newCustomerModel;
exports.newCustomerSearchModel = newCustomerSearchModel;
exports.newCustomerAddressModel = newCustomerAddressModel;
exports.newCustomerOrderModel = newCustomerOrderModel;
exports.newStoreCountriesModel = newStoreCountriesModel;
exports.newStoreStatesModel = newStoreStatesModel;
exports.newCFGSettingsModel = newCFGSettingsModel;
exports.newProductCollection = newProductCollection;
exports.newStoreCollection = newStoreCollection;
exports.newProductItemCollection = newProductItemCollection;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * equals - actual is equal to expected
 *
 * @param {Object} actual
 * @param {Object} expected
 * @api public
 */
function equals(actual, expected) {
    expect(actual).toBe(expected);
}

/**
 * isTrue - actual is true
 *
 * @param {Object} actual
 * @api public
 */
function isTrue(actual) {
    expect(actual).toBe(true);
}

/**
 * isFalse - actual is false
 *
 * @param {Object} actual
 * @api public
 */
function isFalse(actual) {
    expect(actual).toBe(false);
}

/**
 * isUndefined - actual is undefined
 *
 * @param {Object} actual
 * @api public
 */
function isUndefined(actual) {
    expect(actual).toBe(undefined);
}

/**
 * isNotUndefined - actual is not undefined
 *
 * @param {Object} actual
 * @api public
 */
function isNotUndefined(actual) {
    expect(actual).notToBe(undefined);
}

/**
 * isNull - actual is null
 *
 * @param {Object} actual
 * @api public
 */
function isNull(actual) {
    expect(actual).toBe(null);
}

/**
 * isNotNull - actual is not null
 *
 * @param {Object} actual
 * @api public
 */
function isNotNull(actual) {
    expect(actual).notToBe(null);
}

/**
 * failure - check for failure in error response
 *
 * @param {Object} error
 * @param {Object} expectationText
 * @api public
 */
function failure(error, expectationText) {
    if (error && _.isFunction(error.toJSON)) {
        error = error.toJSON();
    }
    if (error === undefined || error === null) {
        expect('A deferred failure occurred').toBe('Success');
    } else if (error.hasOwnProperty('fault')) {
        var fault = error.fault;
        if (fault.hasOwnProperty('type') && fault.hasOwnProperty('message')) {
            expect(fault.type + ': ' + fault.message).toBe('Success');
        }
    } else if (error.hasOwnProperty('type') && error.hasOwnProperty('message')) {
        expect(error.type + ': ' + error.message).toBe('Success');
    } else if ( typeof error === 'string') {
        expect(error).toBe(expectationText || 'Success');
    }
}

/**
 * functionsDefined - check for functions to be defined
 *
 * @api public
 */
function functionsDefined() {
    _.each(arguments, function(func) {
        expect(func).notToBe(undefined);
    });
}

/**
 * testDynamicNumberFunctions - test dynamic number functions
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicNumberFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(getFunc.call(obj), obj.get(property));
    }

    var prevVal = obj.get(property);
    var model = setFunc.call(obj, 501.1);
    var modelGetFunc = model['get' + methodRoot];
    this.equals(modelGetFunc.call(model), 501.1);
    if (prevVal !== undefined) {
        setFunc.call(obj, prevVal);
    }
}

/**
 * testDynamicIntegerFunctions - test dynamic integer function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicIntegerFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(getFunc.call(obj), obj.get(property));
    }

    var prevVal = obj.get(property);
    var model = setFunc.call(obj, 500);
    var modelGetFunc = model['get' + methodRoot];
    this.equals(modelGetFunc.call(model), 500);
    if (prevVal !== undefined) {
        setFunc.call(obj, prevVal);
    }
}

/**
 * testDynamicStringFunctions - test dynamic string function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicStringFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(getFunc.call(obj), obj.get(property));
        var prevVal = obj.get(property);
        var testString = 'testing function set' + methodRoot + ' on ' + property == 'id' ? prevVal : obj.get('id');
        var model = setFunc.call(obj, testString);
        var modelGetFunc = model['get' + methodRoot];
        this.equals(modelGetFunc.call(model), testString);
        if (prevVal !== undefined) {
            setFunc.call(obj, prevVal);
        }
    }
}

/**
 * testDynamicDateFunctions - test dynamic date function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicDateFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(getFunc.call(obj), obj.get(property));
    }

    var prevVal = obj.get(property);
    //var model = setFunc.call(obj, );
    var modelGetFunc = model['get' + methodRoot];
    //this.equals(modelGetFunc.call(model), 500);
    if (prevVal !== undefined) {
        setFunc.call(obj, prevVal);
    }
}

/**
 * testDynamicBooleanFunctions - test dynamic boolean function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicBooleanFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var isFunc = obj['is' + methodRoot];
    var setFunc = obj['setIs' + methodRoot];

    this.functionsDefined(hasFunc, isFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(isFunc.call(obj), obj.get(property));
    }

    var boolVal = obj.get(property);
    var model = setFunc.call(obj, !boolVal);
    var modelIsFunc = model['is' + methodRoot];
    this.equals(modelIsFunc.call(model), !boolVal);
    if (boolVal !== undefined) {
        setFunc.call(obj, boolVal);
    }
}

/**
 * testDynamicObjectFunctions - test dynamic object function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicObjectFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, setFunc);

    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(getFunc.call(obj), obj.get(property));
    }

    var prevVal = obj.get(property);
    var objToSet = {
        id : 'test property',
        test : 'another property'
    };
    var model = setFunc.call(obj, objToSet);
    var modelGetFunc = model['get' + methodRoot];
    this.equals(JSON.stringify(modelGetFunc.call(model)).replace(/\"/g, "'"), JSON.stringify(objToSet).replace(/\"/g, "'"));
    if (prevVal !== undefined) {
        setFunc.call(obj, prevVal);
    }
}

/**
 * testDynamicArrayFunctions - test dynamic array function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicArrayFunctions(obj, property) {
    var methodRoot = _.capitalize(_.camelize(property));
    var hasFunc = obj['has' + methodRoot];
    var getFunc = obj['get' + methodRoot];
    var getCollFunc = obj['get' + methodRoot + 'Collection'];
    var setFunc = obj['set' + methodRoot];

    this.functionsDefined(hasFunc, getFunc, getCollFunc, setFunc);

    var val = obj.get(property);
    var array = getFunc.call(obj);
    var coll = getCollFunc.call(obj);
    if (hasFunc.call(obj)) {
        this.equals(hasFunc.call(obj), true);
        this.equals(coll, val);
    }

    this.equals(_.isArray(array), true);
    this.equals(coll.models.length, array.length);
    var model = setFunc.call(obj, []);
    var modelGetFunc = model['get' + methodRoot];
    this.equals(modelGetFunc.call(model).length, 0);
    if (val !== undefined) {
        setFunc.call(obj, val);
    }
}

/**
 * testDynamicMapFunctions - test dynamic map function
 *
 * @param {Object} obj
 * @param {Object} property
 * @api public
 */
function testDynamicMapFunctions(obj, property) {
    //this.equals(false, true);
}

/**
 * runDynamicMethodTestsForChildObject - run dynamic method tests for child object
 *
 * @param {Object} metadataObj
 * @param {Object} obj
 * @api public
 */
function runDynamicMethodTestsForChildObject(metadataObj, obj) {
    var metaprops = metadataObj.properties;
    if (metaprops === undefined) {
        return;
    }
    var properties = _.keys(metaprops);
    _.each(properties, function(property) {
        var classDesc = metaprops[property];
        if (classDesc.type == 'string') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicStringFunctions(obj, property);
        } else if (classDesc.type == 'integer') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicIntegerFunctions(obj, property);
        } else if (classDesc.type == 'number') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicNumberFunctions(obj, property);
        } else if (classDesc.type == 'object' && classDesc.format == 'map') {
            console.log('test ' + classDesc.type + '/map property: ' + property);
            exports.testDynamicMapFunctions(obj, property);
        } else if (classDesc.type == 'object') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicObjectFunctions(obj, property);
            exports.runDynamicMethodTestsForChildObject(metaprops[property], obj.get(property));
        } else if (classDesc.type == 'boolean') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicBooleanFunctions(obj, property);
        } else if (classDesc.type == 'array') {
            console.log('test ' + classDesc.type + ' property: ' + property);
            exports.testDynamicArrayFunctions(obj, property);
        }
    });
}

/**
 * compareAddresses - compare two addresses for equality
 *
 * @param {Object} address1
 * @param {Object} address2
 * @api public
 */
function compareAddresses(address1, address2) {
    this.equals(address1.getAddress1(), address2.getAddress1());
    this.equals(address1.getAddress2(), address2.getAddress2());
    this.equals(address1.getCity(), address2.getCity());
    this.equals(address1.getCountryCode(), address2.getCountryCode());
    this.equals(address1.getStateCode(), address2.getStateCode());
    this.equals(address1.getPostalCode(), address2.getPostalCode());
    this.equals(address1.getFirstName(), address2.getFirstName());
    this.equals(address1.getLastName(), address2.getLastName());
    this.equals(address1.getPhone(), address2.getPhone());
}

/**
 * newCategoryModel - new category model
 *
 * @param {Number} id
 * @return {Object} model
 * @api public
 */
function newCategoryModel(id) {
    return newModel('category', {
        id : id
    });
}

/**
 * newContentModel - new content model
 *
 * @param {Number} id
 * @return {Object} model
 * @api public
 */
function newContentModel(id) {
    return newModel('content', {
        id : id
    });
}

/**
 * newProductModel - new product model
 *
 * @param {Number} id
 * @return {Object} model
 * @api public
 */
function newProductModel(id) {
    return newModel('product', {
        id : id
    });
}

/**
 * newProductSearchModel - new product search model
 *
 * @param {Object} model
 * @api public
 */
function newProductSearchModel(json) {
    return newModel('productSearch', json);
}

/**
 * newBasketModel - new basket model
 *
 * @return {Object} model
 * @api public
 */
function newBasketModel() {
    return newModel('baskets');
}

/**
 * newAssociateModel - new associate model
 *
 * @return {Object} model
 * @api public
 */
function newAssociateModel() {
    return newModel('associate');
}

/**
 * newCustomerModel - new customer model
 *
 * @return {Object} model
 * @api public
 */
function newCustomerModel() {
    return newModel('customer');
}

/**
 * newCustomerSearchModel - new customer search model
 *
 * @return {Object} model
 * @api public
 */
function newCustomerSearchModel() {
    return newModel('customerSearch');
}

/**
 * newCustomerAddressModel - new customer address model
 *
 * @return {Object} model
 * @api public
 */
function newCustomerAddressModel() {
    return newModel('customerAddress');
}

/**
 * newCustomerOrderModel - new customer order model
 *
 * @return {Object} model
 * @api public
 */
function newCustomerOrderModel() {
    return newModel('customerOrder');
}

/**
 * newStoreCountriesModel - new store countries model
 *
 * @return {Object} model
 * @api public
 */
function newStoreCountriesModel() {
    return newModel('storeCountries');
}

/**
 * newStoreStatesModel - new store states model
 *
 * @return {Object} model
 * @api public
 */
function newStoreStatesModel() {
    return newModel('storeStates');
}

/**
 * newCFGSettingsModel - new cfgSettings model
 *
 * @return {Object} model
 * @api public
 */
function newCFGSettingsModel() {
    return newModel('cfgSettings');
}

/**
 * newModel - create new model of type with json
 *
 * @param {Object} type
 * @param {Object} json
 * @return {Object} model
 * @api private
 */
function newModel(type, json) {
    return Alloy.createModel(type, json);
}

/**
 * newCollection - create new Collection of type with data
 *
 * @param {Object} type
 * @param {Array} data
 * @return {Object} Collection
 * @api private
 */
function newCollection(type, data) {
    return Alloy.createCollection(type, data);
}

/**
 * newProductCollection - new product collection
 *
 * @return {Object} Collection
 * @api public
 */
function newProductCollection() {
    return newCollection('product');
}

/**
 * newStoreCollection - new Store collection
 *
 * @return {Object} Collection
 * @api public
 */
function newStoreCollection() {
    return newCollection('store');
}

/**
 * newProductItemCollection - new product item collection
 *
 * @return {Object} Collection
 * @api public
 */
function newProductItemCollection() {
    return newCollection('productItem');
}

