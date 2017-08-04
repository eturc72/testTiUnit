// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/alloy/sync/storefront.js - methods associated with reading data from the Storefront API
 * (those server routines which provide data not covered by OCAPI)
 */

//----------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('storefront', 'app/assets/alloy/sync/storefront');

//---------------------------------------------------
// ## PUBLIC API

module.exports.sync = Sync;
module.exports.afterModelCreate = afterModelCreate;
module.exports.beforeModelCreate = beforeModelCreate;

/**
 * InitAdapter - initializes this adapter
 *
 * @param {Object} config config object
 * @return {} ?
 * @api public
 */
function InitAdapter(config) {
    return {};
}

/**
 * apiCall - calls the API associated with the model
 *
 * @param {Object} model the model to call
 * @param {Object} params
 * @param {Object} options
 * @return {Deferred} promise
 * @api public
 */
function apiCall(model, params, options) {
    logger.info('apiCall for model: ' + model.config.model_name);

    var deferred = 'deferred' in options ? options.deferred : new _.Deferred();

    var url = params.url;

    var retryCount = 'retryCount' in options ? options.retryCount : Alloy.CFG.server_retries;

    var scheme = (model.config && model.config.secure) ? 'https' : 'https';
    // Pre-pend relative URLs with host name from config
    if (url.indexOf(scheme) < 0) {
        url = eaUtils.buildStorefrontURL(scheme, url);
    }

    if (model.queryParams || options.attrs) {

        var delimiter = ~url.indexOf('?') ? '&' : '?';
        var paramsList = [],
            query_params = model.queryParams() || options.attrs;

        var x;

        for (var x in query_params ) {
            paramsList.push(x + '=' + encodeURIComponent(query_params[x]));
        }

        url += delimiter + paramsList.join('&');
    }

    logger.info('opening ' + params.type + ' connection: ' + url);

    if (!Ti.Network.online) {
        notify(_L('Network is unavailable'), {
            preventAutoClose : true
        });

        return deferred.reject();
    }

    var xhr = Ti.Network.createHTTPClient({
        timeout : (model.config && model.config.timeout) || Alloy.CFG.storefront.timeout,
        cache : !(model.config && model.config.secure) && Alloy.CFG.storefront.enable_http_cache,
        // Specifies whether or not to validate the secure certificate (will always be true for production environments).
        validatesSecureCertificate : (model.config && model.config.validate_secure_cert) || Alloy.CFG.storefront.validate_secure_cert
    });

    logger.trace('storefront before open ' + url);

    //Prepare the request
    logger.log('request', 'storefront request \nmodel: ' + model.config.model_name + '\ntype: ' + params.type + '\nurl: ' + url);
    xhr.open(params.type, url);

    xhr.onload = function(eResp) {
        logger.trace('storefront onload start ' + url);
        // Cache ETag on the Model object
        var etag = xhr.getResponseHeader('ETag');
        if (etag) {
            model.etag = etag;
        }

        var response = null;

        try {
            response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch(ex) {
            // invalid response, force an error to occur in the app and sent to user
            response = {
                httpStatus : 500
            };
        }
        logger.secureLog('storefront response \nmodel: ' + model.config.model_name + ' response: ' + JSON.stringify(response, null, 2), 'request-response');
        // The true status from the storefront response is in the reponse and not the xhr.status,
        // which if the pipeline exits will return 200
        if (response.httpStatus && response.httpStatus >= 500) {
            xhr.alt_status = response.httpStatus;
            xhr.onerror(eResp);
            return;
        }

        if ('save' in model) {
            // model is a model
            model.clear({
                silent : true
            });
            model.set(response, options);
        } else {
            // model is a collection
            model.reset(response, options);
        }

        if (response.httpStatus && response.httpStatus >= 300 && response.httpStatus < 500) {
            xhr.alt_status = response.httpStatus;
            xhr.onerror(eResp);
            return;
        }

        options.success(response);

        deferred.resolveWith(model, [model, params, options]);
        logger.trace('storefront onload end ' + url);
    };

    //Handle error
    xhr.onerror = function(eResp) {
        logger.trace('storefront onerror');
        logger.error('request error!\n url: ' + url + '\n status: [' + xhr.status + ']\n response: [' + xhr.responseText + ']\n exception: [' + JSON.stringify(eResp, null, 2) + ']');

        var status = xhr.alt_status || xhr.status;

        // check to see if the failure code is one of the retry failure codes configured in BM so that we can
        // retry the request
        var retryFailure = null;
        // The request may be before we get the retry_error_codes config from the server
        if (Alloy.CFG.retry_error_codes) {
            retryFailure = Alloy.CFG.retry_error_codes.indexOf(eResp.code.toString()) > -1;
        }

        if (status == 502) {
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
            var message = 'An error during storefront request has occurred.' + '\n\nURL: ' + url + '\n\nStatus: ' + xhr.status + '\n\nModel: ' + model.config.model_name;

            try {
                response = JSON.parse(responseText);
                if ('save' in model) {
                    // model is a model
                    model.clear({
                        silent : true
                    });
                    model.set(response, options);
                } else {
                    // model is a collection
                    model.reset(response, options);
                }
            } catch(ex) {
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

            deferred.rejectWith(model, [model, params, options, response]);

            // only send an email if the config says to
            var code = response.fault ? response.fault.type : '';
            // this could be a startup request and we don't have Alloy.CFG.error_reporting loaded from the BM yet
            if (Alloy.CFG.error_reporting && Alloy.CFG.error_reporting.storefront_error_reporting && Alloy.CFG.error_reporting.email_ignore.indexOf(code) < 0) {
                eaUtils.sendErrorToServer(message);
            }

            if (status >= 500 || retryFailure) {
                notify(_L('Server call failed. Please try again.'), {
                    preventAutoClose : true
                });
            }
        }
    };

    params.headers = params.headers || {};
    params.headers['Content-Type'] = params.headers['Content-Type'] || 'application/json';

    for (var header in params.headers) {
        xhr.setRequestHeader(header, params.headers[header]);
    }

    // Support for built-in query string as part of URL
    if (params.data) {
        logger.secureLog('storefront \nmodel: ' + model.config.model_name + ' sending: ' + JSON.stringify(JSON.parse(params.data), null, 2), 'request-response');
    }

    xhr.send(params.data);

    Alloy.eventDispatcher.trigger('session:renew');

    return deferred.promise();
}

/**
 * Sync - executes Backbone's CRUD+Patch updates
 *
 * @param {Object} method
 * @param {Object} model
 * @param {Object} options
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

    params.headers['Content-Type'] = params.contentType;

    // Check for ETAG
    if (model.etag) {
        params.headers['If-Modified'] = model.etag;
    }

    // We need to ensure that we have a base url.
    if (!params.url) {
        params.url = _.result(model, 'url');
        if (!params.url) {
            logger.error('[STOREFRONT API] ERROR: NO BASE URL');
            return;
        }
    }

    if (model && (method === 'create' || method === 'update' || method === 'patch')) {
        params.contentType = 'application/json';
        if (!params.data) {
            params.data = JSON.stringify(options.attrs || model.toJSON(options));
        }
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
        if (success) {
            if (success.length > 1) {
                success(model, resp, options);
            } else {
                success(resp);
            }
        }
        model.trigger('sync', model, resp, options);
    };

    var error = options.error;
    options.error = function(xhr) {
        if (error) {
            logger.error(model, xhr, options);
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
