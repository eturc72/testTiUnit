// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/search/index.js - panel for search either showing product or category grid
 */

//---------------------------------------------------
// ## VARIABLES

var animation = require('alloy/animation');
var logger = require('logging')('search:index', getFullControllerPath($.__controllerPath));

var currentSearch = Alloy.Models.productSearch;
var categoryModel = Alloy.Models.category;

var MAX_PAGES = 48;

var MODE_CATEGORY = 'category';
var MODE_PRODUCTS = 'products';

var pagingControls = null;
var PagingControl = require('PagingControl');

var gridMode;

var productGridPages = [];

//---------------------------------------------------
// ## APP LISTENERS

$.listenTo(Alloy.eventDispatcher, 'configurations:postlogin', onConfigurationsLoaded);

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.scrollableContainer.addEventListener('product:select', handleProductSelection);
$.scrollableContainer.addEventListener('product:zoom', handleProductZoomSelection);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(currentSearch, 'change', onCurrentSearchChange);

//---------------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @return {Deferred} promise
 * @api public
 */
function init(query) {
    logger.trace('init start');

    var deferred = new _.Deferred();

    // Only initiate a search if given a query ...
    if (!query) {
        deferred.reject();
    } else if (query.category_id == Alloy.CFG.root_category_id && query.query == '') {
        // want to render a categoryGrid instead ...
        if (gridMode == MODE_CATEGORY) {
            // already at 'home'
            deferred.resolveWith(currentSearch, [currentSearch]);
        } else {
            gridMode = MODE_CATEGORY;
            logger.trace('init fetch before');
            currentSearch.emptySearch().done(function() {
                logger.trace('init fetch start');
                deferred.resolveWith(currentSearch, [currentSearch]);
                logger.trace('init fetch end');
            });

        }
    } else {
        // want to render a product search
        gridMode = MODE_PRODUCTS;
        var psr = currentSearch.simpleClone();

        var sel_refinements = {};
        if (query.category_id) {
            sel_refinements.cgid = query.category_id;
            psr.set('selected_refinements', sel_refinements, {
                silent : true
            });
            delete query.category_id;
        } else {
            sel_refinements.cgid = Alloy.CFG.root_category_id;
        }
        query = _.extend({
            count : Alloy.CFG.product_search.search_products_returned
        }, query);

        psr.set(query, {
            silent : true
        });

        logger.trace('init fetch before');
        psr.fetch({
            silent : true
        }).done(function() {
            logger.trace('init fetch start');
            var count = psr.getCount();
            if (count == 1) {
                // redirect to product with product id from single hit and query
                // i.e.; (0U812, my search query) or (0U812, 012345678912)
                var productId = psr.getHits()[0].getProductId();
                handleProductSelection({
                    product_id : productId,
                    variant_id : psr.getQuery()
                });
                deferred.rejectWith(psr, [psr]);
            } else if (count == 0) {
                // No results, show dialog again with no results message
                // setTimeout() avoids animation error (opening while closing)
                var message,
                    query = psr.getQuery();
                if (query) {
                    message = String.format(_L('No results found for \'%s\'\nTry a new search or click the home button to browse catalog'), query);
                } else {
                    message = _L('No results found\nTry a new search or click the home button to browse catalog');
                }
                setTimeout(function() {
                    Alloy.Router.presentProductSearchDrawer({
                        message : message
                    });
                }, 300);

                deferred.rejectWith(psr, [psr]);
            } else {

                // Handle use case for Products Collection call to replace product_hits info

                // We need initialize, because the fetch didn't happen on the PS object ...
                currentSearch.initialize();
                currentSearch.set(psr.toJSON());

                deferred.resolveWith(currentSearch, [currentSearch]);
            }
            logger.trace('init fetch end');
        }).fail(function() {
            setTimeout(function() {
                Alloy.Router.presentProductSearchDrawer({
                    message : _L('Unable to search products.')
                });
            }, 300);
            deferred.reject();
        });
    }
    logger.trace('init end');
    return deferred.promise();
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('DEINIT called');
    $.searchHeader.deinit();
    if (Alloy.CFG.navigation.use_mega_menu) {
        $.megaMenu.deinit();
    }
    // this will clean up product grids and category grids and call deinit for those
    removeAllExistingHitsViews();
    removeAllChildren($.scrollableContainer);
    removeAllChildren($.contents);
    $.scrollableContainer.removeEventListener('product:select', handleProductSelection);
    $.scrollableContainer.removeEventListener('product:zoom', handleProductZoomSelection);
    $.stopListening();
    $.destroy();
}

