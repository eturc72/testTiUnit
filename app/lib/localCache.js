// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/localCache.js - Functions for local cache
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('localCache', 'app/lib/localCache');

//---------------------------------------------------
// ## PUBLIC API

exports.initialize = initialize;
exports.getPrecachedModel = getPrecachedModel;
exports.getPrecachedModels = getPrecachedModels;
exports.touchPrecachedModel = touchPrecachedModel;
exports.updatePrecachedModel = updatePrecachedModel;
exports.updatePrecachedModels = updatePrecachedModels;
exports.recombineCollection = recombineCollection;
exports.resetCache = resetCache;

/**
 * initialize - initialize the cache
 *
 * @api public
 */
function initialize() {
    logger.info('initialize');
    var db = Ti.Database.open('ShopCacheDB');

    // Migration strategy is to drop the existing DB if the config.json param get's incremented
    db.execute('CREATE TABLE IF NOT EXISTS version (version INTEGER);');
    var rows = db.execute('SELECT version FROM version;');

    if (rows.isValidRow() && rows.rowCount > 0) {
        var version = rows.fieldByName('version');
        if (version < Alloy.CFG.ocapi.cache_version) {
            logger.log('ocapi', 'migrating to new cache_version, dropping cache table');
            rows.close();
            db.execute('DROP INDEX IF EXISTS shop_cache_hash_index;');
            db.execute('DROP TABLE IF EXISTS shop_cache;');
            db.execute('UPDATE version SET version = ?;', Alloy.CFG.ocapi.cache_version);
        }
    } else {
        logger.log('ocapi', 'setting up initial cache_version, dropping cache table');
        db.execute('DROP INDEX IF EXISTS shop_cache_hash_index;');
        db.execute('DROP TABLE IF EXISTS shop_cache;');
        db.execute('INSERT INTO version ( version ) VALUES ( ? );', Alloy.CFG.ocapi.cache_version);
    }
    db.execute('CREATE TABLE IF NOT EXISTS shop_cache (name TEXT, keywords TEXT, model TEXT, url TEXT, json_response TEXT, expiry TEXT, version INTEGER, frequency INTEGER, checksum TEXT, hash_id TEXT);');
    db.execute('CREATE INDEX IF NOT EXISTS shop_cache_hash_index ON shop_cache (hash_id);');
    db.close();
}

/**
 * getPrecachedModel - get precached model based on url
 *
 * @param {String} url to get the model for
 * @return {Object} cached reponse
 * @api public
 */
function getPrecachedModel(url) {
    logger.info('getPrecachedModel for url: ' + url);
    var db = Ti.Database.open('ShopCacheDB');
    var match = null;
    var urlHash = Ti.Utils.sha256(url);
    var start = new Date().getTime();
    var rows = db.execute('SELECT json_response, expiry, frequency, version, checksum FROM shop_cache WHERE hash_id = ?;', urlHash);
    var end = new Date().getTime();
    logger.log('performance', 'sql cache duration: ' + (end - start) + 'ms');

    if (rows.isValidRow() && rows.rowCount > 0) {
        match = {};
        match.urlHash = urlHash;
        match.json_response = rows.fieldByName('json_response');
        match.expiry = rows.fieldByName('expiry');
        match.frequency = rows.fieldByName('frequency');
        match.version = rows.fieldByName('version');
        match.checksum = rows.fieldByName('checksum');
    }

    rows.close();
    db.close();

    return match;
}

/**
 * getPrecachedModels - get precached models based on url
 *
 * @param {String} url to get the models for
 * @return {Object} cached reponse
 * @api public
 */
