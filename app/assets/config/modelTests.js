// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/modelTests.js  - configuration for model tests
 */

module.exports = {
    // Configuration parameters used by the unit tests.
    modelTestsConfiguration : {
        productId : '883360543550',
        product_recommendations : 10,
        newProductId : '701643472710',
        productQuantity : 1,
        coupon : 'abc',
        afterCouponAmount : 27.99,
        associateId : '0176321',
        associatePasscode : '174821',
        associateFName : 'Hector',
        associateLName : 'Barbosa',
        managerEmployeeId : '2222',
        managerEmployeePasscode : '2222',
        customerEmail : 'ModelTestCustomer@demandware.com',
        coupon_name : 'abc',
        storeId : '125',
        shippingMethodIndex : 0,
        shippingMethodId : '001',
        orderNumber : '00001492',
        expectedShippingPrice : 7.99,
        giftMessage : 'Hi',
        giftBoolean : true
    },

    basketReplaceConfiguration : {
        prod1ID : '008884303989',
        prod2ID : '701643472703'
    },
    customerInfoConfiguration : {
        firstName : 'Model',
        lastName : 'Customer',
        fullName : 'Model Customer',
        address_1 : '5 Wall Street',
        address_2 : 'Apt #1',
        cityName : 'Burlington',
        state : 'MA',
        zipCode : '08180',
        country : 'USA',
        phn : '123-456-7890',
        fax : '1234567890'
    },
    productOverrideConfiguration : {
        productId : '095068015554',
        productPrice : 180,
    },
    customerHistoryConfiguration : {
        email : 'customerOrderHistory@demandware.com',
        order1Num : '00006506',
        order1Date : 'Jul 17, 2015',
        order1Total : 89.24,
        order1Status : 'Being Processed',

        order2Num : '00006505',
        order2Date : 'Jul 17, 2015',
        order2Total : 104.99,
        order2Status : 'Being Processed'
    },
    customerOrderConfiguration : {
        orderNumber : '00000302',
        orderTotal : 27.3,
        customerEmail : 'ModelTestCustomer@demandware.com'
    },
    customerOrdersConfiguration : {

    },
    shipPriceOverrideConfiguration : {
        prodID : '701643472703',
        order_total : 51.01,
        shipping_price : 5.99
    },
    recommendationsConfiguration : {
        prodID : '34536828',
        recommendationLength : 10
    },
    checkoutProcessConfiguration : {
        prodID : '701643472703',
        modelID : '701643472703',
        recommendationType : 1,
        expectedRecommendations : 8,
        overrideValueAmountOff : 10,
        expectedAmount : 37.99,
        basketTotal : 133.97,
        productTotal : 95.98,
        expectedShippingPrice : 7.99,
        priceAfterOverrideAmount : 2.99,
        amountOverride : 5,
        firstName : 'guest',
        lastName : 'checkout',
        dob : '1970-02-03',
        locale : 'en-US',
        gender : 'f',
        username : 'dssunittest1227',
        password : 'dssunittest1227',
        emailAddress : 'dssunittest1227@demandware.com',
        productOverrideType : 'Amount',
        productOverrideReason : 'loyal customer',
        shippingOverrideType : 'Amount',
        shippingverrideReason : 'product not in stock',
        recommendationsProductId : 'samsung-ln52a750'
    },
    customerAddressConfiguration : {
        customer_email : 'customerAddress@demandware.com',
        address1 : 'Sample Add #1',
        address2 : 'Sample Add #2',
        city : 'Burlington',
        country_code : 'US',
        first_name : 'Customer',
        last_name : 'Address',
        full_name : 'Customer Address',
        phone : '1234567890',
        postal_code : '01803',
        state_code : 'MA',
        addressToCreate : {
            address_id : 'TestAddress',
            first_name : 'SampleFirst',
            last_name : 'SampleLast',
            address1 : 'SampleAddress1',
            address2 : 'SampleAddress2',
            city : 'SampleCity',
            state_code : 'MA',
            country_code : 'US',
            postal_code : '00000',
            phone : 'SamplePhone'
        },
        addressToUpdate : {
            address_id : 'TestAddress',
            original_id : 'TestAddress',
            first_name : 'SampleFirst',
            last_name : 'SampleLast',
            address1 : 'SampleAddress1',
            address2 : 'SampleAddress2',
            city : 'SampleCity',
            state_code : 'MA',
            country_code : 'US',
            postal_code : '00000',
            phone : '7890123456'
        }

    },
    customerRegistrationConfiguration : {
        customer : {
            email : 'dssunittest@demandware.com',
            birthday : '1970-02-03',
            fax : '',
            first_name : 'DSS',
            job_title : '',
            last_name : 'Unittest',
            phone_business : '',
            phone_home : '',
            phone_mobile : '',
            preferred_locale : 'en-US',
            salutation : '',
            second_name : '',
            suffix : '',
            title : ''
        },
        emailPrefix : 'dssunittest'
    },
    guestCheckoutCreateCustomerConfiguration : {
        expectedShippingPrice : 5.99,
    },
    kioskConfiguration : {
        kioskUserId : '8888',
        kioskUserPassword : '8888'
    },
    customerWishListConfiguration : {
        customer_email : 'wishlist.multiple@dwre.com',
        wishlistIndex : 0,
        productDeleteAdd : {
            product_id : '013742335392',
            quantity : 1
        },
        updateQuantity : 3,
    },
    productConfiguration : {
        prodID : '25502296',
        colorVariationValue : 'JJ493XX',
        sizeVariation : '016',
        product_info1 : 'Shimmer Blouse, Chino, large',
        product_info2 : 'Shimmer Blouse, , small',
        variationProdID : '701642893561',
        variantColor : 'JJDS0XX',
        variantSize : '008',
        color1 : 'Chino',
        color2 : 'Fennel',
        orderableColor : 'Fennel',
        prodIDs : ['701643489183', 'P0048', '061492183589'],

        inventory_ids : ['inventory', 'inventory_store_store11', 'inventory_store_store8', 'inventory_store_store6'],
        check_availability_in_store_id : 'inventory',
        quantities : [{
            id : '701643489183',
            quantity : 2
        }, {
            id : 'P0048',
            quantity : 1
        }, {
            id : '061492183589',
            quantity : 5
        }],
        product_to_remove : 'P0048'

    },

    savedProductConfiguration : {
        prodID : '013742335392',
        prodAmount : 34,
        overrideType : 'Amount',
        overrideReason : 'product not in stock',
        overrideAmount : 10.00
    },

    storeConfigurations : {
        country_code : 'US',
        postal_code : '01803',
        max_distance : 1000,
        pagination_step : 5,
        unavailable_item_id : 'P0048',
        unavailable_item_stock_level : 0,
        closest_store_id : 'store9'
    },

    storePasswordConfiguration : {
        managerLogin : '2222',
        managerPassword : '2222',
        // This data needs to be set every time you run as the oldPassword will change and we don't want passwords shipped
        storeUsername : '',
        oldPassword : '',
        oldPasswordWrong : 'invalid',
        newPasswordShort : 'short',
        newPasswordReuse : '', // previously used password
        newPasswordValid : '',
        daysToExpire : 90
    },

    // The unit tests to include in the support dashboard
    support_dashboard_tests : ['associate', 'basket', 'basketcoupons', 'basketproductPriceOverride', 'basketReplaceProduct', 'basketShippingPriceOverride', 'cancelOrder', 'category', 'checkoutProcess', 'content', 'coupons', 'customer', 'customerAddress', 'customerHistory', 'customerLogout', 'customerOrder', 'customerNoOrders', 'customerOrders', 'customerRegistration', 'customerSearch', 'customerWishList', 'guestCheckoutCreateCustomer', 'invalidCustomerSearchResults', 'kiosk', 'product', 'productRecommendations', 'productSearch', 'savedProducts', 'store', 'storePassword'],

    // The unit tests to run at startup if perform_tests is true.
    active_tests : [],
    // The location to write the unit test out files.
    junit_file_location : ''
};
