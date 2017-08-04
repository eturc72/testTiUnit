// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/PagingControl.js - Functions for creating/using the paging control dots at the bottom of the screen
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('application:PagingControl', 'app/lib/PagingControl');

function PagingControl(scrollableView) {
    var viewNumber = 0;

    //---------------------------------------------------
    // ## UI EVENT HANDLER FUNCTIONS

    /**
     * scrollEventHandler - scoll handler on view
     *
     * @api public
     */
    this.scrollEventHandler = function(event) {
        var currentPage = event.currentPage;
        if (currentPage >= 0 && viewNumber != currentPage) {
            logger.trace('***firing pagechanged ' + currentPage);
            scrollableView.fireEvent('pagechanged', event);
            viewNumber = currentPage;
        }
    };
    scrollableView.addEventListener('scroll', this.scrollEventHandler);

    /**
     * pageChangedEventHandler - page has changed
     *
     * @api public
     */
    this.pageChangedEventHandler = function(event) {
        // Go through each and reset it's opacity
        for (var i = 0; i < numberOfPages; i++) {
            pages[i].setOpacity(0.5);
        }

        // Bump the opacity of the new current page
        if (event.currentPage < pages.length) {
            pages[event.currentPage].setOpacity(1);
        } else {
            logger.error('The event.currentPage was greater than the number of pages?');
        }
    };
    scrollableView.addEventListener('pagechanged', this.pageChangedEventHandler);

    var numberOfPages = scrollableView.getViews().length;

    this.container = Titanium.UI.createView({
        height : 60,
        width : Ti.UI.SIZE,
        top : 595,
    });

    // Keep a global reference of the available pages
    var pages = [];
    // without this, the current page won't work on future references of the module
    var pageClickEventHandlers = [];
    // Go through each of the current pages available in the scrollableView
    for (var i = 0; i < numberOfPages; i++) {
        var page = Titanium.UI.createView({
            borderRadius : 4,
            width : 8,
            height : 8,
            left : 15 * i,
            backgroundColor : Alloy.Styles.accentColor,
            opacity : 0.5,
            pageIndex : i,
            accessibilityLabel : 'page_' + i
        });
        pageClickEventHandlers.push(function(event) {
            var halfWay = scrollableView.views.length / 2,
                curPage = scrollableView.currentPage;
            if ('pageIndex' in event.source) {
                if (event.source.pageIndex >= halfWay) {
                    if ((curPage + 1) < scrollableView.views.length) {
                        scrollableView.scrollToView(curPage + 1);
                        scrollableView.fireEvent('pagechanged', {
                            currentPage : curPage + 1
                        });
                    }
                } else if (curPage >= 1) {
                    scrollableView.scrollToView(curPage - 1);
                    scrollableView.fireEvent('pagechanged', {
                        currentPage : curPage - 1
                    });
                }
            }
        });
        page.addEventListener('click', pageClickEventHandlers[pageClickEventHandlers.length - 1]);

        // Store a reference to this view
        pages.push(page);

        // Add it to the container
        this.container.add(page);
    }

    pages[0].setOpacity(1);
    this.pages = pages;
    this.pageClickEventHandlers = pageClickEventHandlers;
    this.scrollableView = scrollableView;
};

/**
 * DEINIT
 *
 * @api public
 */
PagingControl.prototype.deinit = function() {
    logger.info('DEINIT called');
    this.scrollableView.removeEventListener('scroll', this.scrollEventHandler);
    this.scrollableView.removeEventListener('pagechanged', this.pageChangedEventHandler);
    var pageClickEventHandlers = this.pageClickEventHandlers;
    _.each(this.pages, function(currentPage, index) {
        currentPage.removeEventListener('click', pageClickEventHandlers[index]);
    });
    _.each(this.container.views, function(view) {
        this.container.removeView(view);
        view = null;
    });
    this.container = null;
    this.pages = [];
    this.pageClickEventHandlers = pageClickEventHandlers = [];
    this.scrollEventHandler = null;
    this.pageChangedEventHandler = null;
    this.scrollableView = null;
};


/**
 * getView - return the view
 *
 * @api public
 */
PagingControl.prototype.getView = function() {
    return this.container;
};

module.exports = PagingControl;
