// ©2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/address/addressForm_Asia.js - This is the Asia address form layout config
 */

exports.getLayout = function() {
    var addressLayout = {
        hasState : true,
        addressForm : {
            lines : [{
                name : 'country_zip_container',
                type : 'View',
                class : ['country_zip_container'],
                content : [{
                    name : 'country_picker_container',
                    type : 'View',
                    class : ['address1', 'text_field'],
                    content : [{
                        name : 'country_picker',
                        type : 'CountryPicker',
                        class : []
                    }]
                }, {
                    name : 'phone_fields_container',
                    type : 'View',
                    class : ['phone_fields'],
                    content : [{
                        name : 'postal_code',
                        type : 'TextField',
                        class : ['phone', 'text_field']
                    }, {
                        name : 'postal_code_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'state_city_phone_container',
                type : 'View',
                class : ['state_city_phone_container'],
                content : [{
                    name : 'state_fields',
                    type : 'View',
                    class : ['city_fields'],
                    content : [{
                        name : 'state_picker_container',
                        type : 'View',
                        class : ['phone', 'text_field'],
                        content : [{
                            name : 'state_picker',
                            type : 'StatePicker',
                            class : []
                        }]
                    }, {
                        name : 'state_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }, {
                    name : 'city_fields',
                    type : 'View',
                    class : ['postal_code_fields'],
                    content : [{
                        name : 'city',
                        type : 'TextField',
                        class : ['city', 'text_field']
                    }, {
                        name : 'city_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }, {
                    name : 'postal_code_fields',
                    type : 'View',
                    class : ['postal_code_fields'],
                    content : [{
                        name : 'phone',
                        type : 'TextField',
                        class : ['postal_code', 'text_field']
                    }, {
                        name : 'phone_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'address1_outer_wrapper',
                type : 'View',
                class : [],
                content : [{
                    name : 'address1_container',
                    type : 'View',
                    class : [],
                    content : [{
                        name : 'address1',
                        type : 'TextField',
                        class : ['address1', 'text_field']
                    }, {
                        name : 'address1_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }, {
                name : 'address2_container',
                type : 'View',
                class : [],
                content : [{
                    name : 'address2',
                    type : 'TextField',
                    class : ['address2', 'text_field']
                }]
            }, {
                name : 'name_container',
                type : 'View',
                class : ['name_container'],
                content : [{
                    name : 'first_name_container',
                    type : 'View',
                    class : ['name_fields'],
                    content : [{
                        name : 'last_name',
                        type : 'TextField',
                        class : ['first_name', 'text_field']
                    }, {
                        name : 'last_name_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }, {
                    name : 'last_name_container',
                    type : 'View',
                    class : ['name_fields'],
                    content : [{
                        name : 'first_name',
                        type : 'TextField',
                        class : ['last_name', 'text_field']
                    }, {
                        name : 'first_name_error',
                        type : 'Label',
                        class : ['error']
                    }]
                }]
            }],
            styles : {
                class : {
                    name_container : {
                    },
                    name_fields : {
                        width : 257,
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
                    postal_code_fields : {
                        width : 170,
                        left : 11,
                        layout : 'vertical'
                    },
                    city_fields : {
                        width : 170,
                        layout : 'vertical'
                    },
                    phone_fields : {
                        width : 257,
                        left : 18,
                        layout : 'vertical'
                    },
                    error : {
                        color : Alloy.Styles.color.text.red,
                        height : 0,
                        width : '100%',
                        left : 0,
                        top : 2,
                        textAlign : Ti.UI.TEXT_ALIGNMENT_LEFT,
                        font : Alloy.Styles.smallestErrorMessageFont
                    }
                },
                id : {
                    name_container : {
                        layout : 'horizontal',
                        height : 50,
                        top : 15
                    },
                    last_name_container : {
                        left : 18
                    },
                    first_name : {
                        width : '100%',
                        hintText : _L('First Name*'),
                        required : true,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_first_name'
                    },
                    last_name : {
                        width : '100%',
                        hintText : _L('Last Name*'),
                        required : true,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_last_name'
                    },
                    address1_outer_wrapper : {
                        left : 0,
                        top : 15,
                        height : 50,
                        width : Ti.UI.SIZE
                    },
                    address1_container : {
                        left : 0,
                        top : 0,
                        height : Ti.UI.SiZE,
                        width : 532,
                        layout : 'vertical'
                    },
                    address1 : {
                        left : 0,
                        width : 532,
                        required : true,
                        hintText : _L('Address*'),
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_address1'
                    },
                    address2_container : {
                        left : 0,
                        top : 15,
                        height : 50,
                        width : 532,
                        layout : 'vertical'
                    },
                    address2 : {
                        width : 532,
                        hintText : _L('Address'),
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_address2'
                    },
                    postal_code : {
                        width : '100%',
                        required : true,
                        hasSpecificOnBlurValidationFunction : true,
                        keyboardType : Ti.UI.KEYBOARD_TYPE_NUMBERS_PUNCTUATION,
                        hintText : _L('Postal Code*'),
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_postal_code'
                    },
                    state_city_phone_container : {
                        layout : 'horizontal',
                        top : 15,
                        height : 50
                    },
                    country_zip_container : {
                        layout : 'horizontal',
                        height : 50,
                        top : 0
                    },
                    country_picker_container : {
                        width : Ti.UI.SIZE,
                        height : Ti.UI.SIZE,
                        layout : 'horizontal',
                        left : 0,
                        top : 0
                    },
                    state_picker_container : {
                        width : Ti.UI.SIZE,
                        height : 50,
                        layout : 'horizontal'
                    },
                    city : {
                        width : '100%',
                        required : true,
                        hintText : _L('City*'),
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_city'
                    },
                    phone : {
                        width : '100%',
                        required : true,
                        hasSpecificOnBlurValidationFunction : true,
                        hintText : _L('Phone*'),
                        keyboardType : Ti.UI.KEYBOARD_TYPE_NUMBERS_PUNCTUATION,
                        returnKeyType : Ti.UI.RETURNKEY_NEXT,
                        accessibilityLabel : 'input_phone'
                    }
                }
            },
            error_messages : {
                required_field_error : _L('This field is required.'),
                first_name_error : _L('This field is required.'),
                last_name_error : _L('This field is required.'),
                address1_error : _L('This field is required.'),
                city_error : _L('This field is required.'),
                phone_error : _L('Invalid phone number.'),
                state_error : _L('Provide country first.'),
                postal_code_error : _L('Invalid zip code.')
            }
        }
    };
    return addressLayout;
};

exports.getAddressOrder = function() {
   return [
       ['country_code', 'postal_code'],
       ['state_code', 'city'],
       ['address1'],
       ['address2'],
       ['last_name', 'first_name']
   ];
};

exports.isLastNameFirst = function() {
    return true;
};
