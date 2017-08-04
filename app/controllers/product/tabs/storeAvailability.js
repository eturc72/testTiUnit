// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/storeAvailability.js - controller for store availability tab on PDP
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {},
    currentProduct = Alloy.Models.product;

var product = null,
    storeInventoryCurrentPage = 0;

var logger = require('logging')('product:tabs:storeAvailability', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## UI EVENT LISTENERS

$.last_btn.addEventListener('click', lastButtonClickEventHandler);
$.next_btn.addEventListener('click', nextButtonClickEventHandler);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise for creating view
 * @api public
 */
function init() {
    logger.info('init called');
    return render();
}

/**
 * RENDER
 *
 * @return {Deferred} promise for creating view
 * @api private
 */
function render() {
    logger.info('render called');
    var deferred = new _.Deferred();
    updateDisplay();

    product = currentProduct.getSelectedVariant();
    if (!product) {
        product = currentProduct;
    }

    if (product) {
        load5Stores().always(function() {
            deferred.resolve();
        });
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    $.last_btn.removeEventListener('click', lastButtonClickEventHandler);
    $.next_btn.removeEventListener('click', nextButtonClickEventHandler);
    removeAllChildren($.variation_container);
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * load5Stores - loads the next 5 stores for availability
 *
 * @return {Deferred} promise for loading
 * @api private
 */
function load5Stores() {
    logger.info('load5Stores called');
    var deferred = new _.Deferred();
    if (!Alloy.CFG.store_availability.enabled) {
        deferred.resolve();
        return deferred;
    }

    if (!product) {
        deferred.resolve();
        return deferred;
    }

    $.storeInventoryData.reset([]);

    var start = storeInventoryCurrentPage * 5;

    var fiveStores = Alloy.Collections.allStores.getNextNStores(start, 5);

    Alloy.Router.showActivityIndicator(deferred);
    Alloy.Collections.allStores.getInventory(product, start, 5).done(function() {
        _.each(fiveStores, function(store) {
            var storeInv = store.getInventoryId();
            if (storeInv) {
                var storeAvailability = currentProduct.getInventoryAvailability(product, storeInv);
                if (storeAvailability.levels && storeAvailability.levels.stockLevel) {
                    var stockLevelMsg = storeAvailability.levels.stockLevel != 999999 ? (storeAvailability.levels.stockLevel + ' ' + _L('In_Stock')) : _L('Perpetual_Stock');
                    if (storeAvailability.levels.stockLevel > 100000) {
                        stockLevelMsg = String.formatDecimal(100000) + '+ ' + _L('In_Stock');
                    }
                    store.setAvailabilityDetails(storeAvailability.message, determineAvailabilityTextColor(storeAvailability.levels), stockLevelMsg);
                } else {
                    store.setAvailabilityDetails(_L('Unknown_Availability'), Alloy.Styles.color.text.dark, _L('Unknown_Stock_Level'));
                }
            } else {
                store.setAvailabilityDetails(_L('Unknown_Availability'), Alloy.Styles.color.text.dark, _L('Unknown_Stock_Level'));
            }
        });
        $.storeInventoryData.reset(fiveStores);
        $.store_availability_view.scrollToTop(0);

        updateStoreAvailabilityButtons();
    }).always(function() {
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * updateDisplay - updates the dispaly with the results
 *
 * @api private
 */
function updateDisplay() {
    logger.info('updateDisplay called');
    product = currentProduct.getSelectedVariant();
    if (!product) {
        product = currentProduct;
    }

    removeAllChildren($.variation_container);

    if (product) {
        $.no_store_availability_label.setVisible(false);
        $.no_store_availability_label.setHeight(0);
        $.store_availability_view.setVisible(true);
        $.store_availability_controls.setVisible(true);
        $.variation_container.setVisible(true);

        var vvs = product.getVariationValues();
        // make a new label for every variation value
        for (var name in vvs) {
            var displayName = currentProduct.getVariationAttributeDisplayName(name);
            var value = currentProduct.getVariationAttributeByName(name);
            var label = Ti.UI.createLabel($.createStyle({
                classes : ['heading_label'],
                apiName : 'Label',
                text : String.format(_L('%s: %s'), displayName, value)
            }));
            $.variation_container.add(label);
        }
    } else {
        $.no_store_availability_label.setVisible(true);
        $.no_store_availability_label.setHeight(30);
        $.store_availability_view.setVisible(false);
        $.store_availability_controls.setVisible(false);
        $.variation_container.setVisible(false);
    }
}

/**
 * updateStoreAvailabilityButtons - updates the button at the bottom of table for next and last
 *
 * @api private
 */
function updateStoreAvailabilityButtons() {
    logger.info('updateStoreAvailabilityButtons called');
    var maxPageNum = Math.floor(Alloy.Collections.allStores.length / 5);
    if (Alloy.Collections.allStores.length % 5 == 0) {
        maxPageNum--;
    }
    $.next_btn.setEnabled(storeInventoryCurrentPage < maxPageNum);
    $.last_btn.setEnabled(storeInventoryCurrentPage > 0);
}

/**
 * determineAvailabilityTextColor - determines colors for the availability in the table
 *
 * @param {Object} levels
 * @api private
 */
function determineAvailabilityTextColor(levels) {
    logger.info('determineAvailabilityTextColor called');
    var color = Alloy.Styles.color.text.dark;
    if (!levels) {
        return color;
    }

    if (levels.preorder > 0) {
        color = Alloy.Styles.color.text.blue;
    }

    if (levels.backorder > 0) {
        color = Alloy.Styles.accentColor;
    }

    if (levels.notAvailable > 0) {
        color = Alloy.Styles.color.text.red;
    }

    return color;
}

/**
 * transformStoreDetail - constructs the store address
 *
 * @param {Object} model
 * @api private
 */
function transformStoreDetail(model) {
    return model.constructStoreAvailability();
}

//----------------------------------------------
// UI EVENT HANDLER FUNCTIONS

/**
 * lastButtonClickEventHandler - click event handler for last button
 *
 * @api private
 */
function lastButtonClickEventHandler() {
    if (storeInventoryCurrentPage > 0) {
        storeInventoryCurrentPage--;
        load5Stores();
    }
    updateStoreAvailabilityButtons();
}

/**
 * nextButtonClickEventHandler - click event handler for next button
 *
 * @api private
 */
function nextButtonClickEventHandler() {
    if (storeInventoryCurrentPage < Math.floor(Alloy.Collections.allStores.length / 5)) {
        storeInventoryCurrentPage++;
        load5Stores();
    }
    updateStoreAvailabilityButtons();
}

