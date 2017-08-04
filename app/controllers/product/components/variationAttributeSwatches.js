// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/variationAttributeSwatches.js - controller for variation attribute swatches
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {},
    $model = $model || args.variationAttribute || {},
    currentProduct = args.product;

var logger = require('logging')('product:components:variationAttributeSwatches', getFullControllerPath($.__controllerPath));

var attributeId = $model.getId(),
    attributeValues = $model.getValuesCollection(),
    attributeCfg = Alloy.CFG.product.attributeSelectComponent[attributeId] || {},
    selectedValue = null,
    swatchList = {},
// keeps a reference of eventhandlers so they could removed later
    swatchContainerClickEventListeners = {};

//----------------------------------------------
// ## PUBLIC API

// the constructor calls init
exports.deinit = deinit;
exports.updateSelectedItem = updateSelectedItem;
exports.updateItems = updateItems;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api private
 */
function init() {
    logger.info('init start');
    if (!$model) {
        logger.info('MODEL NOT AVAILABLE');
        return;
    }

    if (attributeCfg.showTitle) {
        var attributeName = $model.getName();
        attributeName = attributeName.charAt(0).toUpperCase() + attributeName.substr(1);
        $.attribute_name.setText(attributeName + ':');
    } else {
        $.attribute_container.remove($.attribute_name);
    }

    currentProduct.ensureImagesLoaded('swatchImages').done(function(model, params, options) {
        logger.info('initialized. calling render()!');
        render();
    });

    logger.info('init end');

    return this;
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render start');

    var i = 0,
        len = attributeValues.length,
        attributeValue;

    var vvs = currentProduct.getVariationValues();
    var svv = vvs ? vvs[attributeId] : null;

    attributeValues.each(function(attributeValue, i) {

        var vv = attributeValue.getValue(),
            swatchGroupImages = currentProduct.getImages('swatchImages', vv),
            swatchImage = swatchGroupImages ? swatchGroupImages[0] : null;

        var swatchContainer = Ti.UI.createView($.createStyle({
            swatchValueId : vv,
            accessibilityLabel : vv,
            classes : ['swatch_container'],
            apiName : 'View'
        }));

        var swatchButton = Ti.UI.createImageView($.createStyle({
            accessibilityLabel : 'swatch_' + vv,
            classes : ['swatch_button'],
            apiName : 'ImageView'
        }));

        if (swatchImage) {
            Alloy.Globals.getImageViewImage(swatchButton, swatchImage.getLink());
        } else {
            swatchButton.add(Ti.UI.createLabel($.createStyle({
                classes : ['swatch_label'],
                apiName : 'Label',
                text : attributeValue.getName()
            })));
        }

        swatchContainer.add(swatchButton);

        var info = {};
        info[attributeId] = vv;

        var orderable = currentProduct.isOrderableVariationValue(info, attributeId);
        setSwatchEnabled(swatchContainer, orderable, orderable);

        $.swatch_list.add(swatchContainer);

        // store for easy access
        swatchList[vv] = swatchContainer;

        // if attribute value is enabled and value is selected, (or it's the first one on a master product) fire click event
        swatchContainerClickEventListeners[vv] = function() {
            swatchContainer.fireEvent('swatchSelected', {
                source : swatchContainer
            });
        };
        swatchContainer.addEventListener('click', swatchContainerClickEventListeners[vv]);
    });

    $.swatch_list.addEventListener('swatchSelected', swatchSelected);

    logger.info('render end');

    return this;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.swatch_list.removeEventListener('swatchSelected', swatchSelected);
    for (var key in swatchList) {
        swatchList[key].removeEventListener('click', swatchContainerClickEventListeners[key]);
    }
    removeAllChildren($.swatch_list);
    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * updateSelectedItem - interface
 *
 * @api public
 */
function updateSelectedItem(selectedItem) {
    // needed by variations.js to reset variation selection, but not needed for swatches
}

/**
 * updateItems - update the items model for the swatches
 *
 * @api public
 */
function updateItems(items) {
    logger.info('updateItems start');

    var i = 0,
        list = items.models ? items.toJSON() : items,
        swatch,
        item,
        selected_swatch;

    while ( item = list[i++]) {
        swatch = swatchList[item.value];
        if (!swatch) {
            continue;
        }

        setSwatchEnabled(swatch, item.enabled, item.orderable);
    }
    logger.info('updateItems end');
}

//---------------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * swatchSelected - event listener for swatch selected
 *
 * @param {Object} event
 * @api private
 */
function swatchSelected(event) {
    logger.info('swatchSelected called');
    logger.trace('swatchSelected start');

    updateAttributeValueSelection(event.source.swatchValueId);

    $.trigger('itemSelected', {
        item : selectedValue.toJSON(),
        data : {
            variationAttributeId : attributeId
        }
    });

    logger.trace('swatchSelected end');
}

/**
 * updateAttributeValueSelection - update the text for the attribute selected
 *
 * @param {Object} value
 * @api private
 */
function updateAttributeValueSelection(value) {
    logger.info('updateAttributeValueSelection start ' + value);
    selectedValue = attributeValues.where({value : value})[0];

    $.attribute_value.setText(selectedValue.getName());
    logger.info('updateAttributeValueSelection end');
}

/**
 * setSwatchEnabled - enable or disable a swatch as well as change border color
 *
 * @param {Object} swatch
 * @param {Object} enabled
 * @param {Object} orderable
 * @api private
 */
function setSwatchEnabled(swatch, enabled, orderable) {
    logger.info('setSwatchEnabled: ' + enabled + ' for ' + swatch.swatchValueId);
    var vvs = currentProduct.getVariationValues(),
        svv;
    if (vvs) {
        svv = vvs[Alloy.CFG.product.color_attribute];
    }
    var borderColor = Alloy.Styles.color.border.lighter;
    if (svv == swatch.swatchValueId) {
        logger.info('setSwatchSelected: adding dark border to swatch: ' + swatch.swatchValueId);
        borderColor = Alloy.Styles.color.border.darkest;
        updateAttributeValueSelection(swatch.swatchValueId);
    } else if (!enabled) {
        borderColor = Alloy.Styles.color.border.dark;
    }
    if (swatch.getEnabled() != enabled) {
        swatch.setEnabled(enabled);
    }
    if (swatch.getTouchEnabled() != enabled) {
        swatch.setTouchEnabled(true);
    }
    if (swatch.getBorderColor() != borderColor) {
        swatch.setBorderColor(borderColor);
    }
    logger.info('setSwatchEnabled: end');
}

//----------------------------------------------
// ## CONSTRUCTOR

init();