//----------------------------------------------
// ## FUNCTIONS

/**
 * renderCategoryGrid - Renders the category grid
 *
 * @api private
 */
function renderCategoryGrid() {
    logger.trace('renderCategoryGrid start');

    var categoryGrid = Alloy.createController('search/components/categoryGrid', {
        id : Alloy.CFG.root_category_id,
        $model : categoryModel
    });
    var scrollingContainer = Ti.UI.createScrollView({
        showHorizontalIndicator : false,
        showVerticalIndicator : true,
        contentHeight : 'auto'
    });
    scrollingContainer.add(categoryGrid.getView());
    scrollingContainer.category_id = Alloy.CFG.root_category_id;

    updateView(scrollingContainer);

    // do this after updateView otherwise it will get cleaned up
    $.categoryGrid = categoryGrid;

    logger.trace('renderCategoryGrid end');
}

/**
 * renderProductGrid - Renders the product grid
 *
 * @api private
 */
function renderProductGrid() {
    logger.trace('render start search index');

    // render UI based on model state
    var total = currentSearch.getTotal(),
        count = currentSearch.getCount(),
        productGrid,
        query = currentSearch.getQuery(),
        scrollToResults = false;
    var perPage = Alloy.CFG.product_search.products_per_page || 8,
        left =
        total,
        offset = 0;

    if (total == 1 && !currentSearch.force) {
        // A product search result of one will just redirect to a PDP page
        return;
    } else if (count == 0) {
        // No results, show dialog again with no results message
        // setTimeout() avoids animation error (opening while closing)
        var message;
        if (query) {
            message = String.format(_L('No results found for \'%s\'\nTry a new search or click the home button to browse catalog'), query);
        } else {
            message = _L('No results found\nTry a new search or click the home button to browse catalog');
        }
        setTimeout(function() {
            Alloy.Router.presentProductSearchDrawer({
                message : message
            });
        }, 300);
        return;
    }

    if (query && query.length > 0) {
        scrollToResults = true;
    }

    if (Alloy.Platform == 'iphone') {
        perPage = 4;
    }

    var adjustedOffset,
        gridViews = [],
        count = 0,
        batch;
    var pGridPages = [];
    while (left > 0 && offset < (perPage * MAX_PAGES)) {
        adjustedOffset = offset;
        while (adjustedOffset >= Alloy.CFG.product_search.search_products_returned) {
            adjustedOffset -= Alloy.CFG.product_search.search_products_returned;
        }

        batch = Math.floor(offset / Alloy.CFG.product_search.search_products_returned);

        productGrid = Alloy.createController('search/components/productGrid', {
            offset : adjustedOffset,
            $model : (offset < Alloy.CFG.product_search.search_products_returned) ? currentSearch : currentSearch.batchSearch(batch)
        });
        pGridPages.push(productGrid);
        gridViews.push(productGrid.getView());

        left -= perPage;
        offset += perPage;
    }
    updateView(gridViews);

    productGridPages = pGridPages;

    if ($.scrollableHits.getCurrentPage() == 0) {
        // load the next page so that when swiping the next page will be ready and you won't see a white screen
        setTimeout(function() {
            ensureResultsExistForPage(1);
            setTimeout(function() {
                ensureResultsExistForPage(2);
            }, 0);
        }, 0);
    }
    logger.trace('render end search index');
}

/**
 * deinitProductGrids - Deinit all the existing product grids
 *
 * @api private
 */
function deinitProductGrids() {
    _.each(productGridPages, function(pGridController) {
        pGridController.deinit();
    });
    productGridPages = [];
}

//---------------------------------
// Utility functions

/**
 * updateView - Updates the view with the new view
 *
 * @param {Object} newView
 * @api private
 */
function updateView(newView) {
    logger.info('updateView called current page ' + $.scrollableHits.getCurrentPage());
    removeAllExistingHitsViews();
    var newScrollable = Ti.UI.createScrollableView({
        showPagingControl : false,
        id : 'scrollableHits'
    });
    if (_.isArray(newView)) {
        newScrollable.setViews(newView);
    } else {
        newScrollable.addView(newView);
    }

    $.scrollableContainer.remove($.scrollableHits);
    $.scrollableHits = null;
    $.scrollableHits = newScrollable;
    $.scrollableHits.addEventListener('pagechanged', handlePageChangedEvent);

    $.scrollableContainer.add($.scrollableHits);

    showPagingControlIfNecessary($.scrollableHits);
}

