// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/components/productGrid.js - controller for displaying product tiles on search results page
 */

//---------------------------------------------------
// ## VARIABLES

var args = arguments[0] || {};
var logger = require('logging')('search:components:productGrid', getFullControllerPath($.__controllerPath));

var $model = $model || args.product_search_result;
var offset = args.offset || 0;
var hasRendered = false;
var allTiles = [];
var layoutProperties = {
    aspect : {
        width : 217,
        height : 271
    },
    // Spacing in between tiles at max size
    spacing : {
        width : 31,
        height : 31
    },
    // Spacing outside grid perimeter (padding)
    min_padding : {
        width : 31,
        height : 31
    },
    // Form factor/orientation specific maximum columns settings
    fixed_num_cols : {
        phone : {
            portrait : {
                width : 2,
                height : 2
            },
            landscape : {
                width : 4,
                height : 1
            }
        },
        tablet : {
            portrait : {
                width : 3,
                height : 3
            },
            landscape : {
                width : 4,
                height : 2
            }
        }
    },
    max_heights : {
        phone : {
            portrait : {
                width : 320,
                height : 314
            },
            landscape : {
                width : 480,
                height : 154
            }
        },
        tablet : {
            portrait : {
                width : 768,
                height : 858
            },
            landscape : {
                width : 1024,
                height : 643
            }
        }
    }
};

//----------------------------------------------
// ## PUBLIC API

exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 * @return {Deferred} promise
 * @api private
 */
function init() {
    logger.trace('init start ' + getPageNumber());
    var pageLoad = new _.Deferred();
    var promise = $model.fetch();

    promise.done(function() {
        pageLoad.resolve();
    });
    promise.fail(function(response, status, err) {
        logger.info('model fetch failed! \nmessage: ' + response.statusText + '\nerror: ' + err);
        pageLoad.reject();
    });

    logger.trace('init end ' + getPageNumber());
    return pageLoad.promise();
}

/**
 * RENDER
 *
 * @param {Object} options - optional portrait
 * @return {Deferred} promise
 * @api private
 */
function render(options) {
    logger.trace('render start ' + getPageNumber());

    var hits = $model.getHits();
    var hitsLength = hits.length;
    if (hitsLength == 0) {
        var pageRender = new _.Deferred();
        var onModelChange = function() {
            $.stopListening($model, 'change', onModelChange);
            render({
                type : 'orient',
                portrait : false
            });
            pageRender.resolve();
        };
        $.listenTo($model, 'change', onModelChange);
        return pageRender.promise();
    }

    // # These are configurable settings:

    // Size of tile at maximum size
    var aspect = layoutProperties.aspect,

    // Spacing in between tiles at max size
        spacing = layoutProperties.spacing,

    // Spacing outside grid perimeter (padding)
        min_padding = layoutProperties.min_padding,

    // Form factor/orientation specific maximum columns settings
        fixed_num_cols = layoutProperties.fixed_num_cols;

    // Calculate ideal grid dimensions
    var num_cols = Alloy.Platform == 'ipad' ? fixed_num_cols.tablet : fixed_num_cols.phone,
        row,
        col;
    num_cols = options.portrait ? num_cols.portrait.width : num_cols.landscape.width;

    // Now we can calculate number of rows needed
    var num_rows = Alloy.Platform == 'ipad' ? fixed_num_cols.tablet : fixed_num_cols.phone;
    num_rows = options.portrait ? num_rows.portrait.height : num_rows.landscape.height;

    // parent view dimensions for orientation/form factor
    var max_heights = layoutProperties.max_heights,
        my_max_heights = Alloy.Platform == 'ipad' ? max_heights.tablet : max_heights.phone;

    var parent_width = options.portrait ? my_max_heights.portrait.width : my_max_heights.landscape.width;
    var parent_height = options.portrait ? my_max_heights.portrait.height : my_max_heights.landscape.height;

    // get total width for configuration and map it to the available width
    var total_width = num_cols * (aspect.width + spacing.width) - spacing.width;
    var total_height = num_rows * (aspect.height + spacing.height) - spacing.height;
    var bound_width = parent_width - 2 * min_padding.width;

    // figure out scalar to map computed grid to current view width
    var scalar_width = 1,
        scalar_height = 1,
        scalar = 1,
        fit_height = true;

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
        hit,
        length,
        num_tiles = num_cols * num_rows;
    for (var i = 0,
        ii =
        hitsLength; i < ii; i++) {
        if (i > (num_tiles - 1)) {
            break;
        }

        length = hitsLength - offset;
        if (length > num_tiles) {
            length = num_tiles;
        }
        if (hitsLength >= num_tiles) {
            length = num_tiles;
        }

        hit = hits[i + offset];

        row = Math.floor(i / num_cols);
        col = i % num_cols;

        if (hit) {
            // Only create tiles the first time through
            if ($.productGridContainer.children.length > i) {
                tileView = $.productGridContainer.children[i];
            } else {
                var tileController = Alloy.createController('search/components/productTile', {
                    hit : hit,
                    index : i
                });
                tileView = tileController.getView();
                allTiles.push(tileController);
            }

            // This does the sizing and positioning for each tile
            tileView.left = offsetX + col * scalar * (aspect.width + spacing.width);
            tileView.top = offsetY + row * scalar * (aspect.height + spacing.height);
            //tileView.width = scaled_aspect.width;
            //tileView.height = scaled_aspect.height;

            // Only add a tile the first time
            if ($.productGridContainer.children.length <= i) {
                $.productGridContainer.add(tileView);
            }
        }
    }
    logger.trace('render end ' + getPageNumber());
    hasRendered = true;
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.productGrid.loadPage = null;
    $.productGrid.renderPage = null;
    _.each(allTiles, function(tileController) {
        tileController.deinit();
    });
    allTiles = [];
    $.stopListening();
    removeAllChildren($.productGridContainer);
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * getPageNumber - return page number
 * @return {Number}
 * @api private
 */
function getPageNumber() {
    return Math.floor($model.getStart() / Alloy.CFG.product_search.search_products_returned);
}

/**
 * loadPage - Load product grid page
 *
 * @return {Deferred} promise or null
 * @api public
 */
function loadPage() {
    var hits = $model.getHits();
    if (!($model && hits && hits.length > 0)) {
        // this will load the models and not render
        return init();
    }
}

/**
 * renderPage - Will render the page if it hasn't already been rendered
 *
 * @return {Deferred} promise or null
 * @api public
 */
function renderPage() {
    if (!hasRendered) {
        return render({
            type : 'orient',
            portrait : false
        });
    }
}

//---------------------------------------------------
// ## CONSTRUCTOR

// For the first page we already have the model results so we should just render
var hits = $model.getHits();
if ($model && hits && hits.length > 0) {
    render({
        type : 'orient',
        portrait : false
    });
}

$.productGrid.loadPage = loadPage;

$.productGrid.renderPage = renderPage;

