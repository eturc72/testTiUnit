// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/alloy/sync/ocapi.js - methods associated with reading data from OCAPI
 */

//----------------------------------------------
// ## VARIABLES

var localCache = require('localCache');
var eaUtils = require('EAUtils');
var logger = require('logging')('ocapi', 'app/assets/alloy/sync/ocapi');

//---------------------------------------------------
// ## PUBLIC API

module.exports.sync = Sync;
module.exports.beforeModelCreate = beforeModelCreate;
module.exports.afterModelCreate = afterModelCreate;

//---------------------------------------------------
// ## APP LISTENERS

Alloy.eventDispatcher.listenTo(Alloy.eventDispatcher, 'cache:flush', function() {
    localCache.resetCache();
    notify(_L('Application Cache Cleared'));
});

/**
 * InitAdapter - initializes this adapter
 *
 * @param {object} config config object
 * @return {} ?
 * @api private
 */
function InitAdapter(config) {
    if (Alloy.CFG.ocapi.enable_proxy_cache) {
        localCache.initialize();
    }

    return {};
}

/**
 * apiCall - calls the API associated with the model
 *
 * @param {object} model the model to call
 * @param {list} params
 * @param {list} options
 * @return {Deferred} promise
 * @api public
 */
function apiCall(model, params, options) {
    logger.info('apiCall for model: ' + model.config.model_name);

    // Caching can be turned off explicitly for a single call
    var cache = 'cache' in options ? options.cache : true;

    var deferred = 'deferred' in options ? options.deferred : new _.Deferred();

    var url = params.url;

    var retryCount = 'retryCount' in options ? options.retryCount : Alloy.CFG.server_retries;

    var scheme = model.config.secure ? 'https' : 'https';
    // Pre-pend relative URLs with host name from config

    var storefront_host = Alloy.CFG.storefront_host;

    var site_url = model.config.useDataAPI ? Alloy.CFG.ocapi.data_site_url : Alloy.CFG.ocapi.site_url;
    var base_url = model.config.useDataAPI ? Alloy.CFG.ocapi.data_base_url : Alloy.CFG.ocapi.base_url;
    var version;
    if (options.version) {
        version = options.version;
    } else if (model.ocapiVersion) {
        version = model.ocapiVersion;
    } else {
        version = Alloy.CFG.ocapi.version;
    }

    base_url += version;

    var client_id = Alloy.CFG.ocapi.client_id;
    var default_locale = Alloy.CFG.ocapi.default_locale;

    var start,
        end;

    if (url.indexOf(scheme) < 0) {
        url = scheme + '://' + storefront_host + site_url + base_url + url;
    }

    if (!options.dontincludeid) {
        url = eaUtils.appendURL(url, 'client_id', client_id);
    }

    url = eaUtils.appendURL(url, 'locale', default_locale);
    url = eaUtils.appendURL(url, 'currency', options.currency ? options.currency : Alloy.CFG.appCurrency);
    url = eaUtils.appendURL(url, 'country', options.country ? options.country : Alloy.CFG.countrySelected);
    url = eaUtils.appendURL(url, 'c_endlessaisle', true);

    if (model.queryParams) {
        var query_params = model.queryParams();
        for (var x in query_params ) {
            url = eaUtils.appendURL(url, x, query_params[x]);
        }
    }
    params.headers = params.headers || {};
    var type = params.type;
    // some commerce cloud PIGS with 2FA can only handle POST requests, so this is a way to
    // override those
    if (type === 'PUT' || type === 'DELETE' || type === 'PATCH') {
        params.type = 'POST';
        params.headers['x-dw-http-method-override'] = type;
    }

    var collection_match_info = localCache.getPrecachedModels(url);
    var collection_matches,
        collection_misses,
        collection_ids;

    var isCollection = !!collection_match_info;
    if (isCollection) {
        collection_matches = collection_match_info.matches;
        collection_misses = collection_match_info.misses;
        collection_ids = collection_match_info.ids;

        if (collection_misses) {
            url = collection_match_info.missedUrl;
        }
    }

    var urlHash,
        checksum,
        json_response,
        expiry = 0,
        now = new Date().getTime(),
        contentLength,
        frequency = 0,
        version = 0;

    // Check local store for cached copy
    cache = 'cache' in options ? options.cache : false || model.config.cache;

    start = new Date().getTime();
    end = 0;

    if (!isCollection && cache && !model.config.secure && Alloy.CFG.ocapi.enable_proxy_cache) {
        logger.info('checking for local objects in proxy cache: ' + model.config.model_name + ' ' + url);

        var match = localCache.getPrecachedModel(url);
        if (match) {
            urlHash = match.urlHash;
            json_response = match.json_response;
            expiry = match.expiry;
            frequency = match.frequency;
            version = match.version;
            checksum = match.checksum;
        } else {
            urlHash = Ti.Utils.sha256(url);
        }

    } else if (isCollection && !collection_misses) {
        var json_responses = _.map(collection_matches, function(response) {
            return response.json_response;
        });
        json_response = '[' + json_responses.join(',') + ']';

        logger.info('collection fully served from local proxy!');
        // skip
        expiry = start + 1;
    }

    if (!cache || parseInt(expiry) < start) {

        if (!Ti.Network.online) {
            notify(_L('Network is unavailable'), {
                preventAutoClose : true
            });

            return deferred.reject();
        }

        // Or if secure ... or if not enabled globally ... or
        var networkCachingEnabled = cache && !model.config.secure && Alloy.CFG.ocapi.enable_http_cache;
        var xhr = Ti.Network.createHTTPClient({
            timeout : model.config.timeout || Alloy.CFG.ocapi.timeout,
            cache : networkCachingEnabled,
            // Specifies whether or not to validate the secure certificate (will always be true for production environments).
            validatesSecureCertificate : model.config.validate_secure_cert || Alloy.CFG.ocapi.validate_secure_cert
        });

        logger.info('opening ' + params.type + ' connection: ' + url + ' caching: ' + networkCachingEnabled);

        //Prepare the request
        logger.trace('ocapi before open ' + url);
        logger.log('request', 'ocapi request \nmodel: ' + model.config.model_name + '\ntype: ' + params.type + '\nurl: ' + url);
        xhr.open(params.type, url);
        xhr.onload = function(eResp) {
            logger.trace('ocapi onload start ' + url);
            if (cache) {
                var newChecksum = Ti.Utils.sha256(xhr.responseText);
                if (checksum && newChecksum == checksum) {
                    // Don't bother doing anything else, just update frequency and return
                    logger.info('http call returned with no changes ... aborting call');

                    // Mark Model as 'touched'
                    localCache.touchPrecachedModel(url);
                    logger.trace('ocapi onload end NOCHANGE ' + model.config.model_name + ' ' + url);
                    return;
                } else {
                    logger.info('difference detected in checksum ... updating data for next time');
                    logger.info('proxy caching object: ' + model.config.model_name + ' ' + url);
                    logger.secureLog('response:\n' + xhr.responseText, 'ocapi-response');
                    var cacheHeader = this.getResponseHeader('Cache-Control');
                    var expiryTime = /max-age=([0-9]+),/.exec(cacheHeader);
                    if (expiryTime) {
                        logger.info('Cache-Time: ' + expiryTime[1]);
                    }

                    if (isCollection) {
                        localCache.updatePrecachedModels(url, model, {
                            json_response : xhr.responseText,
                            expiry : expiryTime
                        });
                    } else {
                        localCache.updatePrecachedModel(url, model, {
                            json_response : xhr.responseText,
                            expiry : expiry,
                            frequency : parseInt(frequency) + 1,
                            version : parseInt(version) + 1,
                            checksum : newChecksum,
                            urlHash : urlHash
                        });
                    }
                }
            }

            var etag = xhr.getResponseHeader('ETag');
            if (etag) {
                model.etag = etag;
            }
            var authorizationToken = xhr.getResponseHeader('Authorization');
            if (authorizationToken) {
                model.authorizationToken = authorizationToken;
            }
            // Scrub all request data
            var response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            logger.secureLog('ocapi model: ' + model.config.model_name + ' response:\n ' + JSON.stringify(response, null, 2), 'request-response');
            if ('save' in model) {
                // model is a model
                model.clear({
                    silent : true
                });
            } else {
                if (collection_matches && collection_matches.length > 0) {
                    logger.info('recombining cached & uncached collections: ');
                    var json_responses = _.map(collection_matches, function(response) {
                        return response.json_response;
                    });
                    json_response = '[' + json_responses.join(',') + ']';
                    response = localCache.recombineCollection(collection_ids, JSON.parse(json_response), response.data);
                } else {
                    response = response.data;
                }
                // model is a collection
                //model.reset(response, options);
            }

            logger.trace('before success');
            if (options.success.length > 1) {
                options.success(model, response, options);
            } else {
                options.success(response);
            }
            logger.trace('after success');

            // If we return right away, then the deferred will be returned before
            //  the calling function returns
            deferred.resolveWith(model, [model, params, options]);
            logger.trace('ocapi onload end ' + model.config.model_name + ' ' + url);
        };

        //Handle error
        xhr.onerror = function(eResp) {
            logger.trace('ocapi onerror');
            logger.error('request error!\n url: ' + url + '\n status: [' + xhr.status + ']\n response: [' + xhr.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');

            // check to see if the failure code is one of the retry failure codes configured in BM so that we can
            // retry the request
            var retryFailure = null;
            // The request may be before we get the retry_error_codes config from the server
            if (Alloy.CFG.retry_error_codes) {
                retryFailure = Alloy.CFG.retry_error_codes.indexOf(eResp.code.toString()) > -1;
            }

            if (xhr.status == 502) {
                logger.info('Retrying because of 502 Proxy Error');
                options.deferred = deferred;
                apiCall(model, params, options);
            } else if (retryFailure && retryCount > 0 && params.type === 'GET') {
                // Retry the request for specific failure types and only for GET requests.
                // Session timeout failures could be for either server or network failures
                // and we don't want to update multiple times.
                logger.info('Retrying because of timeout - retryCount: ' + retryCount);
                retryCount--;
                options.deferred = deferred;
                options.retryCount = retryCount;
                apiCall(model, params, options);
            } else {
                options.error(xhr);

                var responseText = xhr.responseText || '{}';
                var response = {};
                var parseError = false;
                var message = 'An error during OCAPI request has occurred.' + '\n\nURL: ' + url + '\n\nStatus: ' + xhr.status + '\n\nModel: ' + model.config.model_name;
                try {
                    response = JSON.parse(responseText);
                } catch(ex) {
                    if (ex && ex.message) {
                        message += '\n\nParse Exception: ' + ex.message;
                    }
                    parseError = true;
                }

                // if the error occurred because of a bad OAuth token (e.g. because of a timeout), fetch one again and then reissue the original request
                if (response.fault && response.fault.type === 'InvalidAccessTokenException') {
                    Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                        params.headers.Authorization = 'Bearer ' + Alloy.Models.authorizationToken.getToken();
                        options = _.extend({}, {
                            deferred : deferred
                        }, options);
                        apiCall(model, params, options);
                    });
                } else {
                    try {
                        model.set(response, {
                            silent : true
                        });
                    } catch (ex) {
                        if (ex && ex.message) {
                            message += '\n\nParse Exception: ' + ex.message;
                        }
                        parseError = true;
                    }
                    if (eResp) {
                        message += '\n\nResponse: ' + JSON.stringify(eResp, null, 4);
                    }
                    message += '\n\nText: ';
                    message += parseError ? responseText : JSON.stringify(response, null, 4);
                    message += '\n';

                    deferred.rejectWith(model, [model, params, options]);

                    // only send an email if the config says to
                    var code = '';
                    if (response.fault) {
                        code = response.fault.arguments ? response.fault.arguments.statusCode : response.fault.type;
                    }
                    if (Alloy.CFG.error_reporting.ocapi_error_reporting && Alloy.CFG.error_reporting.email_ignore.indexOf(code) < 0) {
                        eaUtils.sendErrorToServer(message);
                    }
                }

                if (xhr.status >= 500 || retryFailure) {
                    notify(_L('Server call failed. Please try again.'), {
                        preventAutoClose : true
                    });
                }
            }
        };

        params.headers['Content-Type'] = params.headers['Content-Type'] || 'application/json';

        for (var header in params.headers) {
            xhr.setRequestHeader(header, params.headers[header]);
        }

        // Support for built-in query string as part of URL

        logger.trace('before xhr send()');
        start = new Date().getTime();

        if (params.data) {
            logger.secureLog('ocapi model: ' + model.config.model_name + ' sending:\n ' + JSON.stringify(JSON.parse(params.data), null, 2), 'request-response');
        }
        xhr.send(params.data);
    }

    if (cache && json_response) {
        var response = null;
        try {
            response = JSON.parse(json_response);
        } catch(ex) {
            logger.secureLog('failed to parse proxied object: ' + json_response);
        }
        logger.secureLog('returning proxy cached object.\nmodel: ' + model.config.model_name + '\nurl: ' + url + '\nresponse: ' + JSON.stringify(response, null, 2));
        if (isModel(model)) {
            // model is a model
            model.clear({
                silent : true
            });
        } else {
            // model is a collection
            logger.secureLog('updating coll response:\n ' + JSON.stringify(response));
        }

        logger.trace('before CACHE success ' + model.config.model_name + ' ' + url);
        if (options.success.length > 1) {
            options.success(model, response, options);
        } else {
            options.success(response);
        }
        logger.trace('after CACHE success ' + model.config.model_name + ' ' + url);

        deferred.resolveWith(model, [model, params, options]);
    }

    Alloy.eventDispatcher.trigger('session:renew');

    return deferred.promise();
}

/**
 * Sync - executes Backbone's CRUD+Patch updates
 *
 * @param {object} method
 * @param {object} model
 * @param {object} opts
 * @return {Deferred} promise
 * @api public
 */
function Sync(method, model, options) {
    var xhr;

    var methodMap = {
        create : 'POST',
        read : 'GET',
        update : 'PUT',
        patch : 'PATCH',
        delete : 'DELETE'
    };

    var type = methodMap[method];

    _.defaults(options || ( options = {}), {
        emulateHTTP : Backbone.emulateHTTP,
        emulateJSON : Backbone.emulateJSON
    });

    var params = {
        type : type,
        dataType : 'json',
        contentType : 'application/json'
    };

    var deferred = null;

    //set default headers
    params.headers = params.headers || {};

    // Check for ETAG
    if (model.etag) {
        params.headers['If-Match'] = model.etag;
    }
    if (model.authorization) {
        params.headers['Authorization'] = model.authorization;
    }

    // We need to ensure that we have a base url.
    if (!params.url) {
        params.url = _.result(model, 'url');
        if (!params.url) {
            logger.info('[CATALOG API] ERROR: NO BASE URL');
            return;
        }
    }

    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
        params.contentType = 'application/json';
        params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
        params.contentType = 'application/x-www-form-urlencoded';
        params.data = params.data ? {
            model : params.data
        } : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
        params.type = 'POST';
        if (options.emulateJSON) {
            params.data._method = type;
        }
        var beforeSend = options.beforeSend;
        options.beforeSend = function(xhr) {
            xhr.setRequestHeader('X-HTTP-Method-Override', type);
            if (beforeSend) {
                return beforeSend.apply(this, arguments);
            }
        };
    }

    if (params.type !== 'GET' && !options.emulateJSON) {
        params.processData = false;
    }

    var success = options.success;
    options.success = function(resp) {
        if (success.length > 1) {
            success(model, resp, options);
        } else {
            success(resp);
        }
        model.trigger('sync', model, resp, options);
    };

    var error = options.error;
    options.error = function(xhr) {
        if (error) {
            error(model, xhr, options);
        }
        model.trigger('error', model, xhr, options);
    };

    deferred = apiCall(model, params, options);

    model.trigger('request', model, xhr, options);

    return deferred.promise();
}

/**
 * beforeModelCreate - before model is created setup adapter
 *
 * @param {Object} config
 * @api public
 */
function beforeModelCreate(config) {
    config = config || {};
    InitAdapter(config);
    return config;
}

/**
 * afterModelCreate - after model is created setup functions
 *
 * @param {Object} Model
 * @api public
 */
function afterModelCreate(Model) {
    Model = Model || {};
    Model.prototype.apiCall = apiCall;
    Model.prototype.config.Model = Model;
    return Model;
}

/**
 * isModel - determine if is a backbone model
 * @param {Object} model
 * @api private
 */
function isModel(model) {
    return 'save' in model;
}

/**
 * isCollection - determing if a backbone collection
 * @param {Object} model
 * @api private
 */
function isCollection(model) {
    return !isModel(model);
}
