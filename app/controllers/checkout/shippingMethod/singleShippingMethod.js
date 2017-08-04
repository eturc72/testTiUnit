// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/shippingMethod/singleShippingMethod.js - controller for a single shipping method from the list of all available shipping methods
 */

//---------------------------------------------------
// ## PUBLIC API

// change the radio button image depending on if this item is selected
$.singleShippingMethod.select = function(selected) {
    selected ? $.radio_button.setImage(Alloy.Styles.radioButtonOnImage) : $.radio_button.setImage(Alloy.Styles.radioButtonOffImage);
};

//---------------------------------------------------
// ## CONSTRUCTOR

// if the description is long, adjust some spacing
var description = $model.getDescription();
if (description && description.length > 60) {
    $.single_shipping_method.setHeight(130);
    $.standard_shipping_container.setHeight(130);
    $.method_container.setTop(50);
}
