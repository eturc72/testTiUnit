// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/product.js  - configuration for products
 */

module.exports = {
    product : {
        // Expand data to be returned from server for each product on a product detail page.
        default_expand : 'variations,availability,images,prices,options,promotions,set_products,bundled_products',
        // Flag indicating whether or not single variation values should be selected.
        shouldSelectSingleValues : true,
        // List of variations for which to auto select the first value.
        shouldSelectFirstValues : ['color'],
        ratings : {
            starFull : 'images/icons/fullstar.png',
            starHalf : 'images/icons/halfstar.png',
            starNone : 'images/icons/nostar.png'
        },
        options : {
            option_component : {
                specialHandlingCode : 'product/components/specialHandlingOption'
            }
        },
        attributeSelectComponent : {
            color : {
                view : 'product/components/variationAttributeSwatches',
                showTitle : true
            },
            default : {
                view : 'components/selectWidget',
                showTitle : true
            }
        },
        // Recommendation tab rendering properties.
        recommendations : {
            gridRows : 2,
            gridColumns : 3,
            maxPages : 10,
            tileImageWidth : 176,
            tileImageHeight : 221,
            tilePadding : 20,
            rowPadding : 24
        },
        descriptionWebViewCss : 'body { font-family:\'Helvetica Neue\'; font-size: 10pt; color: #3d3d3d; padding-right: 3em }',
        promotionWebViewCss : 'body {font-size: 16pt;font-family: \'Crete Round\';text-align:center }',

        // Show video on product detail page
        // Should only be enable if addVideos function in controllers/product/images/images.js is implemented  accordingly to support videos
        enable_video_player : false
    }
};

