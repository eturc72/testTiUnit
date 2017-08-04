// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/searchHeader.js - handles the header for search results
 */

//---------------------------------------------------
// ## VARIABLES

var currentProductSearch = Alloy.Models.productSearch;
var logger = require('logging')('search:components:searchHeader', getFullControllerPath($.__controllerPath));
var EAUtils = require('EAUtils');

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', handleOverlayClick);

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.search_context.addEventListener('click', handleOverlayClick);
$.panel_backdrop.addEventListener('click', handleOverlayClick);
$.refinement_panels.addEventListener('click', handleOverlayClick);


//---------------------------------------------------
// ## MODEL LISTENERS

// Update product search total when appropriate
$.listenTo(Alloy.Models.productSearch, 'change:total', function() {
    var total = Alloy.Models.productSearch.getTotal() || 0;
    $.result_total_products.setText(String.format((total == 1 ? _L('%d Product') : _L('%d Products')), Alloy.Models.productSearch.getTotal()));
});

// Update refinements display when appropriate
$.listenTo(currentProductSearch, 'change:refinements', onProductSearchChangeRefinements);

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.search_context.removeEventListener('click', handleOverlayClick);
    $.attributeRefinementButton && $.attributeRefinementButton.removeEventListener('click', onAttributeRefinementButtonClick);
    $.attributeRefinementColorViewContainer && $.attributeRefinementColorViewContainer.removeEventListener('click', onAttributeRefinementButtonClick);
    $.attributesRefinementPanel && $.attributesRefinementPanel.removeEventListener('click', onAttributeRefinementPanelClick);
    $.categoryRefinementButton && $.categoryRefinementButton.removeEventListener('click', onCategoryRefinementButtonClick);
    $.categoryRefinementPanel && $.categoryRefinementPanel.removeEventListener('click', onCategoryRefinementPanelClick);
    $.sortingOptionsButton && $.sortingOptionsButton.removeEventListener('click', onSortingOptionsButtonClick);
    $.sortingOptionsPanel && $.sortingOptionsPanel.removeEventListener('click', onSortingOptionsPanelClick);
    $.panel_backdrop.removeEventListener('click', handleOverlayClick);
    $.refinement_panels.removeEventListener('click', handleOverlayClick);
    $.stopListening();
    $.attributesRefinementController && $.attributesRefinementController.deinit();
    $.sortingOptionsController && $.sortingOptionsController.deinit();
    $.categoryRefinementController && $.categoryRefinementController.deinit();
    removeAllChildren($.search_refinements);
    removeAllChildren($.refinement_panels);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getRefinementPanelWithRefinementID - Loads the correct
 * refinement panel based on the refinement_id
 *
 * @param {Object} refinement_id
 * @api private
 */
function getRefinementPanelWithRefinementID(refinement_id) {
    var refinementPanels = $.refinement_panels.children,
        panel;
    for (var i = 0,
        ii = refinementPanels.length; i < ii; i++) {
        if (refinementPanels[i].refinement_id == refinement_id) {
            panel = refinementPanels[i];
            break;
        }
    }
    return panel;
}

/**
 * hideAllRefinementPanels - hide all the refinement panels.
 *
 * @api private
 */
function hideAllRefinementPanels() {
    var refinementPanels = $.refinement_panels.children;
    for (var i = 0,
        ii = refinementPanels.length; i < ii; i++) {
        refinementPanels[i].setVisible(false);
    }
}

/**
 * setButtonColors - Set the colors of the button
 * based on which button is selected
 *
 * @param {Object} selected
 * @api private
 */
function setButtonColors(selected) {
    if ($.categoryRefinementButton) {
        selected === 'cgid' ? $.categoryRefinementButton.setBackgroundImage(Alloy.Styles.categoryButtonDownImage) : $.categoryRefinementButton.setBackgroundImage(Alloy.Styles.secondaryNavButtonImage);
    }
    if ($.attributeRefinementButton) {
        selected === 'attributes' ? $.attributeRefinementButton.setBackgroundImage(Alloy.Styles.categoryButtonDownImage) : $.attributeRefinementButton.setBackgroundImage(Alloy.Styles.secondaryNavButtonImage);
    }
    if ($.sortingOptionsButton) {
        selected === 'sorting_options' ? $.sortingOptionsButton.setBackgroundImage(Alloy.Styles.categoryButtonDownImage) : $.sortingOptionsButton.setBackgroundImage(Alloy.Styles.secondaryNavButtonImage);
    }

    if ($.categoryRefinementImage) {
        selected === 'cgid' ? $.categoryRefinementImage.setImage(Alloy.Styles.dropdownDownArrowImage) : $.categoryRefinementImage.setImage(Alloy.Styles.dropdownUpArrowImage);
    }
    if ($.attributeRefinementImage) {
        selected === 'attributes' ? $.attributeRefinementImage.setImage(Alloy.Styles.dropdownDownArrowImage) : $.attributeRefinementImage.setImage(Alloy.Styles.dropdownUpArrowImage);
    }
    if ($.sortingOptionsImage) {
        selected === 'sorting_options' ? $.sortingOptionsImage.setImage(Alloy.Styles.dropdownDownArrowImage) : $.sortingOptionsImage.setImage(Alloy.Styles.dropdownUpArrowImage);
    }
}

