// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/categoryTile.js - tile on category grid for a specific category
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var logger = require('logging')('search:components:categoryTile', getFullControllerPath($.__controllerPath));
var EAUtils = require('EAUtils');
var category = args.category;
var index = args.index;

//---------------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 * @api private
 */
function init() {
    var name = category.getName();
    var image = category.getCategoryTileImage();

    $.tile_name.setText(name);

    var cat_tile_label_base = 'category_tile_' + category.getId();

    $.categoryTile.setAccessibilityLabel(cat_tile_label_base);
    $.tile_image.setAccessibilityLabel(cat_tile_label_base + '_image');
    $.name_container.setAccessibilityLabel(cat_tile_label_base + '_name_container');
    $.tile_name.setAccessibilityLabel(cat_tile_label_base + '_name');

    Alloy.Globals.getImageViewImage($.tile_image, image);
    if (EAUtils.isLatinBasedLanguage()) {
        $.name_container.setWidth(190);
    }
}

/**
 * DEINIT
 * @api public
 */
function deinit() {
    $.categoryTile.removeEventListener('click', onCategoryClick);
    // click event is workaround for click event not propogating to parent for STR-3174/AC-4385
    $.tile_image.removeEventListener('click', onCategoryClick);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * onCategoryClick - category tile has been tapped
 * @param {Object} event
 * @api private
 */
function onCategoryClick(event) {
    event.cancelBubble = true;

    logger.info('singletapped on tile!' + JSON.stringify(event));

    var matrix = Ti.UI.create2DMatrix();
    matrix = matrix.scale(0.9, 0.9);

    $.categoryTile.animate({
        transform : matrix,
        duration : 100,
        autoreverse : true,
        repeat : 1
    }, function() {
        Alloy.Router.navigateToCategory({
            category_id : category.id
        });
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

init();
