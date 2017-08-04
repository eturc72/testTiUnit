// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/menuImageRow.js - a hamburger menu row with image and optional submenu label
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var submenuLabel = args.submenuLabel;
var label = args.label;
var image = args.image;
var properties = args.properties;

//---------------------------------------------------
// ## CONSTRUCTOR
if (image) {
    $.menu_image.setImage(image);
}
if (submenuLabel) {
    $.menu_sublabel.setText(submenuLabel);
    $.menu_label.setTop(10);
} else {
    $.menu_sublabel.hide();
    $.menu_sublabel.setHeight(0);
    $.menu_label.setHeight('100%');
}
if (label) {
    $.menu_label.setText(label);
}
if (properties) {
    $.menu_image_row.applyProperties(properties);
}