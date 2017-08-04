// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/customer/components/addresTile.js - Functions for displaying addressses in a tile
 */

//---------------------------------------------------
// ## CONSTRUCTOR

// Add in the default address indicator
if ($model) {
    var currentCustomer = Alloy.Models.customer;
    var preferredId = currentCustomer.addresses.getPreferredID();
    var addressLabel = $model.getAddressDisplay('customer');
    $.address_display.setText(addressLabel);

    if (preferredId == $model.getAddressId()) {
        var imageView = Ti.UI.createImageView({
            width : 32,
            height : 32
        });
        Alloy.Globals.getImageViewImage(imageView, Alloy.Styles.defaultAddressImage);
        $.default_address_column.add(imageView);
    }
    $.address_edit_button.address_id = $.address_delete_button.address_id = $model.getAddressId();
    $.address_delete_button.address_name = $model.getAddressId();
}

