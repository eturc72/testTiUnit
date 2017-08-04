// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/logging.js - Functions for logging in the application
 */

module.exports = function(loggingCategory, loggingComponent) {

    //---------------------------------------------------
    // ## VARIABLES

    var logging = {};

    var categoryString = loggingCategory;
    var component = loggingComponent;

    //---------------------------------------------------
    // ## FUNCTIONS

    /**
     * log - function to output log messages for the specified category
     *
     * @param {String} category - the category to log for
     * @param {String} message - the message to log
     * @api public
     */
    logging.log = function(cat, message) {
        var logCats = getLoggableCategories();
        var loggableCategories = logCats.loggableCategories;
        var loggableSubcategories = logCats.loggableSubcategories;
        var category,
            subCategoryArray;
        var shouldLogSubcategory = false;
        var logStamp;

        var index = cat.indexOf(':');
        if (index != -1) {
            category = cat.substring(0, index);
            subCategoryArray = cat.substring(index + 1).split(':');
        } else {
            category = cat;
        }

        if (!message) {
            message = category;
            category = 'default';
        }

        var shouldLog = ((!subCategoryArray && loggableCategories.indexOf(category) > -1) 
                        || (loggableCategories.indexOf('all') > -1) 
                        || (category == 'error') 
                        || (loggableCategories.indexOf('memory') > -1));

        if (!shouldLog && subCategoryArray) {
            if (loggableCategories.indexOf(category) != -1) {
                shouldLog = shouldLogSubcategory = true;
            } else {
                var subCatArr = loggableSubcategories[category];

                if (subCatArr) {
                    for (var idx = 0; idx < subCatArr.length; idx++) {
                        var directoryLevel = null;

                        if (subCategoryArray) {
                            // if directoryLevel is equal to the index of the last element of  subCategoryArray, subCatArr[idx][0] is in fact a directory instead of a file
                            directoryLevel = subCategoryArray.indexOf(subCatArr[idx][0]);
                        }
                        // subCatArr[idx][0] is a directory
                        if ((subCatArr[idx].length == 1) && subCategoryArray && (directoryLevel > -1) && (directoryLevel < subCategoryArray.length - 1)) {
                            shouldLog = shouldLogSubcategory = true;
                            break;
                        } else {
                            // subCatArr[idx][0] is a file
                            if (_.isEqual(subCatArr[idx], subCategoryArray)) {
                                shouldLog = shouldLogSubcategory = true;
                                break;
                            }
                        }
                    }
                }
                // the statement below makes sure that we always allow logs from payment
                if ((category == 'checkout') && (subCategoryArray && subCategoryArray.indexOf('payments') > -1)) {
                    shouldLog = shouldLogSubcategory = true;
                }
            }
        }

        if (shouldLog) {
            if ( typeof moment === 'function') {
                logStamp = '[' + moment().format('HH:mm:ss.SSS') + ']';
            } else {
                logStamp = '';
            }
            logStamp += ' [' + category + ( subCategoryArray ? ':' + this.arrayToString(subCategoryArray) : '') + ']' + ( component ? ' ' + component : '');
            if (category == 'error') {
                Ti.API.error(logStamp, message);
            } else if (category == 'trace') {
                var elapsed,
                    now = new Date().getTime();
                if (lastTrace > 0) {
                    elapsed = now - lastTrace;
                } else {
                    elapsed = '---';
                }

                lastTrace = now;

                Ti.API.trace(logStamp, 'elapsed: ' + elapsed, message);
            } else if (loggableCategories.indexOf('all') > -1 || (!subCategoryArray && loggableCategories.indexOf(category) > -1) || shouldLogSubcategory) {
                // In production, we use swissArmyUtils.eaLog because Ti.API.debug does not output any log.
                if (Ti.App.deployType === 'production') {
                    swissArmyUtils.eaLog(logStamp + ' ' + message);
                } else {
                    //We use Ti.API.debug in development for clearer console log output
                    Ti.API.debug(logStamp, message);
                }
            }
            if (loggableCategories != Alloy.CFG.loggableCategories) {
                // FIXME: should extract this to a function -or- event
                supportLog(logStamp + ' ' + message);
            }
            if (loggableCategories.indexOf('memory') > -1) {
                var memChange,
                    nowMem = Ti.Platform.availableMemory;
                if (lastMemory > 0) {
                    memChange = lastMemory - nowMem;
                } else {
                    memChange = '---';
                }
                lastMemory = nowMem;
                Ti.API.trace(logStamp, 'Available Mem: ' + nowMem + ' memChange: ' + memChange);
            }
        }
    };

    /**
     * secureLog - function to output log messages for the specified category only if the app is in development or test mode
     *
     * @param {String} text - the text to log
     * @param {String} cat - the category to log for
     * @api public
     * Note: * make sure to change the if condition to (Ti.App.deployType!=='production' && Ti.App.deployType!=='test') if your app is not distributed with a production certificate or is not packaged before distribution
     */
    logging.secureLog = function(text, cat) {
        if (Ti.App.deployType !== 'production') {
            if (cat) {
                logging.log(cat, text);
            } else {
                logging.info(text);
            }
        }
    };

    /**
     * info - function to output log messages for loggingCategory this module was created with
     *
     * @param {String} message - the message to log
     * @api public
     */

    logging.info = function(message) {
        this.log(categoryString, message);
    };

    /**
     * trace - logs a message with a time difference from the last call to trace
     *
     * @param {String} message - the message to log
     * @api public
     */
    logging.trace = function(message) {
        this.log('trace', message);
    };

    /**
     * error - logs an error message to the console
     *
     * @param {String} message - the message to log
     * @api public
     */
    logging.error = function(message) {
        this.log('error', message);
    };

    /**
     * arrayToString - convert array to string
     *
     * @param {Object} arr
     * @api public
     */
    logging.arrayToString = function(arr) {
        var result = '';
        _.each(arr, function(str) {
            result += str + ':';
        });
        return result.substring(0, result.length - 1);
    };

    return logging;
};