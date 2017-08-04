// ©2017 salesforce.com, inc. All rights reserved.
/**
 * models/customObjects.js - model definiton of custom objects
 *
 * @api public
 */

var logger = require('logging')('models:customObjects', 'app/models/customObjects');

/**
 * getURL - obtain the URL to use for the OCAPI request
 *
 * @param objectName - the name of the custom object
 * @aparm organizationObject - true if this custom object has a scope of Organization
 * @retun {String} url
 */
function getURL(objectName, organizationObject) {
    var url = '/custom_objects/';
    if (!organizationObject) {
        // pull site name from ocapi site_url
        var site_url = Alloy.CFG.ocapi.site_url;
        var site_name = site_url.substr(site_url.lastIndexOf('/') + 1);
        url = '/sites/' + site_name + url;
    }
    url = url + objectName + '/' + Alloy.CFG.store_id;
    return url;
}

exports.definition = {
    config : {
        model_name : 'customObjects',
        useDataAPI : true,
        adapter : {
            type : 'ocapi'
        }
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## FUNCTIONS

            /**
             * updateStorePasswords - updates the storeCredentials custom object with the new password for the given username
             * @param {Object} username
             * @param {Object} password
             */
            updateStorePasswords : function(username, password) {
                var deferred = new _.Deferred();
                var self = this;

                var url = getURL('storeCredentials', Alloy.CFG.organization_custom_object_types);

                var data = {
                    c_eaStoreUsername : username,
                    c_eaStorePassword : password
                };
                data = JSON.stringify(data);
                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'PATCH',
                        data : data,
                        headers : {
                            'content-type' : 'application/json',
                            Authorization : 'Bearer ' + Alloy.Models.authorizationToken.getToken()
                        }
                    });
                    var options = _.extend({}, {
                        wait : true,
                        cache : false,
                        dontincludeid : true,
                        error : function() {
                        }
                    }, options);
                    options.success = function(model, params, o) {
                    };

                    self.apiCall(self, params, options).done(function() {
                        deferred.resolve();
                    }).fail(function(fault) {
                        var message = _L('Unable to update the store password.');
                        var type = 'UnknownException';
                        if (fault && fault.has('fault')) {
                            type = fault.get('fault').type;
                            message = fault.get('fault').message;
                        }
                        // if we couldn't find the object then it might be a different object type scope, so try again
                        if (type === 'CustomObjectNotFoundException') {
                            // flip the switch and make the request again
                            Alloy.CFG.organization_custom_object_types = !Alloy.CFG.organization_custom_object_types;
                            params.url = getURL('storeCredentials', Alloy.CFG.organization_custom_object_types);
                            self.apiCall(self, params, options).done(function() {
                                deferred.resolve();
                                logger.error('organization_custom_object_types is set wrong and should be set to the opposite value.');
                            }).fail(function(fault) {
                                if (fault && fault.has('fault')) {
                                    type = fault.get('fault').type;
                                    message = fault.get('fault').message;
                                }
                                deferred.reject({
                                    type : type,
                                    message : message
                                });
                            });
                        } else {
                            deferred.reject({
                                type : type,
                                message : message
                            });
                        }
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            }
        });

        return Model;
    }
};
