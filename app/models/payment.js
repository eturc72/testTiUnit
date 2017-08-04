// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * models/payment.js - Model definition for payment
 *
 * @api public
 */

exports.definition = {
    // **config**
    config : {
        model_name : 'payment',
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
             * getLastFourDigits - returns the last four digits of the credit card
             * @return {String}
             */
            getLastFourDigits : function() {
                if (this.has('masked_gift_certificate_code')) {
                    var card_number = this.get('masked_gift_certificate_code');
                    if (card_number) {
                        return card_number.substring(card_number.length - 4, card_number.length);
                    }
                } else {
                    return this.get('last_four_digits') || (this.get('payment_card') ? this.get('payment_card').number_last_digits : '');
                }
            },

            /**
             * getPaymentMethod - returns the payment method
             * @return {String}
             */
            getPaymentMethod : function() {
                return this.get('payment_method');
            },

            /**
             * getCanDelete - checks if the payment can be deleted
             * @return {Boolean}
             */
            getCanDelete : function() {
                return this.get('can_delete');
            },

            /**
             * getCreditCardType - returns the credit card type
             * @return {String}
             */
            getCreditCardType : function() {
                return this.get('credit_card_type') || (this.get('payment_card') ? this.get('payment_card').card_type : '');
            },

            /**
             * getAmountAuth - get the authorization amount
             * @return {String}
             */
            getAmountAuth : function() {
                return this.get('amt_auth') || this.get('amount');
            },

            /**
             * isGiftCard - checks if the payment method is gift card
             * @return {Boolean}
             */
            isGiftCard : function() {
                var method_id = this.getPaymentMethod() ? this.getPaymentMethod() : this.get('payment_method_id');
                return method_id.toLowerCase().indexOf('gift_certificate') >= 0;
            },

            /**
             * isCreditCard - checks if the payment method is credit card
             * @return {Boolean}
             */
            isCreditCard : function() {
                var method_id = this.getPaymentMethod() ? this.getPaymentMethod() : this.get('payment_method_id');
                return method_id.toLowerCase().indexOf('credit_card') >= 0;
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
