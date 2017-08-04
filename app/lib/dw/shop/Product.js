// ©2013-2017 salesforce.com, inc. All rights reserved.
/**
 * lib/dw/shop/Product.js - Functions for Product model
 */

var Backbone = Backbone || Alloy ? Alloy.Backbone : require('backbone');
var logger = require('logging')('models:Product', 'app/lib/dw/shop/Product');

var AssociatedModel = AssociatedModel || Alloy ? Backbone.AssociatedModel : require('backbone-associations').AssociatedModel;

/**
 * ProductPrices - Model for product pricing
 *
 * @api private
 */
var ProductPrices = Backbone.Model.extend({
    /**
     * config - model configuration
     */
    config : {
        secure : true,
        cache : false,
        model_name : 'productPrices'
    },

    /**
     * getPrices - returns prices
     *
     * @return {String} prices
     */
    getPrices : function() {
        return this.get('prices');
    },

    /**
     * getPrice - returns price
     * @return {String} price
     */
    getPrice : function() {
        return this.get('price');
    }
});

/**
 * ProductImages - Model for product images
 *
 * @api private
 */
var ProductImages = Backbone.Model.extend({
    /**
     * config - model configuration
     */
    config : {
        cache : true,
        model_name : 'productImages'
    }
});

/**
 * Recommendation - Model for recommendations
 *
 * @api private
 */
var Recommendation = require('alloy/models/Recommendations').Model;

/**
 * Product - Model for Product
 *
 * @api public
 */
