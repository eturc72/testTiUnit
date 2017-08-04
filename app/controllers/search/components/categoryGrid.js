// ©2013-2017 salesforce.com, inc. All rights reserved.

/**
 * controllers/search/components/categoryGrid.js  - controller for displaying category tiles on home page
 */


//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var $model = $model || args.category;
var logger = require('logging')('search:components:categoryGrid', getFullControllerPath($.__controllerPath));
var allTiles = [];

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER - Logic to handle geometry changes
 *
 * @param {Object} options - optional portrait
 * @api private
 */
function render(options) {
    logger.info('RENDER called');
    var subcategories = $model.getVisibleCategories();

    if (!subcategories) {
        return;
    }
    var subcatLength = subcategories.length;

    // These are configurable settings, from app/assets/config/category.js:
    // Each configuration is specific to device and orientation
    var grid_config = Alloy.CFG.category_grid;
    var aspect = grid_config.aspect;

    if (Alloy.isTablet) {
        grid_config = grid_config.tablet;
    } else {
        grid_config = grid_config.phone;
    }
    if (options.portrait) {
        grid_config = grid_config.portrait;
    } else {
        grid_config = grid_config.landscape;
    }

    var spacing = grid_config.spacing,
        min_padding = grid_config.min_padding,
        max_cols = grid_config.max_cols;

    // Calculate ideal grid dimentsions
    var num_cols = Math.ceil(Math.sqrt(subcatLength));
    var num_rows = Math.ceil(subcatLength / num_cols),
        row,
        col;
    var remainder = subcatLength % num_cols;

    // Try not to leave an orphan ...
    if (remainder == 1) {
        num_cols += 1;
    }

    // Switch on form factor & orientation
    if (num_cols > max_cols) {
        num_cols = max_cols;
    } else if (num_cols < 1) {
        num_cols = 1;
    }
    // Dont use more columns than we have subcategories
    if (num_cols > subcatLength) {
        num_cols = subcatLength;
    }

    // Now we can calculate number of rows needed
    num_rows = Math.ceil(subcatLength / num_cols);

    // parent view dimensions for orientation/form factor
    var parent_width = grid_config.max_bounds.width;
    var parent_height = grid_config.max_bounds.height;

    // get total width for configuration and map it to the available width
    var total_width = num_cols * (aspect.width + spacing.width) - spacing.width;
    var total_height = num_rows * (aspect.height + spacing.height) - spacing.height;
    var bound_width = parent_width - 2 * min_padding.width;

    // figure out scalar to map computed grid to current view width
    // Scale to height in landscape mode
    var scalar_width = 1,
        scalar_height = 1,
        scalar = 1,
        fit_height = grid_config.map_to_height;

    if (total_width > bound_width) {
        scalar_width = bound_width / total_width;
    }
    var mapped_height = total_height * scalar_width;
    var bound_height = parent_height - 2 * min_padding.height;
    if (fit_height && mapped_height > bound_height) {
        scalar_height = bound_height / mapped_height;
        bound_width = bound_width * scalar_height;
    } else {
        // Either not to fit or not too big
        bound_height = mapped_height;
    }
    scalar = scalar_height * scalar_width;
    var scaled_aspect = {
        width : aspect.width * scalar,
        height : aspect.height * scalar
    };

    var offsetX = (parent_width - bound_width) / 2;
    var offsetY = (parent_height - bound_height) / 2;

    var scroller_height = parent_height;
    if (bound_height > parent_height) {
        scroller_height = bound_height + 2 * min_padding.height;
        offsetY = min_padding.height;
    }

    var tileView,
        regionDef,
        subcategory;
    for (var i = 0,
        ii =
        subcatLength; i < ii; i++) {
        row = Math.floor(i / num_cols);
        col = i % num_cols;

        subcategory = subcategories[i];

        if (subcategory) {
            // Only create tiles the first time through
            if ($.categoryGrid.children.length > i) {
                tileView = $.categoryGrid.children[i];
            } else {
                tileController = Alloy.createController('search/components/categoryTile', {
                    category : subcategory,
                    index : i
                });
                tileView = tileController.getView();
                allTiles.push(tileController);
            }

            // This does the sizing and positioning for each tile
            tileView.left = offsetX + col * scalar * (aspect.width + spacing.width);
            tileView.top = offsetY + row * scalar * (aspect.height + spacing.height);
            tileView.width = scaled_aspect.width;
            tileView.height = scaled_aspect.height;

            // Only add a tile the first time
            if ($.categoryGrid.children.length <= i) {
                $.categoryGrid.add(tileView);
            }
        }
    }

    // if grid is too short, then adjust to match the parent view
    $.categoryGrid.setHeight(bound_height < parent_height ? parent_height : bound_height + 2 * scalar * min_padding.height);
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    removeAllChildren($.categoryGrid);
    _.each(allTiles, function(tileController) {
        tileController.deinit();
    });
    allTiles = [];
    $.destroy();
}

//----------------------------------------------
// ## CONSTRUCTOR

// This should always evaluate to true ...
if ($model && !$model.isNew()) {
    render({
        type : 'orient',
        portrait : false
    });
}
