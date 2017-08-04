// ©2016-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/productDetailBase.js - Base controller for PDP views
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var logger = require('logging')('product:productDetailBase', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {},
    historyCursor;

$.replaceItem = null;

// protected variables to be used by derived controllers
$.currentProduct = Alloy.Models.product;
$.currentBasket = Alloy.Models.basket;

// minimum buttons for PDP
$.pdpTabButtons = [$.details_button, $.description_button];

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.listenTo($.primary_images, 'alt_image_selected', function(event) {
    $.trigger('alt_image_selected', event);
});

$.pdp_tab_buttons.addEventListener('click', pdpTabButtonsClickEventHandler);
$.breadcrumbs_back_button.addEventListener('click', breadcrumbsBackButtonClickEventHandler);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo($.currentProduct, 'change:selected_variant', selectionsHandler);

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.getDetailsTabView = getDetailsTabView;
exports.getHeaderView = getHeaderView;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param info object supplied which contains the historyCursor and optional replaceItem
 * @return {Deferred} promise for creating view
 * @api public
 */
function init(info) {
    logger.info('base init called');
    var deferred = new _.Deferred();

    historyCursor = info.historyCursor;
    $.replaceItem = info.replaceItem;

    $.primary_images.init();
    $.product_description.init();

    render().done(function() {
        deferred.resolve();
    });

    logger.info('base init end');

    return deferred.promise();
}

/**
 * RENDER
 *
 * @return {Deferred} promise for creating view
 * @api private
 */
function render() {
    logger.info('base render called');

    var pdp_header_view = $.getHeaderView();
    if (pdp_header_view) {
        $.pdp_header.add(pdp_header_view);
    }

    initializeElements();

    var promise = $.getDetailsTabView().always(function(pdp_details_view) {
        if (pdp_details_view) {
            $.pdp_details_tab.add(pdp_details_view);
        }
    });

    logger.info('base render end');
    return promise;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('base deinit called');

    // removes all $.listenTo listeners
    $.stopListening();

    $.pdp_tab_buttons.removeEventListener('click', pdpTabButtonsClickEventHandler);
    $.breadcrumbs_back_button.removeEventListener('click', breadcrumbsBackButtonClickEventHandler);

    // propagte deinit() to embedded controllers (<Require />)
    $.primary_images.deinit();
    $.pdp_header_controller && $.pdp_header_controller.deinit();

    // deinit tabs
    $.product_description.deinit();
    $.recommendations_container.deinit();
    $.store_availability_container.deinit();

    removeAllChildren($.pdp_details_tab);
    removeAllChildren($.pdp_header);

    $.destroy();
    logger.info('base deinit end');
}

//----------------------------------------------
// ## FUNCTIONS TO OVERRIDE

/**
 * getDetailsTabView - Get the view to show in the Details tab
 * To be implemented by derived controller
 *
 * @return {Deferred} promise for creating the view
 * @api protected
 */
function getDetailsTabView() {
    logger.info('base getDetailsTabView called');
    // To be implemented by the derived controller
    return null;
}

/**
 * getHeaderView - Get the view for the header on Details and Description tab
 *
 * @api protected
 */
function getHeaderView() {
    logger.info('base getHeaderView called');

    $.pdp_header_controller = Alloy.createController('product/components/detailHeader');

    $.pdp_header_controller.init();

    return $.pdp_header_controller.getView();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * initializeElements - Initializes the UI elements of PDP depending on product and configurations
 *
 * @api private
 */
function initializeElements() {
    logger.info('base initializeElements');

    var associatedSeparator;

    if (!Alloy.CFG.product.recommendations.enabled) {
        $.recommendations_button.hide();
        $.recommendations_button.setWidth(0);
        associatedSeparator = $.recommendations_button.associatedSeparator;
        $[associatedSeparator].hide();
        $[associatedSeparator].setWidth(0);
    } else {
        $.pdpTabButtons.push($.recommendations_button);
    }
    if (Alloy.CFG.store_availability.enabled && !$.currentProduct.isSet()) {
        $.pdpTabButtons.push($.store_availability_button);
        $.store_availability_button.show();
        associatedSeparator = $.store_availability_button.associatedSeparator;
        $[associatedSeparator].show();
        $[associatedSeparator].setWidth(1);
        // default color and will get enabled with variation selection
        $.store_availability_button.setColor(Alloy.Styles.color.text.light);
    } else {
        associatedSeparator = $.store_availability_button.associatedSeparator;
        $[associatedSeparator].hide();
        $[associatedSeparator].setWidth(0);
    }

    var size = 620 / $.pdpTabButtons.length;
    _.each($.pdpTabButtons, function(button) {
        button.setWidth(size);
    });

    // Scroll to proper image if necessary
    $.primary_images.resetVariationSelection($.currentProduct.getVariationValues());
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * pdpTabButtonsClickEventHandler - Event handler for tabs on PDP have been clicked
 *
 * @api private
 */
function pdpTabButtonsClickEventHandler(event) {
    logger.info('pdpTabButtonsClickEventHandler called');

    if (!event.source.associatedView) {
        return;
    }
    var i = 0,
        button,
        associatedView = event.source.associatedView,
        includeHeader,
        headerView = $.pdp_header_controller.getView();
    var productSelected = $.currentProduct.isProductSelected();
    // hide the tab container so we don't see layout changes as the views are being shown
    $.tab_page_container.hide();
    // a variant is selected or there are no variants to select
    while ( button = $.pdpTabButtons[i++]) {
        if (event.source === button) {
            // in this block, we want to only set the background color and update the header (make it visible or invisible)
            // if the tab clicked is detail, description, recommendations, or inventory, but inventory only if a variant is selected.
            // If a master is selected, then don't do anything because a growl will be displayed below.
            if ($[associatedView] !== $.pdp_store_availability_tab || ($[associatedView] === $.pdp_store_availability_tab && productSelected)) {
                button.setBackgroundColor(Alloy.Styles.tabs.backgroundColorEnabled);
                var isVisible = headerView.getVisible();
                var showHeader = button.includePdpHeader === 'yes';
                if (showHeader != isVisible) {
                    if (showHeader) {
                        headerView.setHeight(Ti.UI.SIZE);
                        headerView.setWidth(Ti.UI.SIZE);
                        headerView.show();
                    } else {
                        hideView(headerView);
                    }
                }
            }
            var view = $[button.associatedView];
            // need to tell the store availability view that it is being activated so it can load.
            // we only want to load its contents when clicked and not when page loads.
            if (view === $.pdp_store_availability_tab) {
                // only display the view if a variant is selected. Display a growl if a master product is selected.
                if (productSelected) {
                    $.store_availability_container.init().done(function() {
                        showView(view);
                    });
                } else {
                    notify(_L('Select a variation first'));
                }
            } else if (view === $.pdp_recommendations_tab) {
                $.recommendations_container.init().done(function() {
                    showView(view);
                });
            } else {
                showView(view);
            }
        } else {
            // if the inventory tab was clicked and a master product is the current product, then don't change the states
            // of the other tabs.
            if ($[associatedView] === $.pdp_store_availability_tab && !productSelected) {
                continue;
            }
            hideView($[button.associatedView]);
            button.setBackgroundColor(Alloy.Styles.tabs.backgroundColorDisabled);
        }
    }
    $.tab_page_container.show();
}

/**
 * showView - Shows the tab view and sets the height and width that are also set in tss file as default
 *
 * @param {View} view to show
 * @api private
 */
function showView(view) {
    // Use fill because we need to make room for the header
    view.setHeight(Ti.UI.FILL);
    view.setWidth(Ti.UI.SIZE);
    view.show();
}

/**
 * hideView - Hides the view passed in
 *
 * @param {View} view to hide
 * @api private
 */
function hideView(view) {
    view.hide();
    view.setHeight(0);
    view.setWidth(0);
}

/**
 * breadcrumbsBackButtonClickEventHandler - Event handler for back button click
 * @api private
 */
function breadcrumbsBackButtonClickEventHandler() {
    eaUtils.returnToLastSearchOrProduct(historyCursor, $.currentProduct.getId());
}

/**
 * selectionsHandler - Product has been selected and need to update inventory and product id
 *
 * @api private
 */
function selectionsHandler() {
    logger.info('selection handler');

    if ($.currentProduct.isProductSelected()) {
        $.store_availability_button.setColor(Alloy.Styles.color.text.mediumdark);
    } else {
        $.store_availability_button.setColor(Alloy.Styles.color.text.light);
    }

    $.pdp_header_controller.setProductID($.currentProduct.getSelectedProductId());
}

