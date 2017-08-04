// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/customerOrderHistory.js - model definition of customer order history
 *
 * @api public
 */

var order = Backbone.Model.extend({
    config : {
        secure : true,
        model_name : 'order',
        cache : false
    }
});

exports.definition = {
    config : {
        model_name : 'customerOrderHistory',
        secure : true,
        cache : false,
        adapter : {
            type : 'storefront',
            collection_name : 'customerOrderHistory'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            urlRoot : '/EAOrder-OrderDetails',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * getImageURL - returns image URL of the order
             * @return {String}
             */
            getImageURL : function() {
                return this.get('imageURL');
            },

            /**
             * getOrderNo - returns the order number
             * @return {String}
             */
            getOrderNo : function() {
                return this.get('orderNo');
            },

            /**
             * getCurrencyCode - returns the currency code
             * @return {String}
             */
            getCurrencyCode : function() {
                return this.get('currencyCode');
            },

            /**
             * getCreationDate - returns the creation date of the order
             * @return {Date}
             */
            getCreationDate : function() {
                return this.get('creationDate');
            },

            /**
             * getTotalNetPrice - returns the total net price of the order
             * @return {Integer}
             */
            getTotalNetPrice : function() {
                return this.get('totalNetPrice');
            },

            /**
             * getConfirmationStatus - returns the confirmation status
             * @return {String}
             */
            getConfirmationStatus : function() {
                return this.get('confirmation_status');
            },

            /**
             * getStatus - get the status of the order
             * @return {String}
             */
            getStatus : function() {
                return this.get('status');
            },

            /**
             * isStatusCompleted - see if the status is not failed and not created
             * @return {Boolean}
             */
            isStatusCompleted : function() {
                var status = this.getStatus();
                return status && status !== 'failed' && status !== 'created';
            }
        });
        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            //----------------------------------------
            // ## VARIABLES

            url : '/EAOrder-OrderHistory',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * queryParams - return query params
             * @return {Object} requestParams
             */
            queryParams : function() {
                return this.requestParams;
            },

            /**
             * getModels - return models in this collection
             * @return {Array} models
             */
            getModels : function() {
                return this.models;
            },

            /**
             * search - request order search
             * @param {Object} params - query needed to perform search, eg: customer email
             * @return {Deferred} promise
             */
            search : function(params) {
                var self = this;
                self.requestParams = params;
                var promise = self.fetch();
                promise.always(function() {
                    self.requestParams = {};
                });
                return promise;
            },

            /**
             * parse - parse the response to the model
             * @param {Object} in_json
             */
            parse : function(in_json) {
                if ('orders' in in_json) {
                    return in_json.orders;
                }
                return [];
            }
        });
        return Collection;
    }
};
