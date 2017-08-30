// ©2017 salesforce.com, inc. All rights reserved.
/**
 * models/users.js - model definiton of Business Manager users
 *
 * @api public
 */

var logger = require('logging')('models:users', 'app/models/users');

function successFunction(model, resp, options) {
    if (!model.set(model.parse(resp, options), options)) {
        return false;
    }
    model.trigger('change:expiration_days');
}

exports.definition = {
    config : {
        model_name : 'users',
        useDataAPI : true,
        adapter : {
            type : 'ocapi'
        }
    },

    //**extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/users/this',
            ocapiVersion : 'v17_4',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * fetchExpiration - fetch the expiration date of the password of the Business Manager store user
             */
            fetchExpiration : function() {
                var deferred = new _.Deferred();
                var self = this;
                var url = this.urlRoot;

                Alloy.Models.authorizationToken.fetchToken(Alloy.CFG.storefront_host).done(function() {
                    var params = _.extend({}, {
                        url : url,
                        type : 'GET',
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
                    options.success = successFunction;

                    self.apiCall(self, params, options).done(function() {
                        deferred.resolve();
                    }).fail(function(fault) {
                        var message = _L('Unable to obtain store password expiration.');
                        var type = 'UnknownException';
                        if (fault && fault.has('fault')) {
                            type = fault.get('fault').type;
                            switch(type) {
                            case 'UserNotAvailableException':
                                message = _L('The user cannot be found.');
                                break;
                            case 'UserIsLockedException':
                                message = _L('The user is locked.');
                                break;
                            }
                        }
                        deferred.reject({
                            type : type,
                            message : message
                        });
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * updateStorePassword - update the Business Manager store password
             * @param {Object} oldPassword
             * @param {Object} password
             */
            updateStorePassword : function(oldPassword, password) {
                var deferred = new _.Deferred();
                var self = this;
                var url = this.urlRoot + '/password';

                var data = {
                    current_password : oldPassword,
                    password : password
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
                    options.success = successFunction;

                    self.apiCall(self, params, options).done(function() {
                        deferred.resolve();
                    }).fail(function(fault) {
                        var message = _L('Unable to update the store password.');
                        var type = 'UnknownException';
                        if (fault && fault.has('fault')) {
                            type = fault.get('fault').type;
                            switch(type) {
                            case 'PasswordPolicyViolationException':
                                message = _L('The provided new password does not meet the acceptance criteria.');
                                break;
                            case 'PasswordNotValidForReuseException':
                                message = _L('The password was recently used and is not valid for reuse.');
                                break;
                            case 'InvalidPasswordException':
                                message = _L('The current user password is invalid.');
                                break;
                            case 'UserNotAvailableException':
                                message = _L('The user cannot be found.');
                                break;
                            case 'UserIsLockedException':
                                message = _L('The user is locked.');
                                break;
                            }
                        }
                        deferred.reject({
                            type : type,
                            message : message
                        });
                    });
                }).fail(function() {
                    deferred.reject();
                });
                return deferred.promise();
            },

            /**
             * getStoreUsername  - get the username of the store
             */
            getStoreUsername : function() {
                return this.get('login');
            },

            /**
             * getExpirationDate - get the number of days till password expires
             */
            getExpirationDays : function() {
                var days = -1;
                var expString = this.get('password_expiration_date');
                if (expString) {
                    var today = new Date();
                    var msec = Date.parse(expString);
                    var expDate = new Date(msec);
                    var timeDiff = Math.abs(expDate.getTime() - today.getTime());
                    days = Math.ceil(timeDiff / (1000 * 3600 * 24));
                }
                return days;
            }
        });

        return Model;
    }
};

if(Alloy.UNIT_TEST){
    exports.successFunction = successFunction;
}
