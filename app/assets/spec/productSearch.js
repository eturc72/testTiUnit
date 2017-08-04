// ©2013-2017 salesforce.com, inc. All rights reserved.

//Setup module to run Behave tests
require('behave').andSetup(this);
var helper = require('testhelper');
var metadata = require('dw/shop/metadata/product_search_result');
var baskethelper = require('spec/baskethelper');

exports.define = function() {
    describe('ProductSearch Model', function() {

        var associateId = Alloy.CFG.modelTestsConfiguration.associateId;
        var associatePasscode = Alloy.CFG.modelTestsConfiguration.associatePasscode;
        baskethelper.loginAssociateWithCredentials(associateId, associatePasscode, false, function(associate) {
            expect(associate.isLoggedIn()).toBe(true);
            // test all the dynamically generated functions for productSearch model
            it.eventually('executes tests for all dynamically created functions for productSearch model', function(done) {
                var search = helper.newProductSearchModel({
                    query : 'red'
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.runDynamicMethodTestsForChildObject(metadata, search);
                }).always(function() {
                    done();
                });
            });

            // test all the static functions
            it.eventually('executes a search using refinements', function(done) {
                var search = helper.newProductSearchModel({
                    q : '',
                    selected_refinements : {
                        cgid : 'root'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(search.hasSelectedRefinements(), true);
                    helper.equals(JSON.stringify(search.get('selected_refinements')), JSON.stringify({
                        cgid : 'root'
                    }));
                    helper.equals(search.get('selected_refinements'), search.getSelectedRefinements());
                    helper.equals(search.get('selected_sorting_option'), search.getSelectedSortingOption());

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getCategoryID', function(done) {
                var search = helper.newProductSearchModel({
                    q : '',
                    selected_refinements : {
                        cgid : 'root'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(search.getCategoryID(), 'root');

                }).always(function() {
                    done();
                });
            });

            it.eventually('executes a batch search', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    //test batchSearch function
                    helper.equals(search.hasCount(), true);
                    helper.equals(search.get('count'), search.getCount());
                    batchSearch(search, 0);

                }).always(function() {
                    done();
                });
            });

            // used by batchSearch test above to recursively load the next batch until there are no more
            function batchSearch(search, i) {
                it.eventually('executes search ' + i + ' of batch search', function(done) {
                    var nextSearch = search.batchSearch(i);
                    if (nextSearch == null) {
                        return;
                    }
                    nextSearch.fetch().fail(function() {
                        helper.failure();
                    }).done(function() {
                        helper.equals(nextSearch.hasCount(), true);
                        if (i != 92) {
                            helper.equals(nextSearch.get('count'), nextSearch.getCount());
                        } else {
                            helper.equals(nextSearch.get('count'), nextSearch.getCount());
                        }

                        helper.equals(nextSearch.hasStart(), true);
                        helper.equals(nextSearch.get('start'), i * Alloy.CFG.product_search.search_products_returned);
                        helper.equals(nextSearch.get('start'), nextSearch.getStart());

                        batchSearch(nextSearch, i + 1);
                    }).always(function() {
                        done();
                    });
                });
            };

            it('calls simpleClone', function() {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root'
                    },
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                var clone = search.simpleClone();
                helper.equals(clone.getQuery(), search.getQuery());
                helper.equals(clone.getSelectedRefinements(), search.getSelectedRefinements());
                helper.equals(clone.getSelectedSortingOption(), search.getSelectedSortingOption());
                helper.equals(clone.getStart(), undefined);
                helper.equals(clone.getCount(), undefined);
            });

            it.eventually('calls emptySearch', function(done) {
                var search = helper.newProductSearchModel();
                search.emptySearch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(search.hasTotal(), true);
                    helper.equals(search.get('total'), search.getTotal());

                    helper.equals(search.isEmptySearch(), true);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls isRefinedBy', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_refinements : {
                        cgid : 'root',
                        c_refinementColor : 'black'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(search.isRefinedBy('cgid', 'root'), true);
                    helper.equals(search.isRefinedBy('c_refinementColor', 'black'), true);
                    helper.equals(search.isRefinedBy('cgid', 'mens'), false);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getRefinement', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root'
                    },
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var refinement = search.getRefinement('cgid');
                    helper.equals(refinement.getLabel(), 'Category');
                    helper.equals(refinement.getValues().length, 5);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getRefinementValue', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var rvalue = search.getRefinementValue('cgid', 'mens');
                    helper.equals(rvalue.getLabel(), 'Mens');

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls toggleRefinementValue', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root',
                        c_refinementColor : 'black'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    search.toggleRefinementValue('c_refinementColor', 'red');
                    helper.equals(search.getSelectedRefinements().c_refinementColor, 'black|red');
                    search.toggleRefinementValue('c_refinementColor', 'black');
                    helper.equals(search.getSelectedRefinements().c_refinementColor, 'red');

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls clearRefinementValue', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root',
                        c_refinementColor : 'black'
                    },
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    search.clearRefinementValue('c_refinementColor');
                    helper.equals(search.getSelectedRefinements().c_refinementColor, undefined);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls clearAllRefinementValues', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    start : 0,
                    count : Alloy.CFG.product_search.search_products_returned,
                    selected_refinements : {
                        cgid : 'root',
                        c_refinementColor : 'black'
                    },
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    search.clearAllRefinementValues();
                    helper.equals(JSON.stringify(search.getSelectedRefinements()), JSON.stringify({
                        cgid : 'root'
                    }));

                }).always(function() {
                    done();
                });
            });

            it('calls defaultRefinements', function() {
                var search = helper.newProductSearchModel({
                    query : ''
                });
                helper.equals(JSON.stringify(search.defaultRefinements()), JSON.stringify({
                    cgid : 'root'
                }));
            });

            it.eventually('calls getSelectedSortingOption', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    //Something is wrong with this line of code!
                    helper.equals(search.getSelectedSortingOption(), undefined);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls isSelectedSortingOption', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_sorting_option : {
                        id : 'best-matches'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    helper.equals(search.isSelectedSortingOption(search.getSelectedSortingOption()), undefined);

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getCategoryPath with false', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_refinements : {
                        cgid : 'mens-clothing-shorts'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var path = search.getCategoryPath(false);
                    helper.equals(path.length, 2);
                    helper.equals(path[0].getValue(), 'mens');
                    helper.equals(path[1].getValue(), 'mens-clothing');

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getCategoryPath with true', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_refinements : {
                        cgid : 'mens-clothing-shorts'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var path = search.getCategoryPath(true);
                    helper.equals(path.length, 3);
                    helper.equals(path[0].getValue(), 'mens');
                    helper.equals(path[1].getValue(), 'mens-clothing');
                    helper.equals(path[2].getValue(), 'mens-clothing-shorts');

                }).always(function() {
                    done();
                });
            });

            it.eventually('calls getSubcategoriesContext', function(done) {
                var search = helper.newProductSearchModel({
                    query : '',
                    selected_refinements : {
                        cgid : 'mens-clothing-shorts'
                    }
                });
                search.fetch().fail(function() {
                    helper.failure();
                }).done(function() {
                    var ctx = search.getSubcategoriesContext();
                    helper.equals(ctx.subcategories.length, 1);
                    helper.equals(ctx.parent.getValue(), 'mens-clothing');
                    helper.equals(ctx.parent.getValues().length, 1);

                }).always(function() {
                    done();
                });
            });
        });
    });
};
