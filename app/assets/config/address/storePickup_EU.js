// ©2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/address/storePickup_EU.js  - This is the Europe address form layout config for different store pickup form
 */

exports.getLayout = function() {

    return {
        hasState : false,
        addressForm : {
            lines : [{
                name : 'name_container',
                type : 'View',
                class : [],
                content : [{
                    name : 'last_name_container',
                    type : 'View',
                    class : ['name_fields'],
                    content : [{
                        name : 'last_name',
                        type : 'TextField',
                        class : ['last_name', 'text_field']
                    }, {
                        name : 'last_name_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }, {
                    name : 'first_name_container',
                    type : 'View',
                    class : ['name_fields'],
                    content : [{
                        name : 'first_name',
                        type : 'TextField',
                        class : ['first_name', 'text_field']
                    }, {
                        name : 'first_name_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'phone_fields_container',
                type : 'View',
                class : ['full_wrapper'],
                content : [{
                    name : 'phone_fields',
                    type : 'View',
                    class : ['full_container'],
                    content : [{
                        name : 'phone',
                        type : 'TextField',
                        class : ['text_field']
                    }, {
                        name : 'phone_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'email_fields_container',
                type : 'View',
                class : ['full_wrapper'],
                content : [{
                    name : 'email_fields',
                    type : 'View',
                    class : ['full_container'],
                    content : [{
                        name : 'email_address',
                        type : 'TextField',
                        class : ['text_field']
                    }, {
                        name : 'email_address_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'message_fields_container',
                type : 'View',
                class : ['full_wrapper'],
                content : [{
                    name : 'message_fields',
                    type : 'View',
                    class : ['full_container'],
                    content : [{
                        name : 'message_title_label',
                        type : 'Label',
                        class : ['title']
                    }, {
                        name : 'message',
                        type : 'TextArea',
                        class : ['text_area']
                    }]
                }]
            }],
            styles : {
                class : {
                    name_fields : {
                        width : 257,
                        layout : 'vertical'
                    },
                    full_wrapper : {
                        left : 0,
                        top : 15,
                        height : 50,
                        width : Ti.UI.SIZE
                    },
                    full_container : {
                        left : 0,
                        top : 0,
                        height : Ti.UI.SiZE,
                        width : 532,
                        layout : 'vertical'
                    },
                    text_field : {
                        maxLength : 50,
                        backgroundColor : Alloy.Styles.color.background.medium,
                        disabledBackgroundColor : Alloy.Styles.color.background.light,
                        height : 50,
                        color : Alloy.Styles.color.text.darkest,
                        disabledColor : Alloy.Styles.color.text.light,
                        font : Alloy.Styles.textFieldFont,
                        paddingLeft : 18
                    },
                    text_area : {
                        backgroundColor : Alloy.Styles.color.background.medium,
                        disabledBackgroundColor : Alloy.Styles.color.background.light,
                        height : 100,
                        color : Alloy.Styles.color.text.darkest,
                        disabledColor : Alloy.Styles.color.text.light,
                        font : Alloy.Styles.textFieldFont,
                        paddingLeft : 18
                    },
                    title : {
                        color : Alloy.Styles.color.text.dark,
                        height : 20,
                        font : Alloy.Styles.detailTextFont,
                        width : '100%',
                        left : 0,
                        top : 2,

                    },
                    error : {
                        color : Alloy.Styles.color.text.red,
                        height : 0,
                        width : '100%',
                        left : 0,
                        top : 2,
                        textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
                        font : Alloy.Styles.errorMessageFont
                    }
                },
                id : {
                    name_container : {
                        layout : 'horizontal',
                        height : 50
                    },
                    first_name_container : {
                        left : 18
                    },
                    first_name : {
                        width : '100%',
                        hintText : _L('First Name*'),
                        accessibilityLabel : 'input_first_name',
                        required : true,
                        autocorrect : false,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT
                    },
                    last_name : {
                        width : '100%',
                        hintText : _L('Last Name*'),
                        accessibilityLabel : 'input_last_name',
                        required : true,
                        autocorrect : false,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT
                    },
                    phone : {
                        left : 0,
                        width : 532,
                        required : true,
                        hintText : _L('Phone*'),
                        accessibilityLabel : 'input_phone',
                        hasSpecificOnBlurValidationFunction : true,
                        autocorrect : false,
                        keyboardType : Ti.UI.KEYBOARD_TYPE_NUMBERS_PUNCTUATION,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT
                    },
                    email_address : {
                        left : 0,
                        width : 532,
                        required : true,
                        hintText : _L('Email Address*'),
                        accessibilityLabel : 'input_email_address',
                        hasSpecificOnBlurValidationFunction : true,
                        autocorrect : false,
                        autocapitalization : false,
                        keyboardType : Ti.UI.KEYBOARD_TYPE_EMAIL,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT
                    },
                    message_fields_container : {
                        height : 120,
                    },
                    message_title_label : {
                        height : 20,
                        text : _L('Message (optional)'),
                        accessibilityLabel : 'message_title_label'
                    },
                    message : {
                        left : 0,
                        width : 532,
                        accessibilityLabel : 'input_message',
                        autocorrect : false,
                        noGenericReturnEvent : true,
                        suppressReturn : false,
                        accessibilityLabel : 'input_message'
                    }
                }
            },
            error_messages : {
                required_field_error : _L('This field is required.'),
                first_name_error : _L('This field is required.'),
                last_name_error : _L('This field is required.'),
                phone_error : _L('Invalid phone number.'),
                email_address_error : _L('Invalid email address.'),
                postal_code_error : _L('Invalid zip code.')
            }
        }
    };
};

