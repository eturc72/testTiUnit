// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/tabs/recommendations.js - controller for product recommendations tab on PDP
 */

//---------------------------------------------------
// ## VARIABLES

var eaUtils = require('EAUtils');
var PagingControl = require('PagingControl');
var previouslyFetchedId = null;
var args = arguments[0] || {},
    currentProduct = args.product || Alloy.Models.product;
var logger = require('logging')('product:tabs:recommendations', getFullControllerPath($.__controllerPath));

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
    if (!currentProduct.recommendations) {
        return;
    }

    var def = new _.Deferred();
    var id = currentProduct.getId();
    // don't fetch recommendations if already fetched
    if (previouslyFetchedId == id) {
        def.resolve();
        return def.promise();
    }

    Alloy.Router.showActivityIndicator(def);
    currentProduct.recommendations.getRecommendations(id).done(function() {
        previouslyFetchedId = id;
        render();
        def.resolve();
    }).fail(function() {
        def.reject();
    });
    return def.promise();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');
    var recommendedItems = currentProduct.recommendations ? currentProduct.recommendations.getRecommendedItems() : null;

    if (!recommendedItems || !recommendedItems.length) {
        logger.info('NO RECOMMENDED ITEMS!');
        $.no_recommendations_container.setVisible(true);
        $.container.setVisible(false);
        $.container.setHeight(0);
        return;
    }
    $.no_recommendations_container.setVisible(false);
    $.no_recommendations_container.setHeight(0);
    $.container.setVisible(true);
    var recConfig = eaUtils.getConfigValue('product.recommendations', {});
    var item,
        itemIdx = 0,
        page = 0,
        pageViews = [],
        itemCount = recommendedItems.length,
        rows = recConfig.gridRows || 2,
        columns = recConfig.gridColumns || 3,
        tileWidth = recConfig.tileImageWidth || 176,
        tileHeight = recConfig.tileImageHeight || 221,
        tilePadding = recConfig.tilePadding || 20,
        pages = Math.ceil(itemCount / (rows * columns));

    var fieldmap = {
        id : 'recommended_item_id',
        name : 'name'
    };

    var tileProperties = {
        imageWidth : tileWidth,
        title : {
            font : Alloy.Styles.smallerAccentFont,
            minimumFontSize : '12pt',
            ellipsize : true,
            wordWrap : false
        },

        price : {
            font : Alloy.Styles.lineItemFont,
            minimumFontSize : '12pt',
            ellipsize : true,
            wordWrap : false
        }
    };

    _.times(pages, function() {
        // build each page

        var pageView = Ti.UI.createView($.createStyle({
            classes : ['page_view'],
            apiName : 'View'
        }));

        // create rows
        _.times(rows, function() {
            var rowView = Ti.UI.createView($.createStyle({
                classes : ['row_view'],
                apiName : 'View',
                top : recConfig.rowPadding,
                height : tileHeight
            }));

            // create columns
            var c = 0;
            while (columns > c++ && ( item = recommendedItems.at(itemIdx++))) {

                var tileView = Alloy.createController('search/components/productTile', {
                    hit : item,
                    index : itemIdx,
                    fieldmap : fieldmap,
                    tileProperties : tileProperties,
                    includeMagnifyingGlass : false
                }).getView();

                tileView.setHeight(tileHeight);
                tileView.setWidth(tileWidth);
                tileView.setLeft(c > 1 ? tilePadding : 0);
                tileView.setTop(0);

                rowView.add(tileView);
            }

            pageView.add(rowView);
        });

        // add page to scrollable view
        pageViews.push(pageView);
    });

    var recommendedScroller = Ti.UI.createScrollableView($.createStyle({
        views : pageViews,
        classes : ['recommended_scroller'],
        apiName : 'ScrollableView',
        showPagingControl : false,
        height : Ti.UI.SIZE,
        overlayEnabled : false
    }));

    recommendedScroller.addEventListener('product:select', recommendedScrollerEventHandler);

    $.recommendations_scroller_container.add(recommendedScroller);

    if (pages > 1) {

        var pagingControls = new PagingControl(recommendedScroller);
        var pagingView = pagingControls.getView();
        $.paging_container.setWidth((tileWidth * columns) + (tilePadding * (columns - 1)));
        pagingView.applyProperties({
            top : 20
        });
        $.paging_container.add(pagingView);
    }
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    if ($.recommendations_scroller_container.children && $.recommendations_scroller_container.children[0]) {
        $.recommendations_scroller_container.children[0].removeEventListener('product:select', recommendedScrollerEventHandler);
    }
    removeAllChildren($.recommendations_scroller_container);
    removeAllChildren($.paging_container);
    $.destroy();
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * recommendedScrollerEventHandler - event listener for recommendations page scrolling
 *
 * @param {Object} event
 * @api private
 */
function recommendedScrollerEventHandler(event) {
    logger.info('Recommendation selected: ', event.product_id);
    Alloy.Router.navigateToProduct({
        product_id : event.product_id
    });
}