/**
 * createCategoryRefinementButton - creates a category refinement panel
 *
 * @param {Object} category_refinement
 * @api private
 */
function createCategoryRefinementButton(category_refinement) {
    if ($.categoryRefinementButton) {
        return;
    }

    logger.info('creating category refinement button');

    var refinement_id = category_refinement.getAttributeId();
    var refinement_name = category_refinement.getLabel();

    $.categoryRefinementButton = Ti.UI.createView({
        width : 305,
        height : 35,
        left : 472,
        backgroundImage : Alloy.Styles.secondaryNavButtonImage,
        backgroundSelectedImage : Alloy.Styles.categoryButtonDownImage,
        backgroundFocusedImage : Alloy.Styles.categoryButtonDownImage,
        focusable : true,
        layout : 'absolute',
        borderWidth : 1,
        borderColor : Alloy.Styles.color.border.medium,
        zIndex : 100
    });
    $.categoryRefinementLabel = Ti.UI.createLabel({
        text : refinement_name,
        left : 11,
        color : Alloy.Styles.accentColor,
        font : Alloy.Styles.buttonFont
    });
    $.categoryRefinementLabelText = Ti.UI.createLabel({
        text : '',
        left : 90,
        color : Alloy.Styles.color.text.dark,
        font : Alloy.Styles.lineItemLabelFont,
        width : 190
    });

    $.categoryRefinementImage = Ti.UI.createImageView({
        right : 10,
        height : 10,
        width : 15
    });
    Alloy.Globals.getImageViewImage($.categoryRefinementImage, Alloy.Styles.dropdownUpArrowImage);
    $.categoryRefinementButton.add($.categoryRefinementLabel);
    $.categoryRefinementButton.add($.categoryRefinementLabelText);
    $.categoryRefinementButton.add($.categoryRefinementImage);

    $.categoryRefinementButton.addEventListener('click', onCategoryRefinementButtonClick);
    $.search_refinements.add($.categoryRefinementButton);

    $.categoryRefinementPanel = Alloy.createController('search/components/categoryRefinementPanel', {}).getView();
    $.categoryRefinementPanel.refinement_id = refinement_id;
    $.categoryRefinementPanel.addEventListener('click', onCategoryRefinementPanelClick);
    var label = Ti.UI.createLabel({
        id : 'name',
        text : refinement_name
    });
    $.categoryRefinementPanel.add(label);
    $.refinement_panels.add($.categoryRefinementPanel);
}

/**
 * createAttributeRefinementButton - creates a attribute refinement panel
 *
 * @api private
 */