var Product = AssociatedModel.extend(
/* instance methods */
{
    idAttribute : 'id',
    urlRoot : '/products',

    /**
     * initialize - for initialization of model
     */
    initialize : function() {
        this.recommendations = new Recommendation();
    },

    /**
     * parse - Override of default parse behavior.
     * Returns first variant product found when multiple products are returned in data collection.
     *
     * @param {Object} response The response returned from the server
     * @param {Object} options Optional parameters
     * @return {Object} parsed results
     */
    parse : function(response, options) {
        parseVariations(response);

        parseImageGroups(response, {});

        // if response includes data collection, the product query included multiple ids
        if (response.data && response.data.length) {
            // if only one product in array, return the product
            if (response.data.length === 1) {
                return response.data[0];
            }

            // otherwise return the first product with variant=true
            _.each(response.data, function(data) {
                if (data.type.variant) {
                    return data;
                }
            });

            // default fallback if no variant found
            return response.data[0];
        } else if (response.bundled_products) {
            // Bundled Products are not really delivered as products, but as quantity & product object 'group'
            // This 'fixes' that, so they behave better with others
            var bundled_products = response.bundled_products;
            for (var i = 0,
                ii = bundled_products.length; i < ii; i++) {
                bundled_products[i].product.quantity = bundled_products[i].quantity;
                bundled_products[i] = bundled_products[i].product;
            }
        }

        // standard product query with single id
        return response;
    },

    /**
     * queryParams - the params for the request
     * @return {Object} params
     */
    queryParams : function() {
        var expand = this.get('expand') || Alloy.CFG.product.default_expand || 'variations,availability,images,prices,options,promotions,set_products,bundled_products';
        var params = {
            expand : expand,
        };

        if (expand.indexOf('images') > -1) {
            // adding all_images ensures we get all variant images when the product id is for a master product
            _.extend(params, {
                all_images : true
            });
        }
        if (Alloy.CFG.store_availability.enabled) {
            var inventory_ids = Alloy.Models.storeInfo.get('inventory_id');
            var ids = this.get('inventory_ids');
            if (ids) {
                inventory_ids = ids.join(',');
            }
            _.extend(params, {
                inventory_ids : inventory_ids
            });
        }
        return params;
    },

    /**
     * getImageGroupsForViewType - retrievs the image groups for a view type
     *
     * @param {String} view_type
     * @param {String} variation_value
     * @return {Object} image groups
     */
    getImageGroupsForViewType : function(view_type, variation_value) {
        var realViewType = this.getImageViewType(view_type),
            images = this._get('images');

        // Result is a key/value of view_type => variation_hash
        var viewTypeImagesHash = images[realViewType];
        // Result is a key/value of variation_value => imageGroup
        var imageGroups;

        if (viewTypeImagesHash) {
            var imageGroupsJSON = _.values(viewTypeImagesHash);
            imageGroupsJSON = this.transformImageGroupImageURLs(imageGroupsJSON, view_type);

            if (imageGroupsJSON) {
                // compare variation_value with
                if (variation_value) {
                    imageGroupsJSON = _.filter(imageGroupsJSON, function(imageGroup) {
                        if (imageGroup.variation_attributes) {
                            var var_attributes = imageGroup.variation_attributes[0];
                            var vv = var_attributes.values[0].value;
                            if (vv == variation_value) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                        return false;
                    });
                }
                var collection = new Backbone.Collection(imageGroupsJSON, {
                    model : Product.ImageGroup
                });
                imageGroups = collection.models;
            }
        }

        return imageGroups;
    },

    /**
     * getImages - Return the Array of Images associated with `view_type` & `variation_value`
     * Note that `null` for `variation_value` is converted to `default` as a hash key.
     * If not found, this will return an Array of 1 placeholder ImageGroup object
     *
     * @param {String} view_type
     * @param {String} variation_value
     * @return {Object} image groups
     */
    getImages : function(view_type, variation_value) {
        var realViewType = this.getImageViewType(view_type),
            images = this._get('images');

        var viewTypeImagesJSON = images[realViewType];
        if (viewTypeImagesJSON) {
            var imageGroupsJSON = viewTypeImagesJSON[variation_value];
            if (!imageGroupsJSON) {
                variation_value = 'default';
                imageGroupsJSON = viewTypeImagesJSON[variation_value];
            }
            if (imageGroupsJSON) {
                imageGroupsJSON = this.transformImageGroupImageURLs([imageGroupsJSON], view_type);
                var imageGroupJSON = imageGroupsJSON[0];

                var imagesJSON = imageGroupJSON.images;

                var collection = new Backbone.Collection(imagesJSON, {
                    model : Product.ImageGroup.Image
                });
                imageGroups = collection.models;
            } else {
                // If the image doesn't exist, then let the place holder fill up the response
                imageGroups = null;
            }
        } else {
            imageGroups = null;
        }

        if (!imageGroups) {
            logger.error('Image missing for ' + this.getId() + ' for view type: ' + realViewType);
            imageGroups = this.getPlaceholderImages(realViewType);
        }

        return imageGroups;
    },

    /**
     * getPlaceholderImageGroup - get image groups with placeholder image
     *
     * @param {String} view_type
     * @param {String} vv_id
     * @return {Object} image groups
     */
    getPlaceholderImageGroup : function(view_type, vv_id) {
        var realViewType = this.getImageViewType(view_type);
        var imageGroup = new Product.ImageGroup();
        imageGroup.set({
            images : this.getPlaceholderImages(),
            variation_attributes : [{
                id : Alloy.CFG.product.color_attribute,
                values : [{
                    value : vv_id
                }]
            }],
            view_type : view_type || 'large'
        });

        return imageGroup;
    },

    /**
     * getPlaceholderImages - get placeholder image
     *
     * @return {Object} image models
     */
    getPlaceholderImages : function() {
        var images = new Backbone.Collection([{
            alt : _L('Image not available'),
            link : Alloy.Styles.imageNotAvailableImage,
            title : _L('Image not available'),
        }], {
            model : Product.ImageGroup.Image
        });

        return images.models;
    },

    /**
     * getOrderableColorImageGroups - get orderable color image groups
     *
     * @param {String} view_type
     * @return {Object} image groups
     */
    getOrderableColorImageGroups : function(view_type) {
        var orderableImageGroups,
            colorAttribute = this.getVariationAttribute(Alloy.CFG.product.color_attribute),
            self = this;

        if (colorAttribute) {
            var orderableValuesJSON = this._get('orderable_variation_values');
            var colorValuesJSON = orderableValuesJSON[Alloy.CFG.product.color_attribute];

            orderableImageGroups = colorValuesJSON ? _.map(colorValuesJSON, function(vv) {
                // This should always at least return a placeholder image, if nothing else ...
                return self.getImageGroupsForViewType(view_type, vv.value)[0];
            }) : null;
        }
        return orderableImageGroups;
    },

    /**
     * isOrderableVariationValue - is variation valud orderable
     *
     * @param {Object} view_type
     * @param {String} attributeId
     * @return {Boolean} match
     */
    isOrderableVariationValue : function(attrs, attributeId) {
        var attributeId = attributeId ? attributeId : _.keys(attrs)[0],
            valueValue = attrs[attributeId];
        var orderableValuesJSON = this._get('orderable_variation_values');
        var valuesJSON = orderableValuesJSON[attributeId];

        var match = _.findWhere(valuesJSON, {
            value : valueValue
        });

        return !!match;
    },

    /**
     * hasOrderableVariants - return true if has orderable variants
     *
     * @param {Object} attrs
     * @return {Boolean} match
     */
    hasOrderableVariants : function(attrs) {
        var match_criteria = _.extend({}, attrs, {
            orderable : true
        });

        var orderable_variants = this._get('orderable_variants');

        var match = _.findWhere(orderable_variants, match_criteria);

        return !!match;
    },

    /**
     * getOrderableVariants - get orderable variants
     *
     * @param {Object} attrs
     * @return {Object} orderable variants
     */
    getOrderableVariants : function(attrs) {
        var match_criteria = _.extend({}, attrs, {
            orderable : true
        });

        var orderable_variants = this._get('orderable_variants');

        var match = _.where(orderable_variants, match_criteria);

        return match;
    },

    /**
     * getMatchingVariants - get matching variants
     *
     * @param {Object} attrs
     * @return {Array} matches
     */
    getMatchingVariants : function(attrs) {
        var match_criteria = _.extend({}, attrs);

        var matching_variants = this._get('variants');

        var matches = [];

        _.each(matching_variants.models, function(variant) {
            var vvs = variant._get('variation_values'),
                match = true;
            for (var va in match_criteria ) {
                if (vvs[va] != match_criteria[va]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                matches.push(variant);
            }
        });

        return matches;
    },

    /**
     * getMasterID - get master ID
     *
     * @return {Object} id
     */
    getMasterID : function() {
        var id = null;
        var master = this._get('master');
        id = master && master.get('master_id');
        return id;
    },

    /**
     * isMaster - get if product is master
     *
     * @return {Boolean} is a master product
     */
    isMaster : function() {
        return this.isType('master');
    },

    /**
     * isVariant - get if product is variant
     *
     * @return {Boolean} is a variant product
     */
    isVariant : function() {
        return this.isType('variant');
    },

    /**
     * isStandard - get if product is standard
     *
     * @return {Boolean} is a standard product
     */
    isStandard : function() {
        return this.isType('item');
    },

    /**
     * isBundle - get if product is bundle
     *
     * @return {Boolean} is a bundle product
     */
    isBundle : function() {
        return this.isType('bundle');
    },

    /**
     * isSet - get if product is set
     *
     * @return {Boolean} is a product set
     */
    isSet : function() {
        return this.isType('set');
    },

    /**
     * isOption - get is option
     *
     * @return {Boolean} is option
     */
    isOption : function() {
        return this.isType('option');
    },

    /**
     * isType - get if is of a product type
     *
     * @param {String} product_type
     * @return {Boolean} is that type
     */
    isType : function(product_type) {
        var type = this._get('type');
        return type._get(product_type);
    },

    /**
     * isProductSelected - get if product is selected
     *
     * @return {Boolean} is selected
     */
    isProductSelected : function() {
        return this.hasSelectedVariant() || !this.hasAvailableVariants();
    },

    /**
     * hasAvailableVariants - if has available variants
     * Used for PDP variant selection ... dynamic variable ... variations are available
     *
     * @return {Boolean} available
     */
    hasAvailableVariants : function() {
        var available = false;
        if (this._get('variation_values') && this._get('variation_attributes')) {
            available = true;
        };
        return available;
    },

    /**
     * hasConfiguredVariant - has a configured variant
     * Used for PDP variant selection ... dynamic variable ... variations are available and one is selected
     *
     * @return {Boolean} variant is configured
     */
    hasConfiguredVariant : function() {
        var variationValues = this._get('variation_values');
        if (!variationValues) {
            return false;
        }

        var selectedValues = _.keys(variationValues);
        var allAttributes = this._get('variation_attributes');

        // Product is fully configured (and therefore represents a variant selection), if both arrays are the same length
        return selectedValues.length == allAttributes.length;
    },

    /**
     * hasSelectedVariant - has a selected variant
     * Used for PDP variant selection ... dynamic variable
     *
     * @return {Boolean} variant is selected
     */
    hasSelectedVariant : function() {
        return !!this._get('selected_variant');
    },
    /**
     * getSelectedVariant - get selected variant
     *
     * @return {Object} selected variant
     */
    getSelectedVariant : function() {
        return this._get('selected_variant');
    },

    /**
     * setSelectedVariant - set selected variant
     *
     * @param {Object} value
     * @param {Object} options
     * @return {Object}
     */
    setSelectedVariant : function(value, options) {
        return this.set('selected_variant', value, options);
    },

    /**
     * hasSelectedOption - has selected option
     *
     * @return {Boolean} option is selected
     */
    hasSelectedOption : function() {
        return !!this._get('selected_option');
    },

    /**
     * getSelectedOption - get selected option
     *
     * @return {Object} selected option
     */
    getSelectedOption : function() {
        return this._get('selected_option');
    },

    /**
     * setSelectedOption - set selected option
     *
     * @param {Object} value
     * @param {Object} options
     * @return {Object}
     */
    setSelectedOption : function(value, options) {
        return this.set('selected_option', value, options);
    },

    /**
     * setProductId - set product id
     *
     * @param {String} id
     */
    setProductId : function(id) {
        this.set('id', id);
    },

    /**
     * getProductId - get product id, Used to unify ProductSearchHit/Product interface
     *
     * @return {String} id
     */
    getProductId : function() {
        return this._get('id');
    },

    /**
     * hasProductId - has product id
     *
     * @return {Boolean} has product id
     */
    hasProductId : function() {
        return this.has('id');
    },

    /**
     * hasRecommendedItemId - has recommended item id
     *
     * @return {Boolean} has recommended item id
     */
    hasRecommendedItemId : function() {
        return this.has('recommended_item_id');
    },

    /**
     * getRecommendedItemId - get recommended item id
     *
     * @return {String} recommended item id
     */
    getRecommendedItemId : function() {
        return this._get('recommended_item_id');
    },

    /**
     * getQuantity - get product quantity
     *
     * @return {String} quantity
     */
    getQuantity : function() {
        return this._get('quantity');
    },

    /**
     * setQuantity - set product quantity
     *
     * @param {String} value
     * @param {Object} options
     * @return {Object}
     */
    setQuantity : function(value, options) {
        var selectedProduct = this.getSelectedVariant();
        if (selectedProduct) {
            selectedProduct.set('quantity', value, options);
        }
        return this.set('quantity', value, options);
    },

    /**
     * getPromoPrice - get promo price
     *
     * @return {Object} promo price
     */
    getPromoPrice : function() {
        return this._get('promo_price');
    },

    /**
     * getPrices - get prices
     *
     * @return {Object} prices
     */
    getPrices : function() {
        return this._get('prices');
    },

    /**
     * getSelectedProductId - get selected product id
     *
     * @return {Object} product id
     */
    getSelectedProductId : function() {
        var productId = this.getId();
        if (this.hasConfiguredVariant()) {
            var selectedVariant = this.getSelectedVariant();
            if (selectedVariant) {
                productId = _.isFunction(selectedVariant.getProductId) ? selectedVariant.getProductId() : selectedVariant.getId();
            } else {
                productId = null;
            }
        }
        return productId;
    },

    /**
     * setSelectedVariationValue - set selected variation value
     *
     * @param {String} attr_id
     * @param {Object} value_id
     */
    setSelectedVariationValue : function(attr_id, value_id) {
        var pair = {},
            variationValues = this._get('variation_values');
        pair[attr_id] = value_id;

        logger.info('updating variation_values with new selection: ' + JSON.stringify(pair));
        var selectedVariationValues = _.extend({}, variationValues, pair);

        this.set({
            variation_values : selectedVariationValues
        });
    },

    /**
     * getSelectedVariationValue - get selected variation value
     *
     * @param {String} attr_id
     * @return {Object}
     */
    getSelectedVariationValue : function(attr_id) {
        var svv,
            svvalue,
            svvs = this._get('variation_values');
        if (svvs) {
            svvalue = svvs[attr_id];
        }

        if (svvalue) {
            var vvs = this.getVariationAttributeValues(attr_id);
            if (vvs) {
                vvs = vvs.filter(function(vv) {
                    return vv._get('value') == svvalue;
                });
                if (vvs && vvs.length > 0) {
                    svv = vvs[0];
                }
            }
        }

        return svv;
    },

    /**
     * getVariationAttribute - get variation attribute
     *
     * @param {String} attr_id
     * @return {Object}
     */
    getVariationAttribute : function(attr_id) {
        var va = null;
        var vas = this._get('variation_attributes');
        if (vas) {
            vas = vas.filter(function(va) {
                return va.id == attr_id;
            });

            if (vas && vas.length > 0) {
                va = vas[0];
            }
        }
        return va;
    },

    /**
     * getVariationAttributeValues - get variation attribute values
     *
     * @param {String} attr_id
     * @return {Object}
     */
    getVariationAttributeValues : function(attr_id) {
        var values = null;
        if (_.isString(attr_id)) {
            var attr = this.getVariationAttribute(attr_id);
            values = attr._get('values');
        } else {
            values = attr_id._get('values');
        }
        return values;
    },

    /**
     * getVariationValues - get variation values
     *
     * @return {Object}
     */
    getVariationValues : function() {
        return this._get('variation_values') || {};
    },

    /**
     * setVariationValues - set variation values
     *
     * @param {Object} value
     * @param {Object} options
     * @return {Object}
     */
    setVariationValues : function(value, options) {
        return this.set('variation_values', value, options);
    },

    /**
     * getOrderableVariationValues - get orderable variation values
     *
     * @param {String} attr_id
     * @return {Object}
     */
    getOrderableVariationValues : function(attr_id) {
        if (!_.isString(attr_id)) {
            attr_id = attr_id.id;
        }

        var orderableValuesHashJSON = this._get('orderable_variation_values'),
            orderableValuesHash;
        if (orderableValuesHashJSON) {
            orderableValuesHash = new Backbone.Collection(orderableValuesHashJSON[attr_id], {
                model : Product.VariationAttribute.VariationAttributeValue
            }).models;
        }

        return orderableValuesHash;
    },

    /**
     * getBundledProducts - get bundled products
     *
     * @return {Array} bundled products
     */
    getBundledProducts : function() {
        var bundledProducts = this._get('bundled_products');
        if (bundledProducts) {
            var self = this;
            bundledProducts.each(function(product) {
                if (!('apiCall' in product)) {
                    product.apiCall = function() {
                        return self.apiCall.apply(product, arguments);
                    };
                }
            });
            return bundledProducts.models;
        } else {
            return [];
        };
    },

    /**
     * getSetProducts - get set products
     *
     * @return {Array} set products
     */
    getSetProducts : function() {
        var setProducts = this._get('set_products');
        if (setProducts) {
            var self = this;
            setProducts.each(function(product) {
                if (!('apiCall' in product)) {
                    product.apiCall = function() {
                        return self.apiCall.apply(product, arguments);
                    };
                }
                if (!('getInventoryAvailability' in product)) {
                    product.getInventoryAvailability = function() {
                        return self.getInventoryAvailability.apply(product, arguments);
                    };
                }
            });
            return setProducts.models;
        } else {
            return [];
        }

    },

    /**
     * ensureImagesLoaded - ensure images are loaded for view type
     *
     * @param {String} view_type
     * @return {Deferred} promise
     */
    ensureImagesLoaded : function(view_type) {
        var realViewType = this.getImageViewType(view_type),
            images = this._get('images');

        // Check for already present values
        if (images[realViewType]) {
            logger.info('Product Images already loaded for view_type: ' + view_type);
            var deferred = _.Deferred();
            deferred.resolve();

            return deferred.promise();
        }

        // Looking up images, by individual view_type
        logger.info('Looking up images, by individual view_type: ' + view_type);

        var self = this;
        var productImages = new ProductImages();

        var url = this.url() + '/images';

        if (view_type) {
            url += '?view_type=' + realViewType;
        }

        var params = _.extend({}, {
            url : url,
            type : 'GET'
        });
        var options = _.extend({}, {
            cache : true,
            wait : true,
            success : function(response) {
                parseImageGroups(response, images);
                logger.info(JSON.stringify(self._get('images')));
            },
            error : function() {
            }
        }, options);

        return this.apiCall(productImages, params, options);
    },

    /**
     * fetchModel - fetch product model
     *
     * @param {Object} options
     * @return {Deferred} promise
     */
    fetchModel : function(options) {
        return this.fetch(options);
    },

    /**
     * fetchSelectedDetails - fetch selected details, Obtains inventory & pricing for the selected product
     *
     * @param {Object} options
     * @return {Deferred} promise
     */
    fetchSelectedDetails : function(options) {
        var selectedVariant = this.getSelectedVariant();
        var self = this;
        var selectedId = this.getId();
        var selectedProduct = this;
        var expand = 'availability';
        if (selectedVariant) {
            selectedId = selectedVariant.getProductId() || selectedVariant.getId();
            selectedProduct = selectedVariant;
            if (!('hasPrices' in selectedVariant) || !selectedVariant.hasPrices()) {
                expand = 'availability,prices,promotions';
            }
        }

        var product = Alloy.createModel('product', {
            id : selectedId,
            expand : expand
        });
        var promise = product.fetchModel({
            cache : false
        });
        promise.done(function(model, params, options) {
            model.getLowestPromotionPrice();
            selectedProduct.set({
                inventory : model._get('inventory'),
                inventories : model._get('inventories'),
                type : model._get('type')
            }, {
                silent : true
            });
            self.trigger('change:selected_details', model);
        });
        return promise;
    },

    /**
     * getAvailableAttributes - get available attributes
     *
     * @return {Object} available attributes
     */
    getAvailableAttributes : function() {
        var availableAttributes = {};

        var orderable_variation_matrix = this._get('orderable_variation_matrix');
        var orderable_variation_values = this._get('orderable_variation_values');
        var variation_values = this._get('variation_values') || {},
            vvkeys = _.keys(variation_values);
        var vas = this._get('variation_attributes');

        if (vas.length == 1) {
            // return all orderable values
            // eg. {<attr_id> : {<val1> : true, ...}}
            var loneAttribute = vas.at(0),
                attributeId = loneAttribute.get('id');
            var ovvs = orderable_variation_values[attributeId];
            var hash = {};
            _.each(ovvs, function(vv) {
                hash[vv.value] = true;
            });
            availableAttributes[loneAttribute._get('id')] = hash;
        } else if (vvkeys.length == 1) {
            // We base everything on what is available in selected
            var lookupHash = orderable_variation_matrix[vvkeys[0]][variation_values[vvkeys[0]]];
            vas.each(function(va) {
                var attributeHash = {},
                    attributeId = va.get('id');
                // If we have only one selectedValue,
                // (and the current attribute is being iterated over)
                // then we should use same logic as
                if (attributeId == vvkeys[0]) {
                    // show all orderable values
                    var ovvs = orderable_variation_values[attributeId];
                    var hash = {};
                    _.each(ovvs, function(vv) {
                        hash[vv.value] = true;
                    });
                    availableAttributes[attributeId] = hash;
                } else if (lookupHash) {
                    //
                    availableAttributes[attributeId] = lookupHash[attributeId];
                }
            });
        } else if (vvkeys.length > 1) {
            // We base everything on what is available in selected
            vas.each(function(va) {
                var attributeId = va.get('id');
                // If we have only one selectedValue,
                // (and the current attribute is being iterated over)
                // then we should use same logic as
                var intersectionHash = {};
                _.each(vvkeys, function(attr_id) {
                    if (attr_id == attributeId) {
                        return;
                    }
                    if (!orderable_variation_matrix[attr_id]) {
                        return;
                    }

                    var attributeHashes = orderable_variation_matrix[attr_id][variation_values[attr_id]];
                    var valuesHash = attributeHashes ? orderable_variation_matrix[attr_id][variation_values[attr_id]][attributeId] : null;

                    if (valuesHash) {
                        var valuesArray = _.keys(valuesHash);

                        // values should be hash of value:orderable
                        if (intersectionHash[attributeId]) {
                            intersectionHash[attributeId] = _.intersection(intersectionHash[attributeId], valuesArray);
                        } else {
                            intersectionHash[attributeId] = valuesArray;
                        }
                    }
                });
                var hash = {};
                _.each(intersectionHash[attributeId], function(value) {
                    hash[value] = true;
                });
                availableAttributes[attributeId] = hash;
            });
        } else {
            // Return all possible attributes values
            var attr_ids = _.keys(orderable_variation_matrix);
            var orderable_variation_values = this._get('orderable_variation_values');
            // Loop through every other attribute
            _.each(attr_ids, function(attr_id) {
                var allPossibleValues = _.keys(orderable_variation_values[attr_id]);
                var hash = {};
                _.each(allPossibleValues, function(value_id) {
                    hash[value_id] = true;
                });
                availableAttributes[attr_id] = hash;
            });
        }

        return availableAttributes;
    },

    /**
     * getProductPrices - get product prices
     *
     * @return {Deferred} promise
     */
    getProductPrices : function() {
        var self = this;

        var getPrices = new ProductPrices();

        var url = this.url() + '?expand=prices,promotions';
        var params = _.extend({}, {
            url : url,
            type : 'GET'
        });
        var options = _.extend({}, {
            wait : true,
            success : function(response) {
                var promotions = response.product_promotions;
                if (promotions && promotions[0]) {
                    self.set({
                        promo_price : promotions[0].promotional_price
                    }, {
                        silent : true
                    });
                }
                if (response.price) {
                    self.set({
                        price : response.price
                    }, {
                        silent : true
                    });
                }
                if (response.prices) {
                    self.set({
                        prices : response.prices
                    }, {
                        silent : true
                    });
                }
            },
            error : function() {
            }
        }, options);
        return this.apiCall(getPrices, params, options);
    },

    /**
     * getSalePrice - get sale price
     *
     * @return {Object} sale price
     */
    getSalePrice : function(country) {
        if (this.getPrices() && this.getPrices()[Alloy.CFG.country_configuration[ country ? country : Alloy.CFG.countrySelected].list_price_book]) {
            var listPrice = this.getPrices()[Alloy.CFG.country_configuration[ country ? country : Alloy.CFG.countrySelected].list_price_book];
            var salePrice = country ? this.getPrices()[Alloy.CFG.country_configuration[country].sale_price_book] : this.getPrice();
            if (listPrice != salePrice) {
                return salePrice;
            }
        }
        return null;
    },
    
    /**
     * getListPrice - get list price
     *
     * @param {String} country - optional parameter passed when order has a country
     * @return {Object} list price
     */
    getListPrice : function(country) {
        var listPriceBook = Alloy.CFG.country_configuration[ country ? country : Alloy.CFG.countrySelected].list_price_book;
        if (this.getPrices() && this.getPrices()[listPriceBook]) {
            return this.getPrices()[listPriceBook];
        }
        return null;
    },

    /**
     * getVariationAttributeByName - get variation attribute by name
     *
     * @param {String} attribute_name
     * @return {Object}
     */
    getVariationAttributeByName : function(attribute_name) {
        var vas = this.getVariationAttribute(attribute_name);
        if (this._get('variation_values')) {
            var attributeToMatch = this._get('variation_values')[attribute_name];
            if (vas) {
                var toReturn = _.filter(vas._get('values').models, function(va) {
                    return va._get('value') == attributeToMatch;
                });
                if (toReturn && toReturn.length > 0) {
                    return toReturn[0]._get('name');
                }
            }
        }
        return null;
    },

    /**
     * getVariationAttributeDisplayName - get variation attribute display name
     *
     * @param {String} attribute_name
     * @return {Object}
     */
    getVariationAttributeDisplayName : function(attribute_name) {
        var vas = this.getVariationAttribute(attribute_name);
        return vas._get('name');
    },

    /**
     * getLowestPromotionPrice - get the lowest promotion price
     *
     * @return {Object} promotion price
     */
    getLowestPromotionPrice : function() {
        var promotions = this.get('product_promotions');
        if (promotions && promotions.length > 0) {
            var lowest = _.min(promotions.models, function(promotion) {
                return promotion.get('promotional_price');
            });
            if (lowest && lowest != Infinity) {
                this.set('promo_price', lowest.get('promotional_price'), {
                    silent : true
                });
            }
        }
    },

    /**
     * getSelectedProductInfo - get selected product info
     *
     * @return {Object} product info
     */
    getSelectedProductInfo : function() {
        if (this.isBundle()) {
            return this.getBundleProductInfo();
        } else {
            return this.getProductInfo();
        }
    },

    /**
     * getProductInfo - get product info
     *
     * @return {Object} product info
     */
    getProductInfo : function() {
        var selectedVariant = this.getSelectedVariant();
        if (!selectedVariant && (this.isStandard() || this.isVariant())) {
            selectedVariant = this;
        }
        if (!selectedVariant) {
            return null;
        }

        var productInfo = {
            product_id : selectedVariant.getProductId(),
            quantity : this.getQuantity() || 1
        };

        // if selected options exist, add to product item literal
        var selectedOption = this.getSelectedOptionInfo();
        if (selectedOption) {
            // assign the items array to option_items
            productInfo.option_items = selectedOption;
        }

        return productInfo;
    },

    /**
     * getBundleProductInfo - get bundle product info
     *
     * @return {Object} product info
     */
    getBundleProductInfo : function() {
        var productInfo = {
            product_id : this.getProductId(),
            quantity : this.getQuantity() || 1
        };

        // if selected options exist, add to product item literal
        var selectedOption = this.getSelectedOptionInfo();
        if (selectedOption) {
            // assign the items array to option_items
            productInfo.option_items = selectedOption;
        }
        _.each(this.getBundledProducts(), function(product) {
            if (product.hasSelectedOption()) {
                var option = product.getSelectedOptionInfo();
                if (option) {
                    if (productInfo.option_items) {
                        productInfo.option_items.concat(option);
                    } else {
                        productInfo.option_items = option;
                    }
                }
            }
        });
        return productInfo;
    },

    /**
     * getSelectedOptionInfo - get selected option info
     *
     * @return {Object} option info
     */
    getSelectedOptionInfo : function() {
        var items = null;
        var selectedOption = this.getSelectedOption();
        if (selectedOption && selectedOption.selected) {
            var option = this.getOptions()[0];
            items = [{
                option_id : option.getId(),
                option_value_id : selectedOption.id,
                item_text : selectedOption.displayText,
                price : selectedOption.price,
                quantity : selectedOption.quantity || 1
            }];
        }
        return items;
    }
},

/* class methods */
{

});

/**
 * parseImageGroups - parse image groups in response
 *
 * @param {Object} response
 * @param {Object} imagesIn
 *
 * @api private
 */
function parseImageGroups(response, imagesIn) {
    logger.info('start image parse');

    var images = imagesIn || {},
        image_groups = response.image_groups;

    // loop through image_groups
    _.each(image_groups, function(image_group) {
        // look up the view_type in images, create if necessary (object)
        var variation_value = 'default';
        if (image_group.variation_attributes) {
            var var_attributes = image_group.variation_attributes[0];
            variation_value = var_attributes.values[0].value;
        }
        //  lookup the variation_value, create if necessary (array)
        var view_type = image_group.view_type;
        var view_hash = images[view_type] || (images[view_type] = {});
        view_hash[variation_value] = image_group;

    });

    response.images = images;

    logger.info('after images parse');
}

/**
 * parseVariations - parse variations in response
 *
 * @param {Object} response
 *
 * @api private
 */
function parseVariations(response) {
    if (response.variation_attributes) {
        logger.info('start orderable variation values parse');

        response.orderable_variation_values = {};
        response.original_attributes = response.variation_attributes.slice(0);

        _.each(response.variation_attributes, function(va) {
            var orderableValues = _.filter(va.values, function(n) {
                return n.orderable;
            });
            response.orderable_variation_values[va.id] = orderableValues;

            if (Alloy.CFG.product.filterUnorderableVariationValues) {
                va.values = orderableValues;
            }

            if (Alloy.CFG.product.shouldSelectSingleValues) {
                if (orderableValues.length == 1) {
                    var variationValues = _.extend({}, response.variation_values);
                    variationValues[va.id] = orderableValues[0].value;
                    response.variation_values = variationValues;
                }
            }

            if (Alloy.CFG.product.shouldSelectFirstValues) {
                if (orderableValues.length > 0// If there are orderable values
                && (!response.variation_values || !response.variation_values[va.id])// And one isnt variant or picked
                && _.indexOf(Alloy.CFG.product.shouldSelectFirstValues, va.id) > -1) {// And is eligible

                    var variationValues = _.extend({}, response.variation_values);
                    variationValues[va.id] = orderableValues[0].value;
                    response.variation_values = variationValues;
                }
            }
        });

        //var variants_hash = {};
        var variants = [];

        logger.info('start orderable variants parse');

        // Filter out extra data & record variation values for quick lookup
        var op = Alloy.CFG.product.filterUnorderableVariants ? 'filter' : 'each';
        var keys = _.keys(response.variants[0].variation_values);
        var lookup_hash = {};
        _[op](response.variants, function(n) {
            var value = _.extend({
                product_id : n.product_id,
                orderable : n.orderable,
                variation_values : n.variation_values
            }, n.variation_values);
            if (n.orderable) {
                variants.push(value);
                // Loop through all variation_values in
                _.each(keys, function(attribute_id) {
                    var valueValue = value[attribute_id],
                        attrHash,
                        valueHash;
                    attrHash = lookup_hash[attribute_id] = (lookup_hash[attribute_id] || {});
                    valueHash = lookup_hash[attribute_id][valueValue] = (lookup_hash[attribute_id][valueValue] || {});

                    _.each(keys, function(attr_id) {
                        if (attr_id == attribute_id && keys.length > 1) {
                            return;
                        }

                        var valueValue1 = value[attr_id],
                            attrHash1,
                            valueHash1;
                        attrHash1 = valueHash[attr_id] = (valueHash[attr_id] || {});
                        valueHash[attr_id][valueValue1] = true;
                    });
                });
            }

            return n.orderable;
        });

        response.orderable_variation_matrix = lookup_hash;
        response.orderable_variants = variants;

        logger.info('end orderable variants parse');
    }
}

var mixinApiMethods = require('ocapi_methods');

/* init API schema from metadata dump */
mixinApiMethods(Product, require('dw/shop/metadata/product'));

module.exports = Product;
