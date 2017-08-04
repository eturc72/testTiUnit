// ©2015-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/reports/index.js - sales reports
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('reports:index', getFullControllerPath($.__controllerPath));
var associatetableShown = false;
var TIME_START_DAY = 'T00:00:00',
    TIME_END_DAY = 'T23:59:59';

var buildStorefrontURL = require('EAUtils').buildStorefrontURL;
var getUIObjectType = require('EAUtils').getUIObjectType;
var formatDate = require('EAUtils').formatDate;
var sendErrorToServer = require('EAUtils').sendErrorToServer;
var EAUtils = require('EAUtils');
var associateModel = Alloy.Models.associate;
var params = {
    employeeId : associateModel.getEmployeeId(),
    storeId : Alloy.CFG.store_id,
    loadEmployeeList : associateModel.hasStoreLevelSalesReportsPrivileges()
};
params = _.extend(params, EAUtils.getCurrencyConfiguration());
var filterModel = new Backbone.Model(params);

var associateCollection = new Backbone.Collection();

var pageLoadTries = Alloy.CFG.sales_reports.page_load_tries || 3;

var buttonStyle = {
    selected : {
        color : Alloy.Styles.color.background.white,
        backgroundColor : Alloy.Styles.accentColor
    },
    unselected : {
        color : Alloy.Styles.accentColor,
        backgroundColor : Alloy.Styles.color.background.white
    }

},
    chartViewStyle = {
    disableArea : {
        width : '100%',
        height : '100%'
    },
    enableArea : {
        width : '0%',
        height : '0%'
    }
};

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.date_filter_control.addEventListener('click', dateFilterControlClickHandler);
$.scrollable_view_control.addEventListener('click', scrollableViewControlClickHandler);
$.today.addEventListener('click', loadTodayReport);
$.week.addEventListener('click', loadThisWeek);
$.month.addEventListener('click', loadThisMonth);
$.quarter.addEventListener('click', loadThisQuater);
$.custom_date.addEventListener('click', showCustomDatePickerDialog);
$.close_icon.addEventListener('click', dismiss);

//---------------------------------------------------
// ## MODEL LISTENERS

$.listenTo(filterModel, 'change', loadReports);
if (associateModel.hasStoreLevelSalesReportsPrivileges()) {
    associateCollection.once('reset', renderAssociateTable);
}

//----------------------------------------------
// ## PUBLIC API

exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * INIT
 * @api public
 */
function init() {
    loadThisWeek();
}

/**
 * DEINIT
 * @api public
 */
