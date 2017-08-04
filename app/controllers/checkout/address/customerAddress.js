// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/customerAddress.js - A single address used by chooseAddress
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var addressType = args.addressType;

//---------------------------------------------------
// ## PUBLIC API

$.customer_address.select = function(selected) {
    selected ? $.radio_button.setImage(Alloy.Styles.radioButtonOnImage) : $.radio_button.setImage(Alloy.Styles.radioButtonOffImage);
};

$.customer_address.getAddress = function() {
    return $model;
};

var addressLabel = $model.getAddressDisplay(addressType);
$.address_display.setText(addressLabel);
