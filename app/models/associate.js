// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/associate.js - model definition of store associate
 *
 * @api public
 */
var validateDevices = require('Validations').validateDevices;

var StorefrontHelperSecure = require('dw/instore/StorefrontHelperSecure');

var AssociateGetPermissions = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-GetPermissions'
});

var AssociateSetDataOnNewSession = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-SetDataOnNewSession'
});

var AssociateChangePassword = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-ChangePassword'
});

var ValidateAssociateExists = StorefrontHelperSecure.extend({
    urlRoot : '/EAAccount-ValidateAssociateExists'
});

exports.definition = {
    // **config**
    config : {
        model_name : 'associate',
        secure : true,
        adapter : {
            type : 'storefront'
        }
    },

    // **extendModel**
    extendModel : function(Model) {
        _.extend(Model.prototype, {

            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/EAAccount-AgentLogin',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * initialize - initilize the model
             */
            initialize : function() {
                this._isLoggedIn = false;
            },

            /**
             * clear - clears the model
             */
            clear : function(options) {
                this._isLoggedIn = false;
                Backbone.Model.prototype.clear.call(this, options);
            },

            /**
             * isLoggedIn - check if the associate is Logged in
             * @param {Object} new_value
             * @return {Boolean} is logged in
             */
            isLoggedIn : function(new_value) {
                if (this._isLoggedIn != new_value && (new_value === true || new_value === false)) {
                    this._isLoggedIn = new_value;
                    // FIXME: should add change notification
                }

                return this._isLoggedIn;
            },

            /**
             * loginAssociate - logins the associate
             * @param {Object} login_info
             * @param {Object} options
             * @return {Deferred} promise
             */
            loginAssociate : function(login_info, options) {
                var deferred = new _.Deferred();
                var self = this;
                validateDevices().done(function() {
                    login_info = _.extend({}, login_info);
                    options = _.extend({}, {
                        silent : true,
                        wait : true
                    }, options);

                    self.clear({
                        silent : true
                    });

                    // Send POST
                    self.save(login_info, options).always(function() {
                        // Check response ...
                        self._isLoggedIn = ('get' in this) ? this.get('httpStatus') === 200 : false;
                    }).done(function() {
                        var sessionData = {
                            employeeId : this.get('employee_id'),
                            passcode : login_info.passcode,
                            storeId : Alloy.CFG.store_id.toString(),
                            appCurrency : Alloy.CFG.appCurrency,
                            country : Alloy.CFG.country
                        };
                        this.setDataOnNewSession(sessionData).done(function() {
                            deferred.resolve();
                        }).fail(function(model) {
                            deferred.reject(model);
                        });
                    }).fail(function(model) {
                        deferred.reject(model);
                    });
                }).fail(function(data) {
                    deferred.reject(data);
                });
                return deferred.promise();
            },

            /**
             * logout - logs out the associate
             * @param {Object} options
             * @return {Deferred} promise
             */
            logout : function(options) {
                var self = this;

                // Sub-resource
                AgentLogout = Backbone.Model.extend({
                    config : {
                        secure : true,
                        model_name : 'agentLogout'
                    }
                }, {});
                var agentLogout = new AgentLogout();

                // Get base URL & client id for free ...
                var url = this.url().replace('Login', 'Logout');

                // Pass along success & error handlers, etc., with no-ops by default
                var params = _.extend({}, {
                    url : url,
                    type : 'POST'
                });
                options = _.extend({}, {
                    wait : true,
                    cache : false,
                    success : function() {
                    },
                    error : function() {
                    }
                }, options);

                // Same product should be same as addProduct ... but with Deferred mixed in ...
                var logoutPromise = this.apiCall(agentLogout, params, options);

                // Deferreds execute in guaranteed order, so this will execute first
                logoutPromise.done(function() {
                    self.isLoggedIn(false);
                    self.clear();
                    // Make sure the oauth token is fetched for next login as the store and store BM user could have changed
                    Alloy.Models.authorizationToken.resetToken();
                });
                return logoutPromise;
            },

            /**
             * setDataOnNewSession - It sets the associate data on a newly created session
             * which is caused by associate login
             *
             * @param {Object} login_info
             * @param {Object} options
             */
            setDataOnNewSession : function(login_info, options) {
                var setData = new AssociateSetDataOnNewSession();
                return setData.save(login_info, options);
            },

            /**
             * fetchPermissions - fetches the permissions for an associate
             * @param {Object} login_info
             * @param {Object} options
             * @return {Deferred} promise
             */
            fetchPermissions : function(login_info, options) {
                var permissions = new AssociateGetPermissions();
                var self = this;
                return permissions.save(login_info, options).done(function(model) {
                    self.set(model.toJSON(), {
                        silent : true
                    });
                    self.set(login_info, {
                        silent : true
                    });
                });
            },

            /**
             * changePassword - change the password for the associate
             * @param {Object} new_password_info
             * @param {Object} options
             * @return {Deferred} promise
             */
            changePassword : function(new_password_info, options) {
                var deferred = new _.Deferred();
                var changePassword = new AssociateChangePassword();
                var self = this;
                changePassword.save(new_password_info, options).done(function(model) {
                    self.set(model.toJSON(), {
                        silent : true
                    });
                    deferred.resolve(model);
                }).fail(function(model) {
                    deferred.reject(model);
                });
                return deferred.promise();
            },

            /**
             * validateAssociateExists - check if the associate exists or not
             * @param {Object} info
             * @param {Object} options
             * @return {Deferred} promise
             */
            validateAssociateExists : function(info, options) {
                var deferred = new _.Deferred();
                var validateAssociateExists = new ValidateAssociateExists();
                var self = this;
                validateAssociateExists.save(info, options).done(function(model) {
                    self.set(model.toJSON(), {
                        silent : true
                    });
                    deferred.resolve(model);
                }).fail(function(model) {
                    deferred.reject(model);
                });
                return deferred.promise();
            },

            /**
             * getEmployeeId - get the employee id
             * @return {String}
             */
            getEmployeeId : function() {
                return this.get('employee_id');
            },

            /**
             * getPasscode - get the password
             * @return {String}
             */
            getPasscode : function() {
                return this.get('passcode');
            },

            /**
             * getAssociateInfo -  get the associate information
             * @return {String}
             */
            getAssociateInfo : function() {
                return this.get('associateInfo');
            },

            /**
             * getFirstName -  get the first name
             * @return {String}
             */
            getFirstName : function() {
                var info = this.getAssociateInfo() || {};
                return info.firstName;
            },

            /**
             * getLastName -  get the last name
             * @return {String}
             */
            getLastName : function() {
                var info = this.getAssociateInfo() || {};
                return info.lastName;
            },

            /**
             * getFullName -  get the full name
             * @return {String}
             */
            getFullName : function() {
                var info = this.getAssociateInfo() || {};
                return info.firstName + ' ' + info.lastName;
            },

            /**
             * hasPermissions -  checks if the associate has permissions
             * @return {Boolean}
             */
            hasPermissions : function() {
                return !!this.get('permissions');
            },

            /**
             * getPermissions -  get the associate's permission
             * @return {String}
             */
            getPermissions : function() {
                return this.get('permissions');
            },

            /**
             * canDoManagerOverrides -  check if the manager can do overrides
             * @return {Boolean}
             */
            canDoManagerOverrides : function() {
                return this.has('permissions') && this.getPermissions().allowManagerOverrides;
            },

            /**
             * hasAdminPrivileges -  check if the associate has admin priveleges
             * @return {Boolean}
             */
            hasAdminPrivileges : function() {
                return this.has('permissions') && this.getPermissions().allowAdmin;
            },

            /**
             * hasStoreLevelSalesReportsPrivileges -  check if the associate has
             * access to store level sales reports
             * @return {Boolean}
             */
            hasStoreLevelSalesReportsPrivileges : function() {
                return this.has('permissions') && this.getPermissions().accessStoreLevelSalesReports;
            },

            /**
             * hasSalesReportsPrivileges -  check if the associate has
             * access to sales reports
             * @return {Boolean}
             */
            hasSalesReportsPrivileges : function() {
                return this.has('permissions') && this.getPermissions().accessSalesReports;
            }
        });

        return Model;
    }
};