function deinit() {
    logger.info('deinit');
    if (associateModel.hasStoreLevelSalesReportsPrivileges()) {
        $.assoc_table.removeEventListener('click', handleAssociateSelect);
        $.hamburger_menu.removeEventListener('click', revealAssociateList);
        $.sales_dashboard_overlay.removeEventListener('click', hideAssociateList);
        associateCollection.stopListening();
        $.assoc_table.setData([]);
        if (Alloy.CFG.sales_reports.enabled_charts.ranks) {
            $.rank_view_control.removeEventListener('click', rankViewControlClickHandler);
            $.associates_ranking.removeEventListener('click', onRankViewControlClick);
            $.ranking_web_view.removeEventListener('load', hideActivityIndicator);
            $.ranking_web_view.removeEventListener('error', showWebViewLoadError);
            $.ranking_web_view.removeEventListener('beforeLoad', showActivityIndicator);
            $.stores_ranking.removeEventListener('click', onRankViewControlClick);
            $.reload_rank_chart_button.removeEventListener('click', reloadRankChart);
            if (OS_ANDROID) {
                $.ranking_web_view.release();
            }
        }

    }

    $.sales_web_view.removeEventListener('load', onMainChartLoad);
    $.sales_web_view.removeEventListener('load', hideActivityIndicator);
    $.sales_web_view.removeEventListener('error', showWebViewLoadError);
    $.sales_web_view.removeEventListener('beforeLoad', showActivityIndicatorForPrimaryAndSecondaryWebView);
    $.reload_sales_chart_button.removeEventListener('click', reloadSalesChart);
    if (OS_ANDROID) {
        $.sales_web_view.release();
    }

    if (Alloy.CFG.sales_reports.enabled_charts.items_sold) {
        $.items_sold_web_view.removeEventListener('load', hideActivityIndicator);
        $.items_sold_web_view.removeEventListener('error', showWebViewLoadError);
        $.items_sold_web_view.removeEventListener('beforeLoad', showActivityIndicator);
        $.reload_product_sold_chart_button.removeEventListener('click', reloadItemsSoldChart);
        if (OS_ANDROID) {
            $.items_sold_web_view.release();
        }
    }

    $.date_filter_control.removeEventListener('click', dateFilterControlClickHandler);
    $.scrollable_view_control.removeEventListener('click', scrollableViewControlClickHandler);

    $.today.removeEventListener('click', loadTodayReport);
    $.week.removeEventListener('click', loadThisWeek);
    $.month.removeEventListener('click', loadThisMonth);
    $.quarter.removeEventListener('click', loadThisQuater);
    $.custom_date.removeEventListener('click', showCustomDatePickerDialog);
    $.close_icon.removeEventListener('click', dismiss);

    $.stopListening();
    $.destroy();
    $.scrollable_web_view_container.views = [];
    //release children views of scrollableView
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * buildWebViewURL - Build URL for webview
 *
 * @param {String} urlPageName
 * @param {String} queryString
 * @return {String} url
 *
 * @api private
 */
function buildWebViewURL(urlPageName, queryString) {
    return buildStorefrontURL('https', urlPageName) + '?' + queryString;
}

/**
 * resetPageReloadTries - Reset number of times we can reload a page
 *
 * @api private
 */
function resetPageReloadTries() {
    pageLoadTries = Alloy.CFG.sales_reports.page_load_tries || 3;
}

/**
 * getToday - Get today's date
 *
 * @return {Date}
 * @api private
 */
function getToday() {
    var dateObj = {};
    var date = new Date();
    dateObj.dateFrom = formatDate(date, TIME_START_DAY);
    dateObj.dateTo = formatDate(date, TIME_END_DAY);
    dateObj.filterKey = 'today';
    return dateObj;
}

/**
 * getFirstDayOfWeek - Get first day of the week
 *
 * @param {Date} d
 * @return {Date}
 *
 * @api private
 */
function getFirstDayOfWeek(d) {
    if (!Alloy.CFG.sales_reports.start_of_week || Alloy.CFG.sales_reports.start_of_week === '') {
        return getMonday(d);
    }
    if (Alloy.CFG.sales_reports.start_of_week.toLowerCase() === 'monday') {
        return getMonday(d);
    }
    if (Alloy.CFG.sales_reports.start_of_week.toLowerCase() === 'sunday') {
        return getSunday(d);
    }
    return d;
}

/**
 * getMonday - Get Monday of the current week
 *
 * @param {Date} d
 * @return {Date}
 *
 * @api private
 */
function getMonday(d) {
    var day = d.getDay();
    if (day == 1) {
        return d;
    }
    var diff = d.getDate() - day;
    diff += (day == 0 ? -6 : 1);
    // adjust when day is sunday
    return new Date(d.setDate(diff));
}

/**
 * getMonday - Get Sunday of the current week
 *
 * @param {Date} d
 * @return {Date}
 *
 * @api private
 */
function getSunday(d) {
    var day = d.getDay();
    if (day == 0) {
        return d;
    }
    var diff = d.getDate() - day;
    diff += (day == 0 ? -6 : 0);
    // adjust when day is sunday
    return new Date(d.setDate(diff));
}

/**
 * objToUrlParams - Turns model into a URL query string
 *
 * @param {Object} model - Backbone model
 * @return {String}
 *
 * @api private
 */
function objToUrlParams(model) {

    var qString = [];
    for (var key in model.attributes)
    if (model.attributes[key]) {
        qString.push(key + '=' + model.get(key));
    }
    return qString.join('&');
}

/**
 * loadMainWebView - Load main webview
 * @api private
 */
function loadMainWebView() {
    Alloy.eventDispatcher.trigger('session:renew');
    var qStr = objToUrlParams(filterModel);
    var urlPageName = Alloy.CFG.sales_reports.url_page_names.sales;
    var cURL = buildWebViewURL(urlPageName, qStr);
    $.sales_web_view.urlPageName = urlPageName;
    if (cURL !== $.sales_web_view.url) {
        $.sales_web_view.setUrl(cURL);
    }
}

/**
 * findWebView - Return the first webview object found in a collection of views
 *
 * @param {Object} arrayOfViews - array of webViews
 * @return {Object} webView
 * @api private
 */
function findWebView(arrayOfViews) {
    var webView = null;
    webView = _.find(arrayOfViews, function(view) {
        return getUIObjectType(view) === 'WebView';
    });
    return webView;
}

/**
 * loadFocusedWebViewContent -Load the webview's web page that the user is looking at when a query filter like date or associate changes
 *
 * @param {Object} webView - specific web view
 * @api private
 */
function loadFocusedWebViewContent(webView) {
    if ($.scrollable_web_view_container.views.length > 0) {
        //get the current webview the user is looking at
        webView = webView || findWebView($.scrollable_web_view_container.views[$.scrollable_web_view_container.currentPage].getChildren());
        if (webView) {

            var urlPageName = '';
            switch(webView) {
            case $.sales_web_view:
                /*
                 this is the main web view.
                 It has it own functionality as other views are also dependent on the content it loads.
                 It functionalities are handled somewhere else.
                 */

                return;
                break;
            case $.items_sold_web_view:
                Alloy.eventDispatcher.trigger('session:renew');
                if (Alloy.CFG.sales_reports.enabled_charts.items_sold) {
                    urlPageName = Alloy.CFG.sales_reports.url_page_names.items_sold;
                }
                break;
            case $.ranking_web_view:
                Alloy.eventDispatcher.trigger('session:renew');
                if (Alloy.CFG.sales_reports.enabled_charts.ranks) {
                    var changedAttributes = filterModel.changedAttributes();
                    if (changedAttributes.dateFrom || changedAttributes.dateTo || !$.ranking_web_view.url || $.ranking_web_view.url == '') {
                        urlPageName = $.ranking_web_view.urlPageName || Alloy.CFG.sales_reports.url_page_names.ranks.associates;
                    } else {
                        return;
                    }
                }

                break;
            default:
                break;
            }
            var qStr = objToUrlParams(filterModel);
            var cURL = buildWebViewURL(urlPageName, qStr);
            webView.urlPageName = urlPageName;
            if (cURL !== webView.previousURL) {
                webView.setUrl(cURL);
                webView.previousURL = cURL;
            }
        }
    }
}

/**
 * getWebViewLoadErrorMessage - Return a message based on webview error code
 *
 * @param {Number} errorCode - Error Code
 * @return {String} errorMsg - Error message
 * @api private
 */
function getWebViewLoadErrorMessage(errorCode) {
    var errorMsg = '';
    switch(errorCode) {
    case Titanium.UI.URL_ERROR_AUTHENTICATION:
        errorMsg = _L('Authentication error');
        errorMsg += '\n' + _L('Please contact your manager or support.');
        break;
    case Titanium.UI.URL_ERROR_BAD_URL:
        errorMsg = _L('Bad URL');
        errorMsg += '\n' + _L('Please contact your manager or support.');
        break;
    case Titanium.UI.URL_ERROR_CONNECT:
        errorMsg = _L('Failure to connect to host');
        errorMsg += '\n' + _L('Please reload');

        break;
    case Titanium.UI.URL_ERROR_SSL_FAILED:
        errorMsg = _L('SSL failure');
        errorMsg += '\n' + _L('Please contact your manager or support.');
        break;
    case Titanium.UI.URL_ERROR_FILE:
        errorMsg = _L('Failure to access a file resource on the host');
        errorMsg += '\n' + _L('Please try again in a few minutes.');
        break;
    case Titanium.UI.URL_ERROR_FILE_NOT_FOUND:
        errorMsg = _L('File requested does not exist on the host');
        errorMsg += '\n' + _L('Please try again in a few minutes.');
        break;
    case Titanium.UI.URL_ERROR_HOST_LOOKUP:
        errorMsg = _L('DNS lookup error - Host name cannot be resolved.');
        errorMsg += '\n' + _L('Please contact your manager or support.');
        break;
    case Titanium.UI.URL_ERROR_REDIRECT_LOOP:
        errorMsg = _L('Redirect loop is detected.');
        errorMsg += '\n' + _L('Please contact your manager or support.');
        break;
    case Titanium.UI.URL_ERROR_TIMEOUT:
        errorMsg = _L('Page timeout occured');
        errorMsg += '\n' + _L('Please reload');
        break;
    case Titanium.UI.URL_ERROR_UNKNOWN:
        errorMsg = _L('Unknown error occured');
        errorMsg += '\n' + _L('Please reload');
        break;
    case Titanium.UI.URL_ERROR_UNSUPPORTED_SCHEME:
        errorMsg = _L('URL contains an unsupported scheme');
        errorMsg += '\n' + _L('Please try again in a few minutes.');
        break;
    default:
        errorMsg = _L('Unknown error occured');
        errorMsg += '\n' + _L('Please reload');
        break;
    }
    return errorMsg;
}

/**
 * setScrollableViewControlContentDimension - Handles the dimension of the buttons on top of the scrollable view. Given that some views in the scrollable view would not be rendered based on associate permission
 *
 * @api private
 */
function setScrollableViewControlContentDimension() {
    var content = $.scrollable_view_control.getChildren();
    _.each(content, function(cContent) {
        cContent.width = ((100 / content.length) - 0.00001) + '%';
    });

}

/**
 * handleErrorOnReportLoadFail - Display and send error message when server side error occures while trying to load report
 *
 * @params {Object} webview - Webview
 * @api private
 */
function handleErrorOnReportLoadFail(webview) {
    //delay 500 ms to give time to the extra scripts (especially salesReportLoadConfirmation.js) in the page to load
    setTimeout(function() {
        if (!isPageLoadSuccess(webview)) {
            var errorMsgToDisplay = undefined,
                errorMsgToEmail =
                undefined;
            var titleText = _L('The sales report failed to load. The following error was returned from the server.') + '\n\n';
            var errorText = webview.evalJS('document.body.innerHTML');

            if (errorText == '') {
                //no error was actually returned. isPageLoadSuccess was called probably before ressource is loaded.
                return;
            }

            //clear webview from error message
            webview.evalJS('document.body.innerHTML=" "');

            try {
                //check if sever returned a JSON formatted error so that we can display error message instead of json
                var errorObj = JSON.parse(errorText);
                errorMsgToDisplay = errorObj.fault.description || errorObj.fault.message;
                if (errorMsgToDisplay) {
                    errorMsgToDisplay = titleText + errorMsgToDisplay;
                }
            } catch(ex) {//catch error in case JSON.parse fails

            }

            //the full error will still be emailed
            errorMsgToEmail = titleText + errorText;

            //show error pop over
            Alloy.Dialog.showCustomDialog({
                controllerPath : 'components/errorPopover',
                initOptions : (errorMsgToDisplay || errorMsgToEmail),
                continueEvent : 'errorPopover:dismiss',
                continueFunction : function(event) {
                    errorMsgToEmail += '\n\nPage Name : \n' + webview.urlPageName;
                    if (event.text) {
                        errorMsgToEmail += '\n\nUser Data: \n' + event.text;
                    }
                    sendErrorToServer(errorMsgToEmail);
                }
            });
        }
    }, 500);
}

/**
 * isPageLoadSuccess - Check if expected webpage loaded  properly.
 *
 * @params {Object} cWebview - Webview
 * @return {Boolean} if page load was a success
 * @api private
 */
function isPageLoadSuccess(cWebview) {
    var pageLoaded = cWebview.evalJS('isPageLoaded()');
    if (pageLoaded === 'true') {
        return true;
    } else {
        return false;
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * loadThisWeek - Load this week's reports
 *
 * @api private
 */
function loadThisWeek() {
    var dateObj = {};
    var date = new Date();
    dateObj.dateTo = formatDate(date, TIME_END_DAY);

    var last = getFirstDayOfWeek(date);
    dateObj.dateFrom = formatDate(last, TIME_START_DAY);

    dateObj.filterKey = 'week';
    filterModel.set(dateObj);
}

/**
 * loadThisMonth - Get first day and last day of this month
 *
 * @api private
 */
function loadThisMonth() {
    var dateObj = {};
    var date = new Date();

    dateObj.dateTo = formatDate(date, TIME_END_DAY);
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    dateObj.dateFrom = formatDate(first, TIME_START_DAY);

    dateObj.filterKey = 'month';
    filterModel.set(dateObj);
}

/**
 * loadThisQuater - Get first day and last day of this quarter
 *
 * @api private
 */
function loadThisQuater() {
    var dateObj = {};
    var date = new Date();

    dateObj.dateTo = formatDate(date, TIME_END_DAY);
    var month = date.getMonth();
    if (month < 2) {
        month = 0;
    } else {
        month -= 2;
    }
    var first = new Date(date.getFullYear(), month, 1);
    dateObj.dateFrom = formatDate(first, TIME_START_DAY);

    dateObj.filterKey = 'quater';
    filterModel.set(dateObj);

}

/**
 * loadThisYear - Get first day and last day of this year
 *
 * @api private
 */
function loadThisYear() {
    var dateObj = {};
    var date = new Date();

    dateObj.dateTo = formatDate(date, TIME_END_DAY);
    var first = new Date(date.getFullYear(), 0, 1);
    dateObj.dateFrom = formatDate(first, TIME_START_DAY);

    dateObj.filterKey = 'year';
    filterModel.set(dateObj);
}

/**
 * loadTodayReport - Loads today's  reports
 *
 * @api private
 */
function loadTodayReport() {
    filterModel.set(getToday());
}

/**
 * showCustomDatePickerDialog - Show the  date selector dialog
 *
 * @api private
 */
function showCustomDatePickerDialog() {
    Alloy.Dialog.showCustomDialog({
        controllerPath : 'reports/datePickers',
        continueEvent : 'datePickers:dismiss',
        options : {
            model : filterModel
        },
    });
}

/**
 * onMainChartLoad - When the main webview loads it content, it populates the quick stats table and the associate list if needed
 *
 * @param {Object} event - event data
 * @api private
 */
function onMainChartLoad(event) {

    var chartData = $.sales_web_view.evalJS('getJSONData()');

    if (chartData) {
        resetPageReloadTries();
        chartData = JSON.parse(chartData);
        $.quickStatsCollection.reset(chartData.quickStats);

        if (associateModel.hasStoreLevelSalesReportsPrivileges()) {
            associateCollection.reset(chartData.storeEmployees);
        }
        //delay 200 ms before sending another request
        setTimeout(loadFocusedWebViewContent, 200);

    } else {
        logger.info('EVALJS failed reloading');
        if (pageLoadTries > 0) {
            $.sales_web_view.reload();
            pageLoadTries--;
        } else {
            handleErrorOnReportLoadFail($.sales_web_view);
        }

    }
    hideActivityIndicator(event);
}

/**
 * scrollableViewControlClickHandler - Scroll to and loads a certain view based on which report button is clicked
 *
 * @param {Object} event - event data
 * @api private
 */
function scrollableViewControlClickHandler(event) {

    _.each($.scrollable_view_control.getChildren(), function(child, index) {
        if (child !== event.source) {
            _.extend(child, buttonStyle.unselected);
        } else {
            $.scrollable_web_view_container.scrollToView(index);
            _.extend(event.source, buttonStyle.selected);
        }
    });

    switch(event.source.id) {
    case 'items_sold_view_control':
        loadFocusedWebViewContent($.items_sold_web_view);
        break;
    case 'ranks_web_view_control':
        loadFocusedWebViewContent($.ranking_web_view);
        break;
    default:
        break;
    }

}

/**
 * dateFilterControlClickHandler - Send page request or report re-rendering on date parameters change
 *
 * @param {Object} event - event data
 * @api private
 */
function dateFilterControlClickHandler(event) {
    _.each($.date_filter_control.getChildren(), function(child, index) {
        if (child === event.source) {
            _.extend(child, buttonStyle.selected);
        } else {
            _.extend(child, buttonStyle.unselected);
        }
    });

}

/**
 * rankViewControlClickHandler - Set the associate or  store button to a selected state
 *
 * @param {Object} event - event data
 * @api private
 */
function rankViewControlClickHandler(event) {
    _.each($.rank_view_control.getChildren(), function(child, index) {
        if (child === event.source) {
            _.extend(child, buttonStyle.selected);
        } else {
            _.extend(child, buttonStyle.unselected);
        }
    });

}

/**
 * revealAssociateList - Show the associate tableview
 *
 * @api private
 */
function revealAssociateList() {

    if (!associatetableShown) {

        // Create some Animations.
        var firstMove = Ti.UI.createAnimation({
            duration : 400,
            left : '30%'
        });
        var focusAssocTable = function() {
            _.extend($.sales_dashboard_overlay, chartViewStyle.disableArea);
            firstMove.removeEventListener('complete', focusAssocTable);
        };
        firstMove.addEventListener('complete', focusAssocTable);
        // Start the Animation.
        $.chart_area.animate(firstMove);
        associatetableShown = true;
    } else {
        hideAssociateList();
    }
}

/**
 * hideAssociateList - Hide the associate tableview
 *
 * @api private
 */
function hideAssociateList() {
    if (associatetableShown) {
        var secondMove = Ti.UI.createAnimation({
            duration : 400,
            left : '0'
        });
        var blurAssocTAble = function() {
            _.extend($.sales_dashboard_overlay, chartViewStyle.enableArea);
            secondMove.removeEventListener('complete', blurAssocTAble);
        };
        secondMove.addEventListener('complete', blurAssocTAble);
        // Start the Animation.
        $.chart_area.animate(secondMove);
        associatetableShown = false;
    }

}

/**
 * handleAssociateSelect - Reloads report when te associate parameter changes
 *
 * @param {Object} event - event data
 * @api private
 */
function handleAssociateSelect(event) {

    if (event.rowData.id === 'ALL_STORE') {
        filterModel.unset('employeeId');
    } else {
        filterModel.set('employeeId', event.rowData.id);
    }
    $.dashboard_title.animate({
        duration : 300,
        opacity : 0
    }, function() {
        $.dashboard_title.setText(String.format(_L('Sales Report Dashboard '), event.rowData.title));
        $.dashboard_title.animate({
            duration : 300,
            opacity : 1
        });
    });

    hideAssociateList();
}

/**
 * reloadSalesChart - Reload Sales Chart
 *
 * @api private
 */
function reloadSalesChart() {
    Alloy.eventDispatcher.trigger('session:renew');
    $.sales_web_view.reload();
}

/**
 * reloadRankChart - Reload Rank Chart
 *
 * @api private
 */
function reloadRankChart() {
    Alloy.eventDispatcher.trigger('session:renew');
    $.ranking_web_view.reload();
}

/**
 * reloadItemsSoldChart - Reload Items Sold Chart
 *
 * @api private
 */
function reloadItemsSoldChart() {
    Alloy.eventDispatcher.trigger('session:renew');
    $.items_sold_web_view.reload();
}

/**
 * dismiss - Dismiss sales report view
 *
 * @api private
 */
function dismiss() {
    $.trigger('salesReport:dismiss');
}

/**
 * showWebViewLoadError - On webview error this function is called
 *
 * @param {Object} event - event data
 * @api private
 */
function showWebViewLoadError(event) {
    var wrapperID = event.source.id + '_activity_indicator_wrapper';
    if ($[wrapperID]) {
        if ($[event.source.id + '_activity_indicator']) {
            $[event.source.id + '_activity_indicator'].hide();
        }
        if ($[event.source.id + '_error_msg']) {
            $[event.source.id + '_error_msg'].setText(getWebViewLoadErrorMessage(event.errorCode));
            $[event.source.id + '_error_msg'].animate({
                duration : 200,
                opacity : 1
            });
        }
    }

}

/**
 * hideActivityIndicator - Hide activity indicator of webview
 *
 * @param {Object} event - event data
 * @api private
 */
function hideActivityIndicator(event) {
    if (event.source !== $.sales_web_view) {
        //if source === $.sales_web_view is handled in onMainChartLoad
        handleErrorOnReportLoadFail(event.source);
    }
    var wrapperID = event.source.id + '_activity_indicator_wrapper';
    if ($[event.source.id + '_error_msg']) {
        $[event.source.id + '_error_msg'].setText('');
        $[event.source.id + '_error_msg'].setOpacity(0);
    }
    if ($[wrapperID]) {
        $[wrapperID].animate({
            duration : 500,
            opacity : 0
        }, function() {
            $[wrapperID].width = 0;
            $[wrapperID].height = 0;
            if ($[event.source.id + '_activity_indicator']) {
                $[event.source.id + '_activity_indicator'].hide();
            }

        });

    }

}

/**
 * showActivityIndicatorForPrimaryAndSecondaryWebView - Show activity indicator for main webview and current webview being looked at while loading main webview content
 *
 * @param {Object} event - event
 * @api private
 */
function showActivityIndicatorForPrimaryAndSecondaryWebView(event) {
    showActivityIndicator(event);
    if ($.scrollable_web_view_container.views.length > 0) {
        //show activity indicator on the current webview the user is looking at
        var webView = findWebView($.scrollable_web_view_container.views[$.scrollable_web_view_container.currentPage].getChildren());

        if (webView && webView !== event.source) {
            showActivityIndicator({
                source : webView
            });
        }
    }
}

/**
 * showActivityIndicator - Show activity indicator of webview
 *
 * @param {Object} event - event data
 * @api private
 */
function showActivityIndicator(event) {
    if (!event.source) {
        return;
    }

    var wrapperID = event.source.id + '_activity_indicator_wrapper';
    if ($[event.source.id + '_error_msg']) {
        $[event.source.id + '_error_msg'].setText('');
        $[event.source.id + '_error_msg'].setOpacity(0);
    }
    if ($[wrapperID]) {
        if ($[event.source.id + '_activity_indicator']) {
            $[event.source.id + '_activity_indicator'].show();
        };
        $[wrapperID].width = Ti.UI.FILL;
        $[wrapperID].height = Ti.UI.FILL;
        $[wrapperID].animate({
            duration : 500,
            opacity : 1
        });

    }

}

/**
 * onRankViewControlClick - Load the ranking report based on button clicked (associate/store)
 *
 * @param {Object} event - event data
 * @api private
 */
function onRankViewControlClick(event) {
    Alloy.eventDispatcher.trigger('session:renew');
    if (Alloy.CFG.sales_reports.enabled_charts.ranks) {
        var changedAttributes = filterModel.changedAttributes();
        var qStr = objToUrlParams(filterModel);
        var urlPageName = '';
        switch(event.source) {
        case $.associates_ranking:
            urlPageName = Alloy.CFG.sales_reports.url_page_names.ranks.associates;
            break;
        case $.stores_ranking:
            urlPageName = Alloy.CFG.sales_reports.url_page_names.ranks.stores;
            break;
        default :
            break;

        }

        var cURL = buildWebViewURL(urlPageName, qStr);
        if (changedAttributes.dateFrom || changedAttributes.dateTo || urlPageName != $.ranking_web_view.urlPageName) {

            $.ranking_web_view.urlPageName = urlPageName;
            if (cURL !== $.ranking_web_view.url) {
                $.ranking_web_view.setUrl(cURL);
            }
        }
    }
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * loadReports - Loads the main webview and the focused webview's contents. Also set the date range text at the top of the view
 *
 * @api private
 */
function loadReports() {
    if (!$.date_range_info.getText()) {
        $.date_range_info.setText(moment(filterModel.get('dateFrom')).format('LL') + ' - ' + moment(filterModel.get('dateTo')).format('LL'));
    }
    $.date_range_info.animate({
        duration : 300,
        opacity : 0
    }, function() {
        //hide and show through animation
        $.date_range_info.setText(moment(filterModel.get('dateFrom')).format('LL') + ' - ' + moment(filterModel.get('dateTo')).format('LL'));
        $.date_range_info.animate({
            duration : 300,
            opacity : 1
        });
    });
    loadMainWebView();
}

/**
 * renderAssociateTable - Populate the associates tableview
 *
 * @api private
 */
function renderAssociateTable() {
    var data = [];
    data.push({
        title : _L('My Store'),
        id : 'ALL_STORE',
        selectedBackgroundColor : Alloy.Styles.accentColor,
        hasChild : true
    });
    associateCollection.each(function(assocMod) {
        data.push({
            title : assocMod.get('firstName') + ' ' + assocMod.get('lastName'),
            id : assocMod.get('id'),
            selectedBackgroundColor : Alloy.Styles.accentColor,
            hasChild : true
        });
    });
    $.assoc_table.setData(data);
    filterModel.set({
        loadEmployeeList : false
    }, {
        silent : true
    });
}

//---------------------------------------------------
// ## CONSTRUCTOR

moment.locale(Alloy.CFG.languageSelected);
$.dashboard_title.setText(String.format(_L('Sales Report Dashboard '), associateModel.getFullName()));

if ($.ranking_web_view) {
    $.ranking_web_view.urlPageName = Alloy.CFG.sales_reports.url_page_names.ranks.associates;
}
if ($.items_sold_web_view) {
    $.items_sold_web_view.urlPageName = Alloy.CFG.sales_reports.url_page_names.items_sold;
}
if ($.sales_web_view) {
    $.sales_web_view.urlPageName = Alloy.CFG.sales_reports.url_page_names.sales;
}

setScrollableViewControlContentDimension();
