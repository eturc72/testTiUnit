// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/options.js - controller for product options
 */

//---------------------------------------------------
// ## VARIABLES

var optionLists = [];
var eaUtils = require('EAUtils');
var logger = require('logging')('product:components:options', getFullControllerPath($.__controllerPath));

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args - can contain model and/or replaceItem arguments - If no model specified Alloy.Models.product is used
 * @api public
 */
function init(args) {
    logger.info('init called');
    var model = args && args.model;
    var replaceItem = args && args.replaceItem;

    $model = $model || model || Alloy.Models.product;

    render(replaceItem);
}

/**
 * RENDER
 *
 * @api private
 */
function render(replaceItem) {
    logger.info('render called');

    var options = $model.getOptions();
    if (!options) {
        $.options.setHeight(0);
        $.options.setTop(0);
        return;
    }
    logger.info('render - has options');

    // for each option, create a new view/button/dialog
    _.each(options, function(option) {
        var optionId = option.getId();

        // get default option
        var selectedIndex = 0;
        var defaultAttribute = 'c_' + optionId;
        var defaultOptionValue = $model.get(defaultAttribute);
        var values = option.getValues();
        for (var j = 0; j < values.length; j++) {
            var value = values[j];
            if (value.getId() == defaultOptionValue) {
                selectedIndex = j;
                break;
            }
        }

        var optionComponentName = Alloy.CFG.product.options.option_component[optionId];

        if (optionComponentName) {
            var optionComponent = Alloy.createController(optionComponentName, {
                product : $model,
                option : option
            });
            optionLists.push(optionComponent);
        } else {
            var optionName = option.getName();
            var optionValues = [];

            var j = 0,
                val,
                selectedOption;
            if (replaceItem && replaceItem.option_items) {
                // find the chosen selected option that matches the option id
                selectedOption = _.find(replaceItem.option_items, function(item) {
                    return item.option_id === optionId;
                });
            }
            while ( val = option.getValuesCollection().at(j++)) {
                var v = val.toJSON();
                v.displayText = String.format('%s %s', v['name'], eaUtils.toCurrency(v['price']));
                optionValues.push(v);
                if (selectedOption && selectedOption.option_value_id == v.id) {
                    selectedIndex = j - 1;
                }
                if ($model.hasSelectedOption() && $model.getSelectedOption().id == v.id) {
                    selectedIndex = j - 1;
                }
            }

            // create container view for option item
            var itemContainer = Ti.UI.createView($.createStyle({
                apiName : 'View',
                classes : ['item_container']
            }));

            var optionList = Alloy.createController('components/selectWidget', {
                valueField : 'id',
                textField : 'displayText',
                selectListTitleStyle : {
                    accessibilityValue : 'option_list'
                },
                values : optionValues,
                messageWhenSelection : '',
                messageWhenNoSelection : String.format(_L('Select %s'), optionName)
            });

            itemContainer.add(optionList.getView());
            $.options.add(itemContainer);
            optionList.setEnabled(true);
            $.listenTo(optionList, 'itemSelected', function(event) {
                logger.info('setting selected_option to ' + JSON.stringify(event.item));
                event.item.selected = true;
                $model.setSelectedOption(event.item);
            });
            // do this after the listener so the model gets updated
            if (selectedIndex >= 0) {
                optionList.updateSelectedItem(optionValues[selectedIndex].id);
            }
            optionLists.push(optionList);
        }
    });
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    // removes all $.listenTo events
    $.stopListening();
    _.each(optionLists, function(option) {
        _.isFunction(option.deinit) && option.deinit();
    });
    removeAllChildren($.options);
}