function createAttributeRefinementButton() {
    if ($.attributeRefinementButton) {
        return;
    }
    var refinement_id = 'attributes';
    var refinement_name = _L('Filter');

    $.attributeRefinementButton = Ti.UI.createView({
        width : 305,
        height : 35,
        left : 10,
        backgroundImage : Alloy.Styles.secondaryNavButtonImage,
        backgroundSelectedImage : Alloy.Styles.categoryButtonDownImage,
        backgroundFocusedImage : Alloy.Styles.categoryButtonDownImage,
        layout : 'absolute',
        borderWidth : 1,
        borderColor : Alloy.Styles.color.border.medium,
        visible : false
    });
    $.attributeRefinementLabel = Ti.UI.createLabel({
        text : refinement_name,
        left : 11,
        color : Alloy.Styles.accentColor,
        font : Alloy.Styles.detailLabelFont,
        accessibilityValue : 'attribute_filter_label',
        height : '100%',
        width : '100%'
    });

    // view that will contain the text and/or the color swatches
    $.chosenAttributeRefinementContainer = Ti.UI.createView({
        left : 60,
        width : 215,
        height : '100%',
        layout : 'horizontal'
    });

    // contains the text filters
    $.attributeRefinementLabelText = Ti.UI.createLabel({
        text : '',
        left : 0,
        color : Alloy.Styles.color.text.dark,
        font : Alloy.Styles.lineItemLabelFont,
        accessibilityValue : 'refinement_text',
    });

    // view for color swatches to flow correctly in view
    $.attributeRefinementColorViewContainer = Ti.UI.createView({
        layout : 'absolute',
        height : '100%',
        accessibilityLabel : 'refinement_color_container'
    });

    // contains the color swatches
    $.attributeRefinementColorView = Ti.UI.createView({
        layout : 'horizontal',
        left : 0,
        height : Ti.UI.SIZE,
        width : Ti.UI.SIZE,
        accessibilityLabel : 'refinement_color_' + refinement_id
    });

    // dropdown arrow image
    $.attributeRefinementImage = Ti.UI.createImageView({
        right : 10,
        height : 10,
        width : 15
    });
    Alloy.Globals.getImageViewImage($.attributeRefinementImage, Alloy.Styles.dropdownUpArrowImage);
    $.attributeRefinementButton.add($.attributeRefinementLabel);
    $.attributeRefinementButton.add($.chosenAttributeRefinementContainer);
    $.chosenAttributeRefinementContainer.add($.attributeRefinementLabelText);
    $.attributeRefinementColorViewContainer.add($.attributeRefinementColorView);
    $.chosenAttributeRefinementContainer.add($.attributeRefinementColorViewContainer);
    $.attributeRefinementButton.add($.attributeRefinementImage);

    $.attributeRefinementButton.addEventListener('click', onAttributeRefinementButtonClick);
    $.attributeRefinementColorViewContainer.addEventListener('click', onAttributeRefinementButtonClick);
    $.search_refinements.add($.attributeRefinementButton);

    $.attributesRefinementController = Alloy.createController('search/components/attributesRefinementPanel');
    $.attributesRefinementPanel = $.attributesRefinementController.getView();

    $.attributesRefinementPanel.refinement_id = refinement_id;
    $.attributesRefinementPanel.addEventListener('click', onAttributeRefinementPanelClick);

    $.refinement_panels.add($.attributesRefinementPanel);
    if (EAUtils.isSymbolBasedLanguage()) {
        $.attributeRefinementLabel.setFont(Alloy.Styles.detailInfoBoldFont);
    } else {
        $.attributeRefinementLabel.setFont(Alloy.Styles.detailLabelFont);
    }
}

/**
 * createSortingOptionsButton - creates a sorting options panel
 *
 * @api private
 */
function createSortingOptionsButton() {
    if ($.sortingOptionsButton) {
        return;
    }
    var refinement_id = 'sorting_options';
    var refinement_name = _L('Sort');

    $.sortingOptionsButton = Ti.UI.createView({
        width : 146,
        height : 35,
        left : 10,
        backgroundImage : Alloy.Styles.secondaryNavButtonImage,
        backgroundSelectedImage : Alloy.Styles.categoryButtonDownImage,
        backgroundFocusedImage : Alloy.Styles.categoryButtonDownImage,
        layout : 'absolute',
        borderWidth : 1,
        borderColor : Alloy.Styles.color.border.medium,
        visible : false
    });
    $.sortingOptionsLabel = Ti.UI.createLabel({
        text : '',
        left : 11,
        color : Alloy.Styles.color.text.dark,
        font : Alloy.Styles.lineItemLabelFont,
        accessibilityValue : 'sorting_options_label'
    });

    $.sortingOptionsImage = Ti.UI.createImageView({
        right : 10,
        height : 10,
        width : 15
    });
    Alloy.Globals.getImageViewImage($.sortingOptionsImage, Alloy.Styles.dropdownUpArrowImage);
    $.sortingOptionsButton.add($.sortingOptionsLabel);
    $.sortingOptionsButton.add($.sortingOptionsImage);

    $.sortingOptionsButton.addEventListener('click', onSortingOptionsButtonClick);
    $.search_refinements.add($.sortingOptionsButton);

    $.sortingOptionsController = Alloy.createController('search/components/sortingOptionsPanel');
    $.sortingOptionsPanel = $.sortingOptionsController.getView();

    $.sortingOptionsPanel.refinement_id = refinement_id;
    $.sortingOptionsPanel.addEventListener('click', onSortingOptionsPanelClick);
    var label = Ti.UI.createLabel({
        id : 'name',
        text : refinement_name
    });
    $.sortingOptionsPanel.add(label);
    $.refinement_panels.add($.sortingOptionsPanel);
}


