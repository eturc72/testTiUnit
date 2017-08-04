// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
var behave = require('behave').andSetup(this);
var helper = require('testhelper');
var metadata = require('dw/shop/metadata/product');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('Product Model', function() {

        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            // test all the dynamically generated functions for product model
            it.eventually('executes tests for all dynamically created functions for product model', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.runDynamicMethodTestsForChildObject(metadata, prod);
                }).always(function() {
                    done();
                });
            });

            // test all the static functions
            it.eventually('calls getHeroImageGroups', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    prod.ensureImagesLoaded('heroImage').fail(function() {
                        helper.failure();
                    }).done(function() {
                        var imageGroups = prod.getHeroImageGroups();
                        helper.equals(imageGroups.length, 3);
                        helper.equals(imageGroups[1].getImages()[0].getAlt(), Alloy.CFG.productConfiguration.product_info1);
                    }).always(function() {
                        done();
                    });
                });
            });

            it.eventually('calls getImages', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    prod.ensureImagesLoaded('altImages').fail(function() {
                        helper.failure();
                    }).done(function() {
                        var images = prod.getAltImages();
                        helper.equals(images.length, 2);
                        helper.equals(images[0].getAlt(), Alloy.CFG.productConfiguration.product_info2);
                    }).always(function() {
                        done();
                    });
                });
            });

            it.eventually('calls getPlaceholderImages', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    prod.ensureImagesLoaded('heroImage').fail(function() {
                        helper.failure();
                    }).done(function() {
                        var placeholderImages = prod.getPlaceholderImages('heroImage');
                        helper.equals(placeholderImages.length, 1);
                        helper.equals(placeholderImages[0].getAlt(), _L('Image not available'));
                    }).always(function() {
                        done();
                    });
                });
            });

            it.eventually('calls getOrderableColorImageGroups', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    prod.ensureImagesLoaded('altImages').fail(function() {
                        helper.failure();
                    }).done(function() {
                        var colorImageGroups = prod.getOrderableColorImageGroups('altImages');
                        helper.equals(colorImageGroups.length, 2);
                        var variationValue = null;
                        var imageGroup = colorImageGroups[0];
                        if (imageGroup && imageGroup.getVariationAttributes) {
                            var varAttributes = imageGroup.getVariationAttributes()[0];
                            if (varAttributes) {
                                variationValue = varAttributes.getValues()[0].getValue();
                            }
                        }
                        helper.equals(variationValue, Alloy.CFG.productConfiguration.colorVariationValue);
                    }).always(function() {
                        done();
                    });
                });
            });

            it.eventually('calls hasOrderableVariants', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var orderable = prod.hasOrderableVariants({
                        color : Alloy.CFG.productConfiguration.colorVariationValue,
                        size : Alloy.CFG.productConfiguration.sizeVariation
                    });
                    helper.equals(orderable, true);
                }).always(function() {
                    done();
                });
            });

            it.eventually('calls isMaster and isType', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.prodID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(prod.isMaster(), true);
                    helper.equals(prod.isType('master'), true);
                }).always(function() {
                    done();
                });
            });

            // tests with variant below
            it.eventually('calls isVariant and isType', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.variationProdID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(prod.isVariant(), true);
                    helper.equals(prod.isType('variant'), true);
                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getVariationAttribute', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.variationProdID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var variationAttr = prod.getVariationAttribute('color');
                    helper.equals(variationAttr.get('name'), 'Color');
                    helper.equals(variationAttr.get('values').models.length, 2);
                    helper.equals(variationAttr.get('values').models[0].get('name'), Alloy.CFG.productConfiguration.color1);
                    helper.equals(variationAttr.get('values').models[1].get('name'), Alloy.CFG.productConfiguration.color2);
                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getVariationValues', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.variationProdID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var variationValues = prod.getVariationValues('color');
                    helper.equals(variationValues.color, Alloy.CFG.productConfiguration.variantColor);
                    helper.equals(variationValues.size, Alloy.CFG.productConfiguration.variantSize);
                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getOrderableVariationValues', function(done) {
                var prod = helper.newProductModel(Alloy.CFG.productConfiguration.variationProdID);
                prod.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var variationValues = prod.getOrderableVariationValues('color');
                    helper.equals(variationValues.length, 1);
                    helper.equals(variationValues[0].get('name'), Alloy.CFG.productConfiguration.orderableColor);
                }).always(function() {
                    done();
                });
            });

            //Test product collection methods
            it.eventually('calls fetchModels, checkAvailabilityInStoreInventory, getUnavailableItems and getPreviouslySetQuantity on product collection with products ids and inventory ids', function(done) {
                var prodCollection = helper.newProductCollection();
                prodCollection.fetchModels(null, {
                    ids : Alloy.CFG.productConfiguration.prodIDs,
                    inventory_ids : Alloy.CFG.productConfiguration.inventory_ids
                }).fail(function() {
                    helper.failure();
                }).done(function() {

                    helper.equals(prodCollection.length, Alloy.CFG.productConfiguration.prodIDs.length);
                    prodCollection.setQuantities(Alloy.CFG.productConfiguration.quantities);

                    helper.isNotNull(prodCollection.get(Alloy.CFG.productConfiguration.prodIDs[0]).getPreviouslySetQuantity());
                    if (prodCollection.get(Alloy.CFG.productConfiguration.prodIDs[0])) {
                        helper.equals(prodCollection.get(Alloy.CFG.productConfiguration.prodIDs[0]).getPreviouslySetQuantity(), Alloy.CFG.productConfiguration.quantities[0].quantity);
                    }

                    helper.isFalse(prodCollection.checkAvailabilityInStoreInventory(Alloy.CFG.productConfiguration.inventory_ids[0]));

                    helper.equals(prodCollection.getUnavailableItems(Alloy.CFG.productConfiguration.inventory_ids[0]).length, 1);

                    prodCollection.remove(Alloy.CFG.productConfiguration.product_to_remove);

                    helper.equals(prodCollection.length, (Alloy.CFG.productConfiguration.prodIDs.length - 1));

                    helper.isTrue(prodCollection.checkAvailabilityInStoreInventory(Alloy.CFG.productConfiguration.inventory_ids[0]));

                }).always(function() {
                    done();
                });
            });

        });
    });
};