function getPrecachedModels(url) {
    logger.info('getPrecachedModels for url: ' + url);
    var matchData = url.match(/^([^=(]+)\(([^)]+)\)(.*)?$/);
    var base,
        ids,
        query_string,
        ids_array,
        collection_matches,
        collection_ids,
        missed_ids;

    if (matchData) {
        base = matchData[1];
        ids = matchData[2];
        ids_array = ids.split(',');
        missed_ids = ids.slice();
        query_string = matchData[3];
        collection_matches = [];
        collection_ids = [];
        missed_ids = [];

        var db = Ti.Database.open('ShopCacheDB');
        var match = null;
        var urlHashes = [],
            modelUrl,
            hash,
            idLookup = {};

        for (var i = 0; i < ids_array.length; i++) {
            modelUrl = base + ids_array[i] + (query_string || '');
            hash = Ti.Utils.sha256(modelUrl);
            urlHashes.push(hash);
            idLookup[hash] = ids_array[i];
        }

        var inExpr = '"' + urlHashes.join('","') + '"';
        var start = new Date().getTime();
        var rows = db.execute('SELECT hash_id, json_response, expiry, frequency, version, checksum FROM shop_cache WHERE hash_id IN (' + inExpr + ');');
        var end = new Date().getTime();
        logger.trace('SELECT hash_id, json_response, expiry, frequency, version, checksum FROM shop_cache WHERE hash_id IN (' + inExpr + ');');
        logger.trace('sql cache duration: ' + (end - start) + 'ms');

        var unsortedResults = [];
        if (rows.isValidRow() && rows.rowCount > 0) {
            for (var i = 0; i < rows.rowCount; i++) {
                match = {};
                match.urlHash = rows.fieldByName('hash_id');
                match.json_response = rows.fieldByName('json_response');
                match.expiry = rows.fieldByName('expiry');
                match.frequency = rows.fieldByName('frequency');
                match.version = rows.fieldByName('version');
                match.checksum = rows.fieldByName('checksum');
                unsortedResults[match.urlHash] = match;
                delete idLookup[match.urlHash];

                rows.next();
            }
        }

        // sort results to be in order they were requested
        for (var i = 0; i < urlHashes.length; i++) {
            var result = unsortedResults[urlHashes[i]];
            if (result) {
                collection_matches.push(result);
            }
        }

        // If we got back less than we asked for, then create the url for what's left to fetch
        var values = _.values(idLookup);
        if (values.length > 0) {
            missed_ids = values;
            modelUrl = base + '(' + missed_ids.join(',') + ')' + (query_string || '');
        } else {
            missed_ids = null;
            modelUrl = null;
        }
        rows.close();
        db.close();
    }

    return matchData ? {
        matches : collection_matches,
        misses : missed_ids,
        missedUrl : modelUrl,
        ids : ids_array
    } : null;
}

/**
 * touchPrecachedModel - touch the precached model so it doesn't expire
 *
 * @param {String} url for model
 * @api public
 */
function touchPrecachedModel(url) {
    logger.info('touchPrecachedModel for url: ' + url);
    var db = Ti.Database.open('ShopCacheDB');
    var expiry = new Date().getTime() + 36e5;
    var urlHash = Ti.Utils.sha256(url);
    var rows = db.execute('SELECT frequency FROM shop_cache WHERE hash_id = ?;', urlHash);

    if (rows.isValidRow() && rows.rowCount > 0) {
        var frequency = rows.fieldByName('frequency');
        db.execute('UPDATE shop_cache SET frequency = ?, expiry = ? WHERE hash_id = ?', parseInt(frequency) + 1, '' + expiry, urlHash);
    }
    db.close();
}

/**
 * updatePrecachedModel - update the cache for the model
 *
 * @param {String} url
 * @param {Object} model
 * @param {Object} model_info
 * @api public
 */
function updatePrecachedModel(url, model, model_info) {
    logger.info('updatePrecachedModel for url: ' + url);
    // Create cache entry ... good for one hour ... for now
    var expiry = new Date().getTime() + 3600000;

    if (model_info.json_response && model_info.urlHash) {
        var db = Ti.Database.open('ShopCacheDB');

        logger.log('ocapi', 'deleting old cached value');
        db.execute('DELETE FROM shop_cache WHERE hash_id = ?;', model_info.urlHash);

        // update version to track changes
        logger.log('ocapi', 'updating cached value for object w/ urlHash=' + model_info.urlHash);

        var rows = db.execute('INSERT INTO shop_cache (name, model, url, json_response, expiry, frequency, version, checksum, hash_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', model.name, model.config.model_name, url, model_info.json_response, model_info.expiry, parseInt(model_info.frequency) + 1, parseInt(model_info.version) + 1, model_info.checksum, model_info.urlHash);
        db.close();
    }
}


