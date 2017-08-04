// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/recommendedShippingAddress.js - A single shipping address used by avsPopover.js
 */

//---------------------------------------------------
// ## PUBLIC API

$.recommendedShippingAddress.select = function(selected) {
    selected ? $.radio_button.setImage(Alloy.Styles.radioButtonOnImage) : $.radio_button.setImage(Alloy.Styles.radioButtonOffImage);
};

$.recommendedShippingAddress.getAddress = function() {
    return $model;
};

//---------------------------------------------------
// ## CONSTRUCTOR

if ($model.getAddress2()) {
    $.address_tile.setHeight(60);
    $.address2.setHeight(20);
} else {
    $.address_tile.setHeight(40);
    $.address2.setHeight(0);
}

