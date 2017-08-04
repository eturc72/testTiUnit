// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/product/components/promotions.js - view controller for promotions
 */

//---------------------------------------------------
// ## VARIABLES

var logger = require('logging')('product:components:promotions', getFullControllerPath($.__controllerPath));

//---------------------------------------------------
// ## PUBLIC API

// init calls render
exports.init = init;
exports.deinit = deinit;

//----------------------------------------------
// ## FUNCTIONS FOR VIEWER/CONTROLLER LIFECYCLE

/**
 * INIT
 *
 * @param {Object} args - can contain model.  If no model specified Alloy.Models.product is used
 * @api public
 */
function init(args) {
    logger.info('init called');

    $model = $model || (args && args.model) || Alloy.Models.product;

    render();
}

/**
 * RENDER
 *
 * @api private
 */
function render() {
    logger.info('render called');

    var promotions = $model.getProductPromotions();
    if (!promotions) {
        return;
    }

    _.each(promotions, function(promotion) {
        var html = '<meta name="viewport" content="width=300,user-scalable=0,initial-scale=0">' + '<style>' + Alloy.CFG.product.promotionWebViewCss + '</style>' + '<div>' + promotion.getCalloutMsg() + '</div>';

        var webView = Ti.UI.createWebView($.createStyle({
            html : html,
            classes : ['webview_container'],
            apiName : 'WebView'
        }));

        $.promotions.add(webView);
    });
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    logger.info('deinit called');
    $.stopListening();
    removeAllChildren($.promotions);
    $.destroy();
}