/**
 * updatePrecachedModels - update the cache for the models
 *
 * @param {String} url
 * @param {Object} model
 * @param {Object} model_info
 * @api public
 */
function updatePrecachedModels(url, model, model_info) {
    logger.info('updatePrecachedModels for url: ' + url);
    if (model_info.json_response) {
        var response = JSON.parse(model_info.json_response),
            now = new Date().getTime();
        if (response.data) {
            var db = Ti.Database.open('ShopCacheDB');
            var memberURL,
                memberID,
                memberObj,
                memberText,
                member,
                cachedObject;
            for (var i = 0; i < response.data.length; i++) {
                member = response.data[i];
                memberID = member.id;
                memberURL = url.replace(/\/\(([A-Za-z0-9-_,%]+)\)\?/, '/' + memberID + '?');
                memberText = JSON.stringify(member);
                memberText = '{"_v":"' + response._v + '",' + memberText.substring(1);
                memberObj = JSON.parse(memberText);
                cachedObject = _.extend({}, {
                    name : model.name,
                    model : model.config.model_name,
                    url : memberURL,
                    hash_id : Ti.Utils.sha256(memberURL),
                    json_response : memberText,
                    expiry : now + 3600000,
                    frequency : 1,
                    version : 1,
                    checksum : Ti.Utils.sha256(memberText)
                });
                rows = db.execute('SELECT hash_id, frequency, version FROM shop_cache WHERE hash_id=?;', cachedObject.hash_id);
                if (rows && rows.rowCount > 0) {
                    var frequency = rows.getFieldByName('frequency');
                    var version = rows.getFieldByName('version');
                    rows = db.execute('UPDATE shop_cache SET json_response=?, expiry=?, frequency=?, version=?, checksum=? WHERE hash_id=?;', cachedObject.json_response, cachedObject.expiry, frequency + 1, version + 1, cachedObject.checksum, cachedObject.hash_id);
                } else {
                    rows = db.execute('INSERT INTO shop_cache (name, model, url, json_response, expiry, frequency, version, checksum, hash_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', cachedObject.name, cachedObject.model, cachedObject.url, cachedObject.json_response, cachedObject.expiry, cachedObject.frequency, cachedObject.version, cachedObject.checksum, cachedObject.hash_id);
                }
            }
            db.close();
        }
    }
}

/**
 * recombineCollection - Recombines the cached & fetched models into a single array
 *
 * @param {Array} collection_ids
 * @param {Array} collection_matches
 * @param {Array} other_models
 * @return {Array} combined collection
 * @api public
 */
function recombineCollection(collection_ids, collection_matches, other_models) {
    logger.info('recombineCollection for ids: ' + JSON.stringify(collection_ids));
    collection_matches = collection_matches || [];

    var outArray = [];
    var matchHash = {},
        obj,
        id;

    for (var i = 0; i < collection_matches.length; i++) {
        obj = collection_matches[i];
        matchHash[obj.id] = obj;
    }
    for (var i = 0; i < other_models.length; i++) {
        obj = other_models[i];
        matchHash[obj.id] = obj;
    }

    for (var i = 0; i < collection_ids.length; i++) {
        id = collection_ids[i];
        outArray.push(matchHash[id]);
    }

    return outArray;
}

/**
 * resetCache - resets the cache in the application
 *
 * @api public
 */
function resetCache() {
    logger.info('resetCache called');
    var db = Ti.Database.open('ShopCacheDB');
    db.execute('DROP TABLE IF EXISTS shop_cache;');
    db.execute('CREATE TABLE IF NOT EXISTS shop_cache (name TEXT, keywords TEXT, model TEXT, url TEXT, json_response TEXT, expiry TEXT, version INTEGER, frequency INTEGER, checksum TEXT, hash_id TEXT);');
    db.close();
}
