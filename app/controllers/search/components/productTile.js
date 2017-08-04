// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/productTile.js - tile on product grid for a specific product in search results
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var animation = require('alloy/animation');
var logger = require('logging')('search:components:productTile', getFullControllerPath($.__controllerPath));

var args = arguments[0] || {},
    loading = false,
    hit = args.hit || {},
    index = args.index || 0,
    fieldmap = args.fieldmap || {},
    productId = hit.get(fieldmap.id || 'product_id'),
    name = hit.get(fieldmap.name || 'product_name'),
    price = hit.get(fieldmap.price || 'price'),
    prices = hit.get(fieldmap.prices || 'prices'),
    price_max = hit.get(fieldmap.priceMax || 'price_max'),
    tileProperties = args.tileProperties || {},
    priceText = '',
    maxPriceText = '',
    onBadgeContainerClick,
    badgeContainer,
    includeMagnifyingGlass = args.hasOwnProperty('includeMagnifyingGlass') ? args.includeMagnifyingGlass : true;

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @api public
 */
function init() {
    logger.info('INIT called');
    if (tileProperties.imageWidth) {
        $.tile_image.setWidth(tileProperties.imageWidth);
    }
    if (tileProperties.imageHeight) {
        $.tile_image.setHeight(tileProperties.imageHeight);
    }

    $.tile_name.setText(name);

    var prod_tile_label_base = 'product_tile_' + productId;

    $.tile_image.setAccessibilityLabel(prod_tile_label_base + '_image');
    $.tile_name.setAccessibilityValue(prod_tile_label_base + '_name');
    $.sale_price.setAccessibilityValue(prod_tile_label_base + '_price');

    if (tileProperties.title) {
        $.tile_name.applyProperties(tileProperties.title);
    }

    // Make sure price is not null and is a valid number.
    // A price of $0 may be valid when a promotion is applied
    if (price !== null || !isNaN(price)) {
        priceText += eaUtils.toCurrency(price);
        $.sale_price.setText(priceText);
    }
    var listPriceBook = Alloy.CFG.country_configuration[Alloy.CFG.countrySelected].list_price_book;
    // this is to check if there is a list price for the product, so we are striking out the list price and displaying sale price
    if (prices && prices[listPriceBook] && price != prices[listPriceBook]) {
        $.list_price.setText(eaUtils.toCurrency(prices[listPriceBook]));
        eaUtils.strikeThrough($.list_price, $.list_price.getText());
    }

    if (price_max) {
        maxPriceText += eaUtils.toCurrency(price_max);
        $.sale_price.setText(priceText + ' - ' + maxPriceText);
    }

    if (tileProperties.price) {
        $.sale_price.applyProperties(tileProperties.price);
    }

    var priceSize = $.sale_price.text.length;

    var colors = 0;
    var vas = hit.getVariationAttributes();
    var colorAttribute = null;
    if (vas) {
        colorAttribute = _.first(vas.filter(function(va) {
            return va.get('id') == Alloy.CFG.product.color_attribute;
        }));
        colors = colorAttribute ? colorAttribute.get('values').length : 0;
    }

    // add in color swatches
    addColorSwatches(colorAttribute, colors, priceSize);

    // Add in magnifying glass
    if (includeMagnifyingGlass && Alloy.CFG.enable_zoom_image) {
        badgeContainer = Ti.UI.createView({
            layout : 'absolute',
            height : 60,
            width : 60,
            right : 0,
            top : 0,
            accessibilityLabel : 'product_tile_' + productId + '_zoom_container'
        });
        var magImage = Ti.UI.createImageView({
            width : 24,
            height : 24,
            top : 12,
            right : 15,
            zindex : 100,
            product_id : productId,
            accessibilityLabel : 'product_tile_' + productId + '_zoom_image'
        });
        Alloy.Globals.getImageViewImage(magImage, Alloy.Styles.zoomImage);
        badgeContainer.add(magImage);
        $.productTile.add(badgeContainer);
        onBadgeContainerClick = function(event) {
            event.cancelBubble = true;

            var matrix = Ti.UI.create2DMatrix();
            matrix = matrix.scale(0.9, 0.9);
            var a = Ti.UI.createAnimation({
                transform : matrix,
                duration : 100,
                autoreverse : true,
                repeat : 1
            });

            badgeContainer.animate(a);

            logger.info('triggering zoom: ' + productId);
            $.productTile.fireEvent('product:zoom', {
                product_id : productId
            });
        };
        badgeContainer.addEventListener('click', onBadgeContainerClick);
    }

    var prodId = (_.isFunction(hit.getProductId) && hit.getProductId()) ? hit.getProductId() : (hit.hasRecommendedItemId() ? hit.getRecommendedItemId() : '');
    var image;
    if (_.isFunction(hit.hasRecommendedItemId) && hit.hasRecommendedItemId()) {
        image = hit.getFirstImageFromImageGroup() || hit.getProductTileImage(prodId);
    } else {
        image = hit.getProductTileImage(prodId);
    }

    Alloy.Globals.getImageViewImage($.tile_image, image);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    $.productTile.removeEventListener('click', handleProductTileClick);
    // click event is workaround for click event not propogating to parent for STR-3174/AC-4385
    $.tile_image.removeEventListener('click', handleProductTileClick);
    $.stopListening();
    badgeContainer && badgeContainer.removeEventListener('click', onBadgeContainerClick);
    removeAllChildren($.productTile);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * addColorSwatches - add the color swatches
 * @param {Object} colorAttribute
 * @param {Object} colors
 * @param {Object} length
 * @api private
 */
function addColorSwatches(colorAttribute, colors, length) {
    var maxSwatches = 5;
    if (length > 5 && length < 10) {
        maxSwatches = 4;
    } else if (length >= 10 && length < 15) {
        maxSwatches = 3;
    } else if (length >= 15 && length < 20) {
        maxSwatches = 2;
    } else if (length >= 20) {
        maxSwatches = 1;
    }

    if (colors > 0) {
        // loop through all these and find the image swatch attribute in the values - the models in there will have an image_swatch with a link.
        var models = colorAttribute.get('values').models;
        var swatchImages = [];
        _.each(models, function(color) {
            if (color.hasImageSwatch() && color.getImageSwatch().hasLink()) {
                swatchImages.push(color.getImageSwatchLink());
            }
        });
        var offset = 0;
        var images = [];
        // if there are more than 5 swatches, add a label indicating how many more there are
        if (swatchImages.length > maxSwatches) {
            view = Titanium.UI.createLabel({
                width : 15,
                height : 10,
                right : 0,
                top : 0,
                text : '+' + (swatchImages.length - maxSwatches),
                font : Alloy.Styles.swatchFont,
                color : Alloy.Styles.color.text.dark,
                accessibilityLabel : 'product_tile_' + productId + '_swatch_plus_label',

            });
            $.swatch_container.add(view);
            offset = view.width + 5;
            images = swatchImages.slice(0, maxSwatches).reverse();
        } else {
            images = swatchImages.reverse();
        }

        // now add the swatch images
        for (var i = 0,
            n = images.length; i < n; ++i) {
            var view = Titanium.UI.createImageView({
                width : 13,
                height : 13,
                right : (15 * i) + offset,
                accessibilityLabel : 'product_tile_' + productId + '_swatch',
                top : 0

            });
            Alloy.Globals.getImageViewImage(view, images[i]);
            $.swatch_container.add(view);
        }
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleProductTileClick - handles the click event on Product tile
 * @param {Object} event
 * @api private
 */
function handleProductTileClick(event) {
    event.cancelBubble = true;

    var matrix = Ti.UI.create2DMatrix();
    matrix = matrix.scale(0.9, 0.9);
    var a = Ti.UI.createAnimation({
        transform : matrix,
        duration : 100,
        autoreverse : true,
        repeat : 1
    });

    $.productTile.animate(a);
    $.productTile.fireEvent('product:select', {
        product_id : productId
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();
