// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/appSettings.js - Functions for configurations database manipulation
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('application:appSettings', 'app/lib/appSettings');

var dbName = 'AppSettingsDB';
var tableName = 'app_settings';
var initialized = false;
var setConfigValue = require('EAUtils').setConfigValue;
var getConfigValue = require('EAUtils').getConfigValue;

//---------------------------------------------------
// ## PUBLIC API

exports.clearDB = clearDB;
exports.dbExists = dbExists;
exports.setSetting = setSetting;
exports.applyConfig = applyConfig;

//---------------------------------------------------
// ## FUNCTIONS

/**
 * clearDB - will remove the app settings database
 *
 * @api public
 */
function clearDB() {
    logger.info('clear database');
    var db = Ti.Database.open(dbName);
    try {
        db.execute('DROP TABLE IF EXISTS ' + tableName);
    } catch(ex) {
        logger.error('db error ' + ex.message);
    }
    db.close();
    initialized = false;
}

/**
 * dbExists - will determine if anything exists in the app settings database
 *
 * @api return {Booelan} if exists or not
 *
 * @api public
 */
function dbExists() {
    logger.info('dbExists called');
    var exists = false;
    var db = Ti.Database.open(dbName);
    try {
        var rows = db.execute('SELECT name FROM ' + tableName);
        if (rows.isValidRow() && rows.rowCount > 0) {
            exists = true;
            rows.close();
        }
    } catch(ex) {
        logger.error('db error ' + ex.message);
    }
    db.close();
    logger.info( exists ? 'db DOES exists' : 'db DOES NOT exist');
    return exists;
}

/**
 * setSetting - will add the configuration to the app settings database
 *
 * @param {String} name - the path of the config after the Alloy.CFG
 * @param {String} new_value - the value to set for the configuration
 * @param {Boolean} forceOrigUpdate - force the original_value to be updated in case of startup changes
 *
 * @api public
 */
function setSetting(name, new_value, forceOrigUpdate) {
    logger.info('setSetting for name: ' + name + ' with new_value ' + new_value);
    forceOrigUpdate = forceOrigUpdate || false;

    if (name && !_.isUndefined(new_value)) {
        if (!initialized) {
            initialize();
        }
        var config_value = getConfigValue(name);
        var db = Ti.Database.open(dbName);
        try {
            var rows = db.execute('SELECT original_value FROM ' + tableName + ' WHERE name=?;', name);
            if (rows.isValidRow()) {
                logger.info('updating entry: name ' + name + ' value ' + new_value);
                db.execute('UPDATE ' + tableName + ' SET value=? WHERE name=?;', new_value, name);
                // if the old config value changed then we need to update in DB
                if (forceOrigUpdate) {
                    logger.info('updating original_value ' + config_value);
                    db.execute('UPDATE ' + tableName + ' SET original_value=? WHERE name=?;', config_value, name);
                }
                rows.close();
            } else {
                logger.info('creating new entry: name ' + name + ' value ' + new_value + ' original_value ' + config_value);
                db.execute('INSERT INTO ' + tableName + ' (name, value, original_value) VALUES (?, ?, ?);', name, new_value, config_value);
            }
            logger.info('updating Alloy.CFG.' + name + ' to ' + new_value);
            setConfigValue(name, new_value);
            Alloy.eventDispatcher.trigger('configurations:' + name);
            logger.info('after Alloy.CFG.' + name + ' to ' + getConfigValue(name));
        } catch(ex) {
            logger.error('db error ' + ex.message);
        }
        db.close();
    }
}

/**
 * applyConfig - will update the Alloy.CFG with values from the app settings database
 *
 * @param {String} configName - (optional) the path of the config after the Alloy.CFG
 *
 * @api public
 */
function applyConfig(configName) {
    logger.info('applyConfig called with ' + configName);

    if (!initialized) {
        initialize();
    }
    var db = Ti.Database.open(dbName);
    var value = null;
    try {
        var rows = null;
        if (configName) {
            rows = db.execute('SELECT name, value, original_value FROM ' + tableName + ' WHERE name=?;', configName);
        } else {
            rows = db.execute('SELECT name, value, original_value FROM ' + tableName);
        }
        // less settings than config, so loop through the settings
        logger.info(' row count ' + rows.rowCount);
        while (rows && rows.isValidRow()) {
            var name = rows.fieldByName('name');
            var value = rows.fieldByName('value');
            var orig_value = rows.fieldByName('original_value');
            var config_value = getConfigValue(name);
            logger.info(' name ' + name + ' value ' + value + ' original_value ' + orig_value + ' config_value ' + config_value);
            logger.info('applying Alloy.CFG.' + name + ' to ' + value);
            setConfigValue(name, value);
            logger.info('after Alloy.CFG.' + name + ' to ' + getConfigValue(name));
            rows.next();
        }

        rows.close();
    } catch(ex) {
        logger.error('db error ' + ex.message);
    }
    db.close();
}

/**
 * initialize - will create the app settings database
 *
 * @api private
 */
function initialize() {
    if (initialized) {
        return;
    }
    logger.info('initialize');
    var db = Ti.Database.open(dbName);
    db.execute('CREATE TABLE IF NOT EXISTS ' + tableName + ' (name TEXT, value BLOB, original_value BLOB);');
    db.close();
    initialized = true;
}