/**
 * onProductSearchTotalChange - handle the product search event
 * and display the result_total_products label correctly depending on the number of products
 *
 * @api private
 */
function onProductSearchTotalChange() {
    var total = currentProductSearch.getTotal() || 0;
    var noun = (total == 1) ? _L('Product') : _L('Products');
    $.result_total_products.setText('' + currentProductSearch.getTotal() + ' ' + noun);
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * onProductSearchChangeRefinements - handles the product search when the refinement is changed
 * @param {Object} event
 * @api private
 */
function onProductSearchChangeRefinements() {
    var total = currentProductSearch.getTotal() || 0;

    var category_refinement,
        attribute_refinements = [],
        sorting_options;
    // Break up into category and attribute refinements
    var psr = currentProductSearch;
    psr.getRefinementsCollection().each(function(refinement) {
        if (refinement.getAttributeId() == 'cgid') {
            category_refinement = refinement;
        } else {
            attribute_refinements.push(refinement);
        }
    });

    if (category_refinement) {
        createCategoryRefinementButton(category_refinement);
        // show category_refinement
        logger.info('showing category refinement button');
        var selected_path = psr.getCategoryPath(true);
        var breadcrumb = _.map(selected_path, function(n) {
            return n.getLabel();
        }).join(' ' + _L('BreadCrumbSeparator') + ' ');
        $.categoryRefinementLabelText.setText(selected_path.length > 0 ? breadcrumb : '');

        $.categoryRefinementButton.setVisible(true);

        if (!psr.isEmptySearch()) {
            $.categoryRefinementButton.animate({
                left : 0
            });
        } else {
            $.categoryRefinementButton.animate({
                left : 472
            });
        }
    } else {
        // hide category_refinement
        logger.info('hiding category refinement button');
        if ($.categoryRefinementButton) {
            $.categoryRefinementButton.setVisible(false);
        }
    }

    if (attribute_refinements.length > 0) {
        createAttributeRefinementButton();
        // show attribute_refinement
        logger.info('showing attribute refinement button');
        var selectedRefinements = _.extend({}, psr.getSelectedRefinements());
        selectedRefinements.cgid &&
        delete selectedRefinements.cgid;
        var texts = [],
            text,
            va,
            vv,
            value_ids;
        var anyRefinements = false;

        _.each(_.keys(selectedRefinements), function(key) {
            if (key !== 'c_refinementColor') {
                va = psr.getRefinement(key);
                value_ids = selectedRefinements[key];
                _.each(value_ids.split('|'), function(value_id) {
                    vv = psr.getRefinementValue(key, value_id);
                    if (vv && vv.hasHitCount() && vv.getHitCount() > 0) {
                        texts.push(vv.getLabel());
                        anyRefinements = true;
                    }
                });
            }
        });
        text = texts.join(', ');
        $.attributeRefinementLabelText.setText(texts.length > 0 ? text : '');

        // use color swatches instead of color text
        var children = $.attributeRefinementColorView.getChildren();
        _.each(children, function(child) {
            $.attributeRefinementColorView.remove(child);
        });

        if (selectedRefinements.c_refinementColor) {
            var key = 'c_refinementColor';
            va = psr.getRefinement(key);
            value_ids = selectedRefinements[key];
            _.each(value_ids.split('|'), function(value_id) {
                vv = psr.getRefinementValue(key, value_id);
                var swatchProperty = Alloy.CFG.product_search.refinements.colorForPresentationID[vv.getPresentationId() || 'default'];
                if (vv && vv.hasHitCount() && vv.getHitCount() > 0) {
                    var view = Titanium.UI.createView({
                        width : 10,
                        height : 10,
                        left : anyRefinements ? 5 : 0,
                        bottom : 2,
                        top : 2,
                        accessibilityLabel : 'filter_color_' + value_id
                    });
                    view[swatchProperty.key] = swatchProperty.value;
                    $.attributeRefinementColorView.add(view);
                    anyRefinements = true;
                }
            });
        }

        if (!psr.isEmptySearch()) {
            $.attributeRefinementButton.setVisible(true);
        } else {
            $.attributeRefinementButton.setVisible(false);
        }
    } else {
        // hide attribute_refinement
        if ($.attributeRefinementButton) {
            logger.info('hiding attribute refinement button');
            $.attributeRefinementButton.setVisible(false);
        }
    }

    sorting_options = currentProductSearch.getSortingOptionsCollection();
    if (sorting_options.length > 0) {
        createSortingOptionsButton();

        // show sorting options
        logger.info('showing sorting options button');
        var option = psr.getSelectedSortingOption();
        var option_id = option ? option.getId() : null;
        var option_text = '';
        if (!option_id) {
            option_text = _L('Unsorted');
        } else {
            var selected_options = sorting_options.filter(function(option) {
                return option.getId() == option_id;
            });
            option_text = selected_options.length > 0 ? selected_options[0].getLabel() : option_id;
        }
        $.sortingOptionsLabel.setText(option_text);
        if (!psr.isEmptySearch()) {
            $.sortingOptionsButton.setVisible(true);
        } else {
            $.sortingOptionsButton.setVisible(false);
        }
    } else {
        // hide sorting options in case we go back to the home page, but only if the sorting options button was created
        if ($.sortingOptionsButton) {
            logger.info('hiding sorting options button');
            $.sortingOptionsButton.setVisible(false);
        }
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleOverlayClick - hides all the refinement panels
 *
 * @param {Object} event
 * @api private
 */
function handleOverlayClick(event) {
    if (event) {
        event.cancelBubble = true;
    }
    selectedPanelID = null;
    hideAllRefinementPanels();
    $.refinement_panels.setVisible(false);
    $.panel_backdrop.setVisible(false);
    setButtonColors('');
}

/**
 * handleRefinementClick - shows/hide the correct refinement panel
 * depending on if it is already visible or not.
 *
 * @param {Object} event
 * @api private
 */
function handleRefinementClick(event) {
    event.cancelBubble = true;
    logger.info('refinement button clicked: ' + event.refinement_id);
    // Look for associated panel
    var refinement_panel = getRefinementPanelWithRefinementID(event.refinement_id);

    // Already visible? Then toggle it and hide overlay
    if (refinement_panel && refinement_panel.visible == true) {
        refinement_panel.setVisible(false);
        $.refinement_panels.setVisible(false);
        $.panel_backdrop.setVisible(false);
        setButtonColors('');
        return;
    }
    // Hide all existing panels
    hideAllRefinementPanels();

    // Show panel with correct refinement_id
    $.panel_backdrop.setVisible(true);
    $.refinement_panels.setVisible(true);
    refinement_panel.setVisible(true);
    setButtonColors(event.refinement_id);
}

/**
 * onSortingOptionsPanelClick - handles the click on sorting options panel
 *
 * @param {Object} event
 * @api private
 */
function onSortingOptionsPanelClick(event) {
    event.cancelBubble = true;
    logger.info('received click: ' + JSON.stringify(event));
}


/**
 * onCategoryRefinementButtonClick - handles the click on category refinement button
 *
 * @param {Object} event
 * @api private
 */
function onCategoryRefinementButtonClick(event) {
    event.cancelBubble = true;

    if (Alloy.CFG.navigation.use_mega_menu) {
        // Already visible? Then toggle it and hide overlay
        if (selectedPanelID == 'cgid') {
            Alloy.eventDispatcher.trigger('site_map:hide');
            $.refinement_panels.setVisible(false);
            $.panel_backdrop.setVisible(false);
            selectedPanelID = null;
            setButtonColors('');
            return;
        }

        setButtonColors('cgid');
        hideAllRefinementPanels();
        selectedPanelID = 'cgid';
        Alloy.eventDispatcher.trigger('site_map:show', event);
    } else {
        handleRefinementClick({
            refinement_id : 'cgid'
        });
    }
}

/**
 * onCategoryRefinementPanelClick - handles the event on category refinement panel
 *
 * @param {Object} event
 * @api private
 */
function onCategoryRefinementPanelClick(event) {
    event.cancelBubble = true;
}

/**
 * onSortingOptionsButtonClick - handles the event when clicked on the
 * sorting options and trigger an event to refine the products based on that.
 *
 * @param {Object} event
 */
function onSortingOptionsButtonClick(event) {
    event.cancelBubble = true;
    handleRefinementClick({
        refinement_id : 'sorting_options'
    });
}

/**
 * onAttributeRefinementButtonClick - Handles the event when clicked on attribute refinement
 * and filter the product that matches the refinement
 *
 * @param {Object} event
 * @api private
 */
function onAttributeRefinementButtonClick(event) {
    event.cancelBubble = true;
    handleRefinementClick({
        refinement_id : 'attributes'
    });
}

/**
 * onAttributeRefinementPanelClick - handles the click on attribute refinement panel
 *
 * @param {Object} event
 */
function onAttributeRefinementPanelClick(event) {
    event.cancelBubble = true;
    logger.info('received click: ' + JSON.stringify(event));
}