/**
 * removeAllExistingHitsViews - loops through all the scrollableHits.views, removing them
 *
 * @api private
 */
function removeAllExistingHitsViews() {
    logger.trace('removeAllExistingHitsViews start');
    $.categoryGrid && $.categoryGrid.deinit();
    $.scrollableHits.setCurrentPage(0);
    $.scrollableHits.removeEventListener('pagechanged', handlePageChangedEvent);

    _.each($.scrollableHits.views, function(view) {
        $.scrollableHits.removeView(view);
        view = null;
    });
    $.scrollableHits.views = [];

    if (pagingControls) {
        $.contents.remove(pagingControls.getView());
        pagingControls.deinit();
        pagingControls = null;
    }
    deinitProductGrids();
    logger.trace('removeAllExistingHitsViews end');
}

/**
 * showPagingControlIfNecessary - determines whether or not to show the paging control
 *
 * @param {Object} scrollableView the view to set
 * @api private
 */
function showPagingControlIfNecessary(scrollableView) {
    if (scrollableView.views && scrollableView.views.length > 1) {
        pagingControls = new PagingControl(scrollableView);
        $.contents.add(pagingControls.getView());
    } else {
        scrollableView.showPagingControl = false;
        pagingControls = null;
    }
}

/**
 * ensureResultsExistForPage - ensure there are products for that page
 *
 * @param {Object} page
 * @api private
 */
function ensureResultsExistForPage(page) {
    if (page < 1) {
        return;
    }
    var productGrid = $.scrollableHits.views[page];
    // load the model data for the next page
    setTimeout(function() {
        if (productGrid && productGrid.loadPage) {
            productGrid.loadPage();
        }
    }, 0);
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleCategorySelection - add category selection event handler
 *
 * @param {Object} event
 * @api private
 */
function handleCategorySelection(event) {
    logger.info('handleCategorySelection: ' + event.category_id);

    Alloy.Router.navigateToProductSearch({
        query : '',
        category_id : event.category_id
    });
}

/// Product Tile Selection EventHandler

/**
 * handleProductSelection - handle when product tile is clicked
 * and navigate to the product detail page for the particular product and variant
 *
 * @param {Object} event
 * @api private
 */
function handleProductSelection(event) {
    logger.info('product selection');
    Alloy.Router.navigateToProduct({
        product_id : event.product_id,
        variant_id : event.variant_id
    });
}

/**
 * handleProductZoomSelection - handle when the image zoom icon is tapped
 *
 * @param {Object} event information to get the product id from
 * @api private
 */
function handleProductZoomSelection(event) {
    logger.trace('handleProductZoomSelection start');

    Alloy.Dialog.showCustomDialog({
        controllerPath : 'product/images/imageZoom',
        initOptions : {
            product_id : event.product_id
        },
        continueEvent : 'image_zoom:dismiss'
    });

    logger.trace('handleProductZoomSelection end');
}

/**
 * handlePageChangedEvent - handle when the page in the product grid is changed
 *
 * @param {Object} event
 * @api private
 */
function handlePageChangedEvent(event) {
    logger.trace('**handlePageChanged currentPage ' + event.currentPage);
    var productGrid = $.scrollableHits.views[event.currentPage];
    if (productGrid) {
        productGrid.renderPage();
    }
    // load the model data for the next page
    ensureResultsExistForPage(event.currentPage + 2);
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * onCurrentSearchChange - Change the category based on the selected refinements
 *
 * @param {Object} model
 * @api private
 */
function onCurrentSearchChange(model) {
    // Only listening for 2 things ...
    if (!model.changed.query && !model.changed.selected_refinements) {
        return;
    }
    logger.info('received change:selected_refinements');
    var is_empty = currentSearch.isEmptySearch();
    if (is_empty) {
        categoryModel.attributes.id = Alloy.CFG.root_category_id;
        categoryModel.fetch().done(function() {
            renderCategoryGrid();
        });
    } else {
        renderProductGrid();
    }
}

/**
 * onConfigurationsLoaded - handle the post login configurations
 *
 * @api private
 */
function onConfigurationsLoaded() {
    if (Alloy.CFG.navigation.use_mega_menu) {
        $.megaMenu.init();
    }
}
