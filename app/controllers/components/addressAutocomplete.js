// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/components/addressAutocomplete.js - show the view with address suggestions
 */

//----------------------------------------------
// ## VARIABLES
var googleAddressDetails = $.args;
var logger = require('logging')('components:addressAutoComplete', getFullControllerPath($.__controllerPath));
var googlePlaceDetails = require('googlePlaceDetails')(googleAddressDetails);

//---------------------------------------------------
// ## APP LISTENERS

// hideAuxillaryViews event listener
$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', function() {
    hideView();
});

//---------------------------------------------------
// ## PUBLIC API
exports.init = init;
exports.deinit = deinit;
exports.hideView = hideView;
exports.showView = showView;
exports.returnAddressCollection = returnAddressCollection;
exports.isVisible = isVisible;

//---------------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('init called');
    Alloy.Dialog.getWindow().add($.address_autocomplete_view);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.dismiss_suggestion_button.removeEventListener('click', dismissSuggestions);
    if ($.address_sugestions_table.getSections().length > 0) {
        _.each($.address_sugestions_table.getSections()[0].getRows(), function(row) {
            row.removeEventListener('click', getAddressDetails);
        });
    }
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * showView - shows the view with address suggestions
 *
 * @param {Object} customId
 * @api public
 */
function showView(customId) {
    if ($.addressSugesstions.length == 0) {
        hideView();
        return;
    }
    if ($.address_autocomplete_view.getVisible()) {
        return;
    }
    $.address_autocomplete_view.setHeight(1);
    if (customId == 'customer') {
        $.address_autocomplete_view.setLeft(10);
    }
    $.address_autocomplete_view.setWidth(390);

    var animation = Ti.UI.createAnimation({
        height : 270,
        curve : Ti.UI.ANIMATION_CURVE_EASE_IN_OUT,
        duration : 500,
        zIndex : 100
    });

    var animationHandler = function() {
        animation.removeEventListener('complete', animationHandler);
        $.dismiss_suggestion_button.setVisible(true);
        $.address_sugestions_table.setVisible(true);
    };

    animation.addEventListener('complete', animationHandler);

    $.address_autocomplete_view.setVisible(true);
    $.address_autocomplete_view.animate(animation);

}

/**
 * hideView - hides the view with address suggestions
 *
 * @api public
 */
function hideView() {
    $.dismiss_suggestion_button.setVisible(false);
    $.address_sugestions_table.setVisible(false);
    $.address_autocomplete_view.setHeight(0);
    $.address_autocomplete_view.setWidth(0);
    $.address_autocomplete_view.setVisible(false);
}

/**
 * returnAddressCollection - returns model
 *
 * @return {Object} - list of suggested address
 * @api public
 */
function returnAddressCollection() {
    return $.addressSugesstions;
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * getAddressDetails - fetches the address details upon click of table row
 *
 * @param {Object} event
 * @api private
 */
function getAddressDetails(event) {
    googlePlaceDetails.getPlaceDetails({
        reference : $.addressSugesstions.at(event.index).getReference()
    });
    hideView();
    Alloy.eventDispatcher.trigger('hideAuxillaryViews');
}

/**
 * dismissSuggestions - called when user clicks button to dismiss address suggestions
 *
 * @api private
 */
function dismissSuggestions() {
    hideView();
    $.trigger('addressSuggestionsCancelBtnClick');
}

/**
 * isVisible - checks that view is visible or not.
 *
 * @return {Boolean}
 * @api public
 */
function isVisible() {
    return $.address_autocomplete_view.getVisible();
}
