// ©2017 salesforce.com, inc. All rights reserved.
/**
 * models/authorizationToken.js - Model definition of authorization token
 *
 * @api public
 */

/**
 * AuthorizationFault - handle faults for authorization failures
 */
var AuthorizationFault = Backbone.Model.extend({
    config : {
        secure : true,
        model_name : 'AuthorizationFault',
        cache : false
    },

    /**
     * isBadLogin - checks if the credentials to log in is wrong or not
     * @return {Boolean}
     */
    isBadLogin : function() {
        return this.has('fault') && this.get('fault').error == 'unauthorized_client';
    },

    /**
     * isEmptyClientCredentials - checks if there is any credentials entered or not
     * @return {Boolean}
     */
    isEmptyClientCredentials : function() {
        return this.has('fault') && this.get('fault').error == 'EmptyClientCredentials';
    }
});

exports.definition = {
    // **config**
    config : {
        model_name : 'authorizationToken',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront'
        }
    },

    // **extendModel**
    extendModel : function(Model) {

        _.extend(Model.prototype, {

            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/EAUtils-GetAuthenticationToken',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * fetchToken - fetch the authorization token from the server if timed out
             * @param {Object} hostname
             * @return {Deferred} promise
             */
            fetchToken : function(hostname) {
                var self = this;
                var now = new Date().getTime();
                var deferred = new _.Deferred();
                // if the token should still be good, don't need to fetch it
                if (self.timeout && now < self.timeout) {
                    deferred.resolve();
                } else {
                    // token has timed out, so get a new one
                    var savePromise = this.save({
                        hostname : hostname
                    });
                    self.clear();
                    savePromise.done(function(model) {
                        var now = new Date().getTime();
                        self.timeout = now + model.get('expires_in') * 1000;
                        deferred.resolve();
                    }).fail(function(fault) {
                        if (fault && fault.has('fault')) {
                            // if the fault is InvalidSession, reset the session so we can get the token
                            if (fault.get('fault').type === 'SessionTimeoutException') {
                                Alloy.Models.associate.loginAssociate({
                                    employee_id : Alloy.Models.associate.getEmployeeId(),
                                    passcode : Alloy.Models.associate.getPasscode()
                                }).done(function() {
                                    self.fetchToken(hostname).done(function() {
                                        deferred.resolve();
                                    });
                                }).fail(function() {
                                    deferred.reject();
                                });
                            } else {
                                var faultModel = new AuthorizationFault();
                                faultModel.set(fault.toJSON());
                                deferred.rejectWith(faultModel, [faultModel]);
                            }
                        } else {
                            deferred.reject();
                        }
                    });
                }
                return deferred.promise();
            },

            /**
             * getToken - get the authorization token
             * @return {String}
             */
            getToken : function() {
                return this.get('access_token');
            },

            /**
             * resetToken - reset the authorization token after logout
             */
            resetToken : function() {
                this.timeout = null;
            }
        });

        return Model;
    }
};
