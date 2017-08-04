// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/customerResultRow.js - creates a component for customer search result
 */

//---------------------------------------------------
// ##  VARIABLES

var EAUtils = require('EAUtils');
// Localization constants
var symbolButtonTextLength = 5;

//---------------------------------------------------
// ## CONSTRUCTOR

var addresses = $model.getAddresses();
var addressModel = Alloy.createModel('customerAddress', addresses[0]);

var addressLabel = addressModel.getAddressDisplay('customer');
$.address_display.setText(addressLabel);

if (EAUtils.isSymbolBasedLanguage() && $.login_button.getTitle().length > symbolButtonTextLength) {
    $.login_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.profile_button.setFont(Alloy.Styles.lineItemLabelFont);
    $.login_button.setWidth(150);
    $.profile_button.setWidth(150);
    $.button_view.setWidth('30%');
    $.email_phone.setWidth('25%');
} else {
    $.login_button.setFont(Alloy.Styles.buttonFont);
    $.profile_button.setFont(Alloy.Styles.buttonFont);
    $.login_button.setWidth(118);
    $.profile_button.setWidth(118);
    $.button_view.setWidth('20%');
    $.email_phone.setWidth('35%');
}