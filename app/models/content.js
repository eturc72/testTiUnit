// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/content.js - model definition of content
 */

// Recommendation itself
exports.definition = {
    config : {
        model_name : 'content',
        secure : true,
        cache : false,
        adapter : {
            type : 'ocapi'
        }
    },
    extendModel : function(Model) {
        _.extend(Model.prototype, {
            //----------------------------------------
            // ## VARIABLES

            idAttribute : 'id',
            urlRoot : '/content/',

            //----------------------------------------
            // ## FUNCTIONS

            /**
             * queryParams - query params for the url
             * @return {Object} params
             */
            queryParams : function() {
                return { };
            },

            /**
             * fetchContent - fetch the content
             * @return {Deferred} promise
             */
            fetchContent : function() {
                return this.fetch();
            },

            /**
             * getBody - get the body of the content
             * @return {Object} params
             */
            getBody : function() {
                return this.get('c_body');
            }
        });

        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
        });
        return Collection;
    }
};
