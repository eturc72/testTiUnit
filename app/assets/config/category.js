// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * assets/config/category.js  - configuration for category grid and mega menu
 */

module.exports = {
    category_grid : {
        // the width and height of the view for the category grid
        aspect : {
            width : 544,
            height : 544
        },
        // category grid configuration for default tablet/landscape layout
        tablet : {
            landscape : {
                // determines if the category grid will scroll, if true the categores will not scroll vertically and the grid will be made to fit in the height available
                map_to_height : true,
                // spacing between category tiles
                spacing : {
                    width : 20,
                    height : 20
                },
                // minimum padding around category tiles
                min_padding : {
                    width : 20,
                    height : 20
                },
                // maximum number of colums for category grid
                max_cols : 4,
                // bounds for the grid
                max_bounds : {
                    width : 1024,
                    height : 643
                }
            }
        }
    },
    // Alternative menu dropdown for the category selector
    navigation : {
        use_mega_menu : false
    }
};
