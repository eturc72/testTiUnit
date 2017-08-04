// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/variations.js - controller for product variations
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:components:variations', getFullControllerPath($.__controllerPath));
var eaUtils = require('EAUtils');
var analytics = require('analyticsBase');
var showErrorLabelOnly = eaUtils.showErrorLabelOnly;
var clearErrorLabelOnly = eaUtils.clearErrorLabelOnly;

var variationLists = {},
    sizeChartHandler;

var variationsErrorLabels = [];

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;
exports.verifySelectedVariations = verifySelectedVariations;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init(args) {
    logger.info('init called');

    $model = $model || (args && args.model) || Alloy.Models.product;

    // We should update the variation value selection in the UI
    $.listenTo($model, 'change:variation_values', resetVariationSelection);
    render();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');

    // build the variations container

    var variationAttributes = $model.getVariationAttributes();
    if (!variationAttributes) {
        $.variations.setHeight(0);
        $.variations.setTop(0);
        return;
    }

    var selectedAttributes = $model.getVariationValues();

    _.each(variationAttributes, function(variationAttribute) {

        var attributeId = variationAttribute.getId();
        var attributeName = variationAttribute.getName();
        var variationValues = variationAttribute.getValues();

        var componentCfg = templateForVariationAttribute(attributeId);
        if (!componentCfg) {
            logger.error('cant find component for variation attribute.  wont be able to order this product');
        }
        // if view is available, create a view
        if (componentCfg.view) {
            logger.info('view: ' + componentCfg.view);

            var selectListContainer = Ti.UI.createView($.createStyle({
                classes : ['select_list_container'],
                apiName : 'View'
            }));
            var vvs = $model.getVariationValues();
            var svv = vvs[attributeId];

            var attributeValueController = Alloy.createController(componentCfg.view, {
                product : $model,
                $model : variationAttribute,
                attribute : variationAttribute,
                attributeId : attributeId,
                valueField : 'value',
                textField : 'name',
                selectableField : 'orderable',
                selectedItem : svv,
                selectListTitleStyle : {
                    accessibilityValue : 'variation_chooser',
                },
                values : variationAttribute.get('values').toJSON(),
                selectMessageToDisplay : variationAttribute.get('name'),
                messageWhenSelection : String.format(_L('%s: %s'), variationAttribute.get('name'), ''),
                messageWhenNoSelection : String.format(_L('Select %s'), variationAttribute.get('name'))
            });

            selectListContainer.add(attributeValueController.getView());
            $.listenTo(attributeValueController, 'itemSelected', itemSelectedHandler);
            variationLists[attributeId] = attributeValueController;

            if (attributeId === Alloy.CFG.product.size_attribute) {
                var category = Alloy.createModel('category');
                if ($model.getPrimaryCategoryId()) {
                    category.attributes.id = $model.getPrimaryCategoryId();
                    category.fetchCategory().done(function() {
                        // if there's a size chart to show, show the link
                        if (category.get(Alloy.CFG.category.size_chart_attribute)) {
                            $.size_chart_label = Ti.UI.createLabel($.createStyle({
                                classes : ['size_chart_label'],
                                apiName : 'Label',
                                accessibilityLabel : 'size_chart_label'
                            }));
                            sizeChartHandler = function() {
                                showSizeChart({
                                    content : category.get(Alloy.CFG.category.size_chart_attribute),
                                    cssFile : category.get(Alloy.CFG.category.size_chart_css_attribute)
                                });
                            };
                            $.size_chart_label.addEventListener('click', sizeChartHandler);
                            selectListContainer.add($.size_chart_label);
                        }
                    });
                }
            }
            var variationContainer = Ti.UI.createView($.createStyle({
                classes : ['variation_container'],
                apiName : 'View'
            }));
            variationContainer.add(selectListContainer);

            var errorLabel = Ti.UI.createLabel($.createStyle({
                classes : ['error_label'],
                apiName : 'Label'
            }));
            variationContainer.add(errorLabel);
            variationsErrorLabels.push(errorLabel);

            $.variations.add(variationContainer);
        }
    });

    if ($model.isMaster() || $model.isVariant()) {
        resetVariationSelection();
    }
    logger.info('render end');
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    removeAllChildren($.variations);
    $.variations.removeEventListener('itemSelected', itemSelectedHandler);
    $.size_chart_label && $.size_chart_label.removeEventListener('click', sizeChartHandler);

    // Tell dynamic variation controllers to deinit
    if (variationLists) {
        _.each(_.keys(variationLists), function(key) {
            if (variationLists[key].deinit) {
                variationLists[key].deinit();
            }
        });
    }
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * showSizeChart - displays the size chart dialog
 *
 * @param {Object} event
 * @api private
 */
function showSizeChart(event) {
    logger.info('showSizeChart called');
    var content = Alloy.createModel('content', {
        id : event.content
    });
    var promise = content.fetchContent();
    Alloy.Router.showActivityIndicator(promise);
    promise.done(function() {
        Alloy.Dialog.showCustomDialog({
            controllerPath : 'product/components/sizeChart',
            continueEvent : 'sizeChart:dismiss',
            initOptions : {
                cssFile : event.cssFile,
                body : content.getBody()
            }
        });
    });

}

/**
 * resetVariationSelection - filter the variatnts based on selected attributes
 *
 * @api private
 */
function resetVariationSelection() {
    logger.info('resetVariationSelection called');

    // filter variants based on selected attributes
    var variants = $model.getVariants();
    var selectedVariationValues = $model.getVariationValues() || {};

    if (!variants) {
        logger.info('resetVariationSelection end - no variants');
        return;
    }

    var refreshedVariationAttributes = getAvailableAttributes();

    var filteredVariants = $model.getMatchingVariants(selectedVariationValues);
    var selected_variant = $model.getSelectedVariant();

    if (filteredVariants.length == 1) {
        logger.info('selected_variant & variation_values being set ... filteredVariants\n' + JSON.stringify(filteredVariants[0]) + '\n\n' + JSON.stringify(filteredVariants[0].getVariationValues()));
        $model.setVariationValues(filteredVariants[0].getVariationValues(), {
            silent : true
        });
        $model.setSelectedVariant(filteredVariants[0]);
        analytics.fireAnalyticsEvent({
            category : _L('Products'),
            action : _L('Product View'),
            label : $model.getName() + ' (' + $model.getSelectedVariant().getProductId() + ')'
        });
    } else {
        // If there are more than one, but only one is orderable ...
        var orderableVariants = $model.getOrderableVariants(selectedVariationValues);
        if (orderableVariants.length == 1) {
            if (selected_variant && selected_variant.product_id == orderableVariants[0].product_id) {
                logger.info('resetVariationSelection end - already filtered to this orderable, selected_variant ... dropping out of the flow');
                return;
            } else {
                var product_id = orderableVariants[0].product_id;
                var variant = _.find(variants, function(variant) {
                    return variant._get('product_id') == product_id;
                });
                logger.info('selected_variant & variation_values being set ... orderableVariants');
                $model.setVariationValues(variant.getVariationValues(), {
                    silent : true
                });
                $model.setSelectedVariant(variant);
                analytics.fireAnalyticsEvent({
                    category : _L('Products'),
                    action : _L('Product View'),
                    label : $model.getName() + ' (' + $model.getSelectedVariant().getProductId() + ')'
                });
            }
        } else {
            // Otherwise, nevermind
            logger.info('selected_variant being cleared');
            $model.setSelectedVariant(null, {
                silent : true
            });
            // setting to null does not trigger the event if it was already null,
            // but we want the view to know about this change
            $model.trigger('change:selected_variant', {});
        }
    }

    selectedVariationValues = $model.getVariationValues() || {};
    _.each(refreshedVariationAttributes, function(rva) {
        var list = variationLists[rva.id];
        if (!list) {
            return;
        }

        // NOTE: This seems be be the cause of STR-931, STR-944, and STR-839
        //  but without it, non-applicable sizes don't get grayed out ...
        list.updateItems(rva.values);

        if (list.updateSelectedItem && selectedVariationValues[rva.id]) {
            list.updateSelectedItem(selectedVariationValues[rva.id]);
        }
    });

    logger.info('resetVariationSelection end');
}

/**
 * verifySelectedVariations - check to see if variation is selected and if not display error
 *
 * @api public
 */
function verifySelectedVariations() {
    logger.info('verifySelectedVariations called');
    var selectedAttributes = $model.getVariationValues();
    _.each($model.getVariationAttributes(), function(variationAttribute, index) {
        if (!selectedAttributes[variationAttribute.getId()]) {
            showErrorLabelOnly(variationsErrorLabels[index], String.format(_L('Select %s'), variationAttribute.getName()));
        } else {
            clearErrorLabelOnly(variationsErrorLabels[index]);
        }
    });
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * itemSelectedHandler - triggered when a variation attribute value is selected.
 *
 * @param {Object} event
 * @api private
 */
function itemSelectedHandler(event) {
    logger.info('itemSelectedHandler called');
    logger.trace('itemSelectedHandler start');
    event.cancelBubble = true;
    var pair = {},
        variationValues = _.extend({}, $model.getVariationValues());

    pair[event.data.variationAttributeId] = variationValues[event.data.variationAttributeId] = event.item.value;

    $model.setVariationValues(variationValues);

    clearSelectedVariationsErrors();
    logger.trace('itemSelectedHandler end');
}

/**
 * clearSelectedVariationsErrors - clear variation errors
 *
 * @api private
 */
function clearSelectedVariationsErrors() {
    logger.info('clearSelectedVariationsErrors called');
    var selectedAttributes = $model.getVariationValues();
    _.each($model.getVariationAttributes(), function(variationAttribute, index) {
        if (selectedAttributes[variationAttribute.getId()]) {
            clearErrorLabelOnly(variationsErrorLabels[index]);
        }
    });
}

/**
 * templateForVariationAttribute - returns the template to use for the given attributeId
 *
 * @param {Object} attributeId
 * @return {String} template name
 * @api private
 */
function templateForVariationAttribute(attributeId) {
    logger.info('templateForVariationAttribute called');
    var template = Alloy.CFG.product.attributeSelectComponent[attributeId] || Alloy.CFG.product.attributeSelectComponent['default'];
    return template;
}

/**
 * getAvailableAttributes - obtains available attributes and if enabled or orderable
 *
 * @return {Array} available attributes
 * @api private
 */
function getAvailableAttributes() {
    logger.info('getAvailableAttributes start');

    var a,
        selectedAttributes = $model.getVariationValues() || {},
        variationAttributes = $model.getVariationAttributesCollection().toJSON(),
        selectedAttributesKeys = _.keys(selectedAttributes),
        selectedAttribute = null,
        availableAttributes = $model.getAvailableAttributes();

    logger.info('product.getAvailableAttributes done');

    _.each(variationAttributes, function(va) {
        var aa = availableAttributes[va.id];
        if (!aa) {
            return va.values;
        }

        if (va.values.length == 1) {
            logger.info('setting single value as selected: ' + va.id + ': ' + va.values[0].value);
            selectedAttributes[va.id] = va.values[0].value;
        }
        var sv = selectedAttributes[va.id];

        _.each(va.values, function(av) {
            av.selected = sv === av.value ? true : false;

            // This defines whether we show a red border or not (or whether it is disabled or not)
            // Logic: if a selection is made, then use the 'allVariants', otherwise, use the 'filteredVariants' version
            var isOrderableAsConfigured = av.value in aa;
            // make a copy of selected attributes - don't change it directly or this will actually set the selected attributes on the product
            var info = selectedAttributes ? JSON.parse(JSON.stringify(selectedAttributes)) : {};
            info[va.id] = av.value;
            av.enabled = $model.isOrderableVariationValue(info, va.id);
            av.orderable = isOrderableAsConfigured;
        });
    });

    logger.info('getAvailableAttributes end');
    return variationAttributes;
}
