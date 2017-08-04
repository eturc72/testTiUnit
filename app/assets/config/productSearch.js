// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/productSearch.js  - configuration for product search
 */

module.exports = {
    // Product search configuration settings.
    product_search : {
        // The expand data to return from the server by default for product searches
        default_expand : 'images,prices,variations',
        // Number of products to return per batch when executing a search.
        search_products_returned : 8,
        // Products per page to include on search results page.
        products_per_page : 8,
        // Select statement for ocapi search request for the category grid.
        // This is to help reduce the amount of data returned from the server for slow connections.  This can be set to '' if wifi speed is not an issue.
        // ensure the refinements[0] is correct value for the cgid refinements in the results.
        cgid_select_params : '(total,query,count,start,hits,refinements[0],selected_refinements,selected_sorting_option,-sorting_options)',
        // Select statement for ocapi search requests to reduce the size of the results from the server when requested page 2 and above of the product grid
        // The refinements and configuration is not needed on other pages as it is only used on the first page search request.
        hits_select_params : '(count,hits.(**),total,start,-selected_refinements,-selected_sorting_option,-sorting_options,-refinements)',
        refinements : {
            refinement_component : {
                c_size : 'search/components/smallSwatchRefinement',
                c_width : 'search/components/smallSwatchRefinement',
                price : 'search/components/mediumSwatchRefinement',
                c_refinementColor : 'search/components/colorSwatchRefinement',
                default : 'search/components/listItemRefinement'
            },
            colorForPresentationID : {
                beige : {
                    key : 'backgroundColor',
                    value : '#f5f5dc'
                },
                black : {
                    key : 'backgroundColor',
                    value : '#000'
                },
                blue : {
                    key : 'backgroundColor',
                    value : 'blue'
                },
                navy : {
                    key : 'backgroundColor',
                    value : 'navy'
                },
                brown : {
                    key : 'backgroundColor',
                    value : '#783201'
                },
                green : {
                    key : 'backgroundColor',
                    value : 'green'
                },
                grey : {
                    key : 'backgroundColor',
                    value : '#8f979d'
                },
                orange : {
                    key : 'backgroundColor',
                    value : 'orange'
                },
                pink : {
                    key : 'backgroundColor',
                    value : '#fe249a'
                },
                purple : {
                    key : 'backgroundColor',
                    value : 'purple'
                },
                red : {
                    key : 'backgroundColor',
                    value : 'red'
                },
                white : {
                    key : 'backgroundColor',
                    value : '#fff'
                },
                yellow : {
                    key : 'backgroundColor',
                    value : '#ffff00'
                },
                miscellaneous : {
                    key : 'backgroundImage',
                    value : 'images/search/miscellaneous_swatch.png'
                },
                default : {
                    key : 'backgroundColor',
                    value : '#ebecec'
                }
            }
        }
    }
};

