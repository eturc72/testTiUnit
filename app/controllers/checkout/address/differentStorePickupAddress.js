// ©2017 salesforce.com, inc. All rights reserved.
/**
 * controllers/checkout/address/differentStorePickupAddress.js - Handle customer partial address and selection of for different store pickup
 */

//---------------------------------------------------
// ## VARIABLES
var args = $.args;
var currentBasket = Alloy.Models.basket;
var storeListPosition;
var enteredValidPostalCode;
var loadMoreStores = true;
var handlingInfiniteScroll = false;
var lastCountedNumberOfStores = 0;
var paginationStep = 5;
var currentBasket = Alloy.Models.basket;
var addressFormVisible = null;
var tfields = ['first_name', 'last_name', 'phone', 'email_address', 'message'];
var storePickupAddressForm = require('config/address/storePickupConfig').local_address[Alloy.CFG.countrySelected];
var defaultStorePickupAddressForm = require('config/address/storePickupConfig').local_address['default'];
var viewLayoutData;

if (storePickupAddressForm) {
    viewLayoutData = require(storePickupAddressForm).getLayout();
} else {
    viewLayoutData = require(defaultStorePickupAddressForm).getLayout();
}

var formMgr = require('addressFormManager')({
    viewLayoutData : viewLayoutData,
    $ : $,
    getterFunctionsForCustomFields : {
        getCountry : getCurrentStoreCountryCode
    }
});
var fetchImages = require('EAUtils').fetchImagesForProducts;

// Form Manager functions
var getPostalCode = formMgr.getPostalCode;
var isPostalCodeValid = formMgr.isPostalCodeValid;
var validatePostalCodeField = formMgr.validatePostalCodeField;

//---------------------------------------------------
// ## APP LISTENERS
$.listenTo(Alloy.eventDispatcher, 'hideAuxillaryViews', hidePopover);
$.listenTo(Alloy.eventDispatcher, 'app:dialog_displayed', hidePopover);
$.listenTo(Alloy.eventDispatcher, 'app:navigation', hidePopover);
$.listenTo(Alloy.eventDispatcher, 'cart_cleared', clearPreviousSelections);
$.listenTo(Alloy.eventDispatcher, 'order_just_created', clearPreviousSelections);

//-----------------------------------------------------
// ## UI EVENT LISTENERS

$.store_list_container.addEventListener('click', handleStoreListClick);
$.store_list_container.addEventListener('scroll', handleInfiniteScroll);
$.unavailable_items_list.addEventListener('click', handleUnavailableItemsListClick);
$.store_selected_next_button.addEventListener('click', handleStoreSelectedNextClick);
$.address_form_previous_button.addEventListener('click', handleGoBack);
$.address_form_next_button.addEventListener('click', handleAddressFormNextClick);

//---------------------------------------------------
// ## MODEL LISTENERS
$.listenTo(currentBasket, 'change:product_items', handleBasketChange);
$.listenTo($.nearestStores, 'change', enableOrDisableStoreSelectedNextButton);
$.listenTo(Alloy.Models.customer, 'customer:clear', clearPreviousSelections);

//----------------------------------------------
// ## PUBLIC API

exports.closeKeyboard = closeKeyboard;
exports.setAddress = setAddress;
exports.isAddressFormVisible = isAddressFormVisible;
exports.hasAnythingChanged = hasAnythingChanged;
exports.deinit = deinit;
var previousValues = '';

//----------------------------------------------
// ## FUNCTIONS FOR VIEW/CONTROLLER LIFECYCLE

/**
 * RENDER
 *
 * @api public
 */
function render() {
    formMgr.renderAddressViewInContainer('enter_address_container');
    $.toolbar = Alloy.createController('components/nextPreviousToolbar');
    var formFields = formMgr.getAllFormFields();
    formFields.push($.message);
    $.toolbar.setTextFields(formFields);
    $.postal_code.addEventListener('return', handlePostalCodeReturn);
    $.search_button.addEventListener('click', handleSearchClick);

    $.first_name.addEventListener('change', enableAddressFormNextClick);
    $.last_name.addEventListener('change', enableAddressFormNextClick);
    $.phone.addEventListener('change', enableAddressFormNextClick);
    $.email_address.addEventListener('change', enableAddressFormNextClick);

    $.address_form_next_button.setTitle(Alloy.CFG.collect_billing_address ? _L('Next') : _L('Create Order'));
}

/**
 * DEINIT
 *
 * @api public
 */
function deinit() {
    formMgr.deinit();
    $.toolbar.deinit();
    $.postal_code.removeEventListener('return', handlePostalCodeReturn);
    $.search_button.removeEventListener('click', handleSearchClick);
    $.store_list_container.removeEventListener('click', handleStoreListClick);
    $.store_list_container.removeEventListener('scroll', handleInfiniteScroll);
    $.unavailable_items_list.removeEventListener('click', handleUnavailableItemsListClick);
    $.store_selected_next_button.removeEventListener('click', handleStoreSelectedNextClick);
    $.address_form_previous_button.removeEventListener('click', handleGoBack);
    $.address_form_next_button.removeEventListener('click', handleAddressFormNextClick);

    $.first_name.removeEventListener('change', enableAddressFormNextClick);
    $.last_name.removeEventListener('change', enableAddressFormNextClick);
    $.phone.removeEventListener('change', enableAddressFormNextClick);
    $.email_address.removeEventListener('change', enableAddressFormNextClick);

    if (_.isArray($.store_list_container.getData()) && $.store_list_container.getData().length > 0) {
        _.each($.store_list_container.getData()[0].rows, function(row) {
            row.deinit();
        });
    }
    if (_.isArray($.unavailable_items_list.getData()) && $.unavailable_items_list.getData().length > 0) {
        _.each($.unavailable_items_list.getData()[0].rows, function(row) {
            row.deinit();
        });
    }

    $.stopListening();
    $.destroy();
}

//---------------------------------------------------
// ## FUNCTIONS

/**
 * handlePostalCodeFocus - handle on postal code focus event
 *
 * @apu private
 */
function handlePostalCodeFocus() {
    setTimeout(function() {
        $.address_form_container.scrollTo(0, 590);
    }, 100);
}

/**
 * handlePostalCodeReturn - handle on postal code return event
 *
 * @api private
 */
function handlePostalCodeReturn() {
    if (validatePostalCodeField() && enteredValidPostalCode !== getPostalCode()) {
        lastCountedNumberOfStores = 0;
        loadMoreStores = true;
        var deferred = new _.Deferred();
        Alloy.Router.showActivityIndicator(deferred);
        fetchNearestStores(0).done(function() {
            enteredValidPostalCode = getPostalCode();
            fetchNearestStoresAvailability($.nearestStores.start, ($.nearestStores.start + paginationStep - 1)).always(function() {
                $.store_list_container.scrollToTop();
                deferred.resolve();
            });
            showHideNoStoresFoundLabel(($.nearestStores.length <= 0));
        }).fail(function() {
            deferred.resolve();
        });
    }
}

/**
 * closeKeyboard - blur all textfields
 *
 * @api public
 */
function closeKeyboard() {
    formMgr.closeKeyboard();
    $.postal_code.blur();
}

/**
 * handleSearchClick - handle on search button click event
 *
 * @api private
 */
function handleSearchClick() {
    closeKeyboard();
    handlePostalCodeReturn();
}

/**
 * setAddress - set address model and form
 * @param {Object} addressData - address data in JSON
 *
 * @api public
 */
function setAddress(addressData) {
    previousValues = '';
    formMgr.clearAllErrors();
    $.address.set(addressData);
    formMgr.setAllTextFieldsValues($.address);
    $.message.setValue(addressData.message || '');
    previousValues = formMgr.getAllFieldValues(tfields, []);
    if (currentBasket.getDifferentStorePickup() && currentBasket.getShippingAddress() && enteredValidPostalCode !== '') {
        return;
    }

    $.postal_code.setValue(Alloy.Models.storeInfo.getPostalCode() || '');
    handlePostalCodeReturn();
    enableAddressFormNextClick();
    handleGoBack();

}

/**
 * getCurrentStoreCountryCode - return the country code
 * @return {String}
 *
 * @api private
 */
function getCurrentStoreCountryCode() {
    return Alloy.Models.storeInfo.getCountryCode();
}

/**
 * getBasketProductIds - return ids of products in basket
 * @return {Array} product ids
 *
 * @api private
 */
function getBasketProductIds() {
    return currentBasket.getAllProductItemIds();
}

/**
 * getBasketProductIdsAndQuantities - return ids and quantities of products in basket
 * @return {Array} product ids and quantities
 *
 * @api private
 */
function getBasketProductIdsAndQuantities() {
    return currentBasket.getAllProductItemsIdsAndQuantities();
}

/**
 * filterOutUnnavailableBasketItems - return product items which ids are specified
 * @param {Array} ids - product item ids
 * @return {Array} product items
 *
 * @api private
 */
function filterOutUnnavailableBasketItems(ids) {
    return currentBasket.filterProductItemsByIds(ids);
}

/**
 * transformStoreDetail - transform store model
 *
 * @param  {Object} model
 * @return {Object} transformed object
 * @api private
 */
function transformStoreDetail(model) {
    var message = '';
    var unavailableItemCount = model.getAllUnavailableBasketItems().length;
    if (unavailableItemCount === currentBasket.getProductItems().length) {
        message = _L('All items are unavailable');
    } else if (unavailableItemCount === 1) {
        message = String.format(_L('%d item is unavailable'), unavailableItemCount);
    } else if (unavailableItemCount > 1) {
        message = String.format(_L('%d items are unavailable'), unavailableItemCount);
    }

    return {
        id : model.getId(),
        display_name : model.getAddressDisplay(),
        distance : model.getTextualDistance(),
        unavailability_message : message
    };
}

/**
 * fetchNearestStores - Fetch nearest stores
 *
 * @param  {Number} start
 * @return {Deferred} promise
 * @api private
 */
function fetchNearestStores(start) {
    start = (_.isNumber(start) ? start : $.nearestStores.length);
    return $.nearestStores.getStoresWithPagination({
        ids : [],
        country_code : getCurrentStoreCountryCode(),
        postal_code : getPostalCode(),
        max_distance : Alloy.CFG.store_availability.max_distance_search,
        count : paginationStep,
        start : start
    }, (start === 0 ? false : true), true);
}

/**
 * fetchNearestStoresAvailability - Check basket inventory in nearest stores specified by index
 * @param  {Number} startIndex
 * @param  {Number} endIndex
 *
 * @return {Deferred} Promise
 */
function fetchNearestStoresAvailability(startIndex, endIndex) {

    var promise = $.basketInventory.fetchModels(null, {
        ids : getBasketProductIds(),
        // there is a value constraint on this property 'inventory_ids' - Expected length is between '(0..5)'.
        inventory_ids : $.nearestStores.getInventoryIdsByStartEndIndex(startIndex, endIndex)
    });
    promise.done(function() {
        $.basketInventory.setQuantities(getBasketProductIdsAndQuantities());
        $.nearestStores.setBasketInventoryAvailabilty($.basketInventory, startIndex, endIndex);
    });
    promise.fail(function() {
        var fault = failModel ? failModel.get('fault') : null;
        var errorMsg = _L('Unable to load store availability.');
        if (fault && fault.message && fault.message != '') {
            errorMsg = fault.message;
        }
        notify(errorMsg, {
            preventAutoClose : true
        });
    });
    return promise;
}

/**
 * handleStoreListClick - handle store selection
 * @param  {Object} event
 *
 * @api private
 */
function handleStoreListClick(event) {
    var sections = $.store_list_container.getData();
    var selectedStoreModel = $.nearestStores.at(event.index);
    if (sections && _.isArray(sections) && sections.length > 0) {
        _.each(sections[0].rows, function(row, idx) {
            if (selectedStoreModel && selectedStoreModel.isBasketAvailable()) {
                if (idx === event.index) {
                    $.nearestStores.setSelectedStore(event.index);
                    row.checkSelectedCheckbox();
                    enableOrDisableStoreSelectedNextButton();
                } else {
                    row.uncheckCheckbox();
                }
            } else if (idx === event.index && selectedStoreModel && !selectedStoreModel.isBasketAvailable()) {
                $.unavailableInventory.reset(filterOutUnnavailableBasketItems(selectedStoreModel.getAllUnavailableBasketItems()));
                fetchImages($.unavailableInventory.models, $.unavailable_items_list).done(function() {

                    if ($.unavailableInventory.models.length === 1) {
                        $.unavailable_items_list.setSeparatorColor(Alloy.Styles.color.background.transparent);
                    } else {
                        $.unavailable_items_list.setSeparatorColor(Alloy.Styles.color.background.darkGray);
                    }

                    $.unavailable_items_popover.show({
                        view : row.getUnavailableButton()
                    });
                }).fail(function(failModel) {
                    var fault = failModel ? failModel.get('fault') : null;
                    var errorMsg = _L('Unable to load images.');
                    if (fault && fault.message && fault.message != '') {
                        errorMsg = fault.message;
                    }
                    notify(errorMsg, {
                        preventAutoClose : true
                    });
                });

            }

        });
    }
}

/**
 * hasAnythingChanged - Check if textfield Values has been changed
 * @return {Boolean} true if anything in the form changed by the user
 *
 * @api public
 */
function hasAnythingChanged() {
    return formMgr.hasAnythingChanged(tfields, previousValues, []);
}

/**
 * handleInfiniteScroll - load more stores as user scrolls down
 * @param  {Object} event
 *
 * @api private
 */
function handleInfiniteScroll(event) {
    var shouldLoad = (storeListPosition && event.contentOffset.y > storeListPosition) && (event.contentOffset.y + event.size.height > event.contentSize.height);
    // remember position
    storeListPosition = event.contentOffset.y;

    if (!handlingInfiniteScroll && shouldLoad && enteredValidPostalCode === getPostalCode() && loadMoreStores) {
        handlingInfiniteScroll = true;
        showTableActivityIndicator();
        fetchNearestStores().done(function() {
            if ($.nearestStores.length > lastCountedNumberOfStores) {
                lastCountedNumberOfStores = $.nearestStores.length;
                showTableActivityIndicator();
                fetchNearestStoresAvailability($.nearestStores.start, ($.nearestStores.start + paginationStep - 1)).always(function() {
                    hideTableActivityIndicator();
                });
            } else {
                hideTableActivityIndicator();
                loadMoreStores = false;
                notify(_L('No more stores available'));
            }
        }).fail(function(failModel) {
            var fault = failModel ? failModel.get('fault') : null;
            var errorMsg = _L('Unable to get nearest stores.');
            if (fault && fault.message && fault.message != '') {
                errorMsg = fault.message;
            }
            notify(errorMsg, {
                preventAutoClose : true
            });
        }).always(function() {
            hideTableActivityIndicator();
            handlingInfiniteScroll = false;
        });
    }
}

/**
 * showHideNoStoresFoundLabel - Show or hide  no store found label
 * @param  {Boolean}  show
 *
 * @api private
 */
function showHideNoStoresFoundLabel(show) {
    if (show) {
        $.store_picker_container.hide();
        $.store_picker_container.setHeight(0);
        $.no_result_container.setHeight(50);
        $.no_result_container.show();
    } else {
        $.no_result_container.hide();
        $.no_result_container.setHeight(0);
        $.store_picker_container.setHeight(Ti.UI.SIZE);
        $.store_picker_container.show();
    }
}

/**
 * isNotNullOrEmpty - check if string is null or empty
 * @param  {String}  val
 * @return {Boolean}
 *
 * @api private
 */
function isNotNullOrEmpty(val) {
    return (!_.isNull(val) && val !== '');
}

/**
 * showTableActivityIndicator - show infinite scroll activity indicator
 *
 * @api private
 */
function showTableActivityIndicator() {
    $.footer_indicator_wrapper.setHeight(50);
    $.footer_indicator.show();
    $.footer_indicator_wrapper.show();
}

/**
 * hideTableActivityIndicator - hide infinite scroll activity indicator
 *
 * @api private
 */
function hideTableActivityIndicator() {
    $.footer_indicator.hide();
    $.footer_indicator_wrapper.hide();
    $.footer_indicator_wrapper.setHeight(0);
}

/**
 * isAddressFormValid - validate address form and return validation result
 * @return {Boolean}
 *
 * @api private
 */
function isAddressFormValid() {
    var phoneValid = formMgr.validatePhoneField();
    var emailValid = formMgr.validateEmailAddressField();
    var fnameValid = formMgr.showHideError('first_name', isNotNullOrEmpty(formMgr.getFirstName()));
    var lnameValid = formMgr.showHideError('last_name', isNotNullOrEmpty(formMgr.getLastName()));
    return (phoneValid && emailValid && fnameValid && lnameValid);

}

/**
 * isAddressFormVisible - return addressFormVisible
 * @return {Boolean}
 *
 * @api public
 */
function isAddressFormVisible() {
    return addressFormVisible;
}

/**
 * transformUnavailableInventory - transform unavailable product item
 * @param  {Object} model
 *
 * @api private
 */
function transformUnavailableInventory(model) {
    return {
        stock_availability_message : (model.getCurrentStockLevel() > 0 ? String.format(_L('Only %d left in stock'), model.getCurrentStockLevel()) : _L('Out of stock'))
    };
}

/**
 * confirmDeleteItem - displays the custom dialog to confirm deletion of item in the basket
 *
 * @param item
 * @api private
 */
function confirmDeleteItem(item) {

    hidePopover();
    // Shows the confirmation overlay, and if that is confirmed, removes
    // the item from the cart
    Alloy.Dialog.showConfirmationDialog({
        messageString : String.format(_L('Do you really want to delete this item?'), item.getProductName()),
        titleString : _L('Delete Item'),
        okButtonString : _L('Delete'),
        okFunction : function() {
            currentBasket.setLastCheckoutStatusSilently('shippingAddress');
            var promise = currentBasket.removeItem(item.getItemId());
            Alloy.Router.showActivityIndicator(promise);
            promise.done(function() {
                if (currentBasket.getProductItems().length === 0) {
                    currentBasket.setCheckoutStatus('cart');
                } else {
                    handlePostalCodeReturn();
                }
            }).fail(function(failModel) {
                var fault = failModel ? failModel.get('fault') : null;
                var errorMsg = _L('Unable to delete item.');
                if (fault && fault.message && fault.message != '') {
                    errorMsg = fault.message;
                }
                notify(errorMsg, {
                    preventAutoClose : true
                });
            });
        }
    });
}

//----------------------------------------------
// ## MODEL EVENT HANDLER FUNCTIONS

/**
 * hidePopover - Hide  popover
 *
 * @api private
 */
function hidePopover() {
    $.unavailable_items_popover.hide();
}

/**
 * switchToStoreSelector - hides the address form container and displays the store selector container
 *
 * @api private
 */
function switchToStoreSelector() {
    addressFormVisible = false;
    $.address_form_container.hide();
    $.address_form_container.setHeight(0);
    $.store_selector_container.setHeight('96%');
    $.store_selector_container.show();
}

/**
 * switchToAddressForm - hides the store selector container and displays the address form container
 *
 * @api private
 */
function switchToAddressForm() {
    addressFormVisible = true;
    $.store_selector_container.hide();
    $.store_selector_container.setHeight(0);
    $.address_form_container.setHeight('96%');
    $.address_form_container.show();
}

/**
 * handleBasketChange - handle basket product items collection change event
 *
 * @api private
 */
function handleBasketChange() {
    var scheduleStoresRequest = false;
    var basketPIdsAndQuants = getBasketProductIdsAndQuantities();

    if (basketPIdsAndQuants.length === $.basketInventory.length) {
        for (var idx = 0; idx < basketPIdsAndQuants.length; idx++) {
            var prod = $.basketInventory.get(basketPIdsAndQuants[idx].id);
            if (!prod || prod.getPreviouslySetQuantity() !== basketPIdsAndQuants[idx].quantity) {
                scheduleStoresRequest = true;
                break;
            }
        }
    } else {
        scheduleStoresRequest = true;
    }

    if (scheduleStoresRequest) {
        enteredValidPostalCode = '';
        $.nearestStores.reset([]);
        $.store_selected_next_button.setEnabled(false);
        $.address_form_next_button.setEnabled(false);
        switchToStoreSelector();
        if (currentBasket.getShippingAddress() && currentBasket.getDifferentStorePickup()) {
            Alloy.eventDispatcher.trigger('differentStorePickupAddress:reconfirmAddress');
        }
    }
}

/**
 * enableOrDisableStoreSelectedNextButton - enable or disable $.store_selected_next_button
 *
 * @api private
 */
function enableOrDisableStoreSelectedNextButton() {

    var selectedStoreModel = $.nearestStores.getSelectedStore();

    if (selectedStoreModel && selectedStoreModel.isSelected()) {
        $.store_selected_next_button.setEnabled(true);
    } else {
        $.store_selected_next_button.setEnabled(false);
    }
}

//----------------------------------------------
// ## UI EVENT HANDLER FUNCTIONS

/**
 * handleUnavailableItemsListClick - handle unavailable items table view popover click
 *
 * @param event
 * @api private
 */
function handleUnavailableItemsListClick(event) {
    if (event.source.id === 'delete_button') {
        confirmDeleteItem($.unavailableInventory.at(event.index));
    }
}

/**
 * handleStoreSelectedNextClick - handle $.store_selected_next_button click event
 *
 * @api private
 */
function handleStoreSelectedNextClick() {
    var selectedStoreModel = $.nearestStores.getSelectedStore();

    if (selectedStoreModel && selectedStoreModel.isSelected()) {
        switchToAddressForm();
    }
}

/**
 * handleGoBack - handle $.address_form_previous_button click event
 *
 * @api private
 */
function handleGoBack() {
    if (addressFormVisible) {
        if (!hasAnythingChanged()) {
            closeKeyboard();
            switchToStoreSelector();
        } else {
            Alloy.Dialog.showConfirmationDialog({
                messageString : _L('Are you sure you want to leave, you might lose the data filled in the form if you continue!'),
                titleString : _L('Address Form'),
                okButtonString : _L('Continue'),
                okFunction : function() {
                    closeKeyboard();
                    switchToStoreSelector();
                }
            });
        }
    }
}

/**
 * enableAddressFormNextClick - enable Address form next button id form validation is true
 *
 * @api private
 */
function enableAddressFormNextClick() {
    if (isNotNullOrEmpty(formMgr.getLastName()) && isNotNullOrEmpty(formMgr.getFirstName()) && formMgr.isPhoneValid() && formMgr.isEmailAddressValid()) {
        $.address_form_next_button.setEnabled(true);
    } else {
        $.address_form_next_button.setEnabled(false);
    }
}

/**
 * handleAddressFormNextClick - handle $.address_form_next_button click event
 *
 * @api private
 */
function handleAddressFormNextClick() {
    closeKeyboard();
    var storeAddressModel = $.nearestStores.getSelectedStore();
    if (isAddressFormValid() && storeAddressModel) {
        var address = storeAddressModel.constructStoreAddressForDifferentStorePickup(formMgr.getFirstName(), formMgr.getLastName());
        address.phone = formMgr.getPhone();
        $.trigger('addressEntered', {
            address : address,
            email : $.email_address.getValue(),
            isShipToStore : false,
            isDifferentStorePickup : true,
            pickupFromStoreId : storeAddressModel.getId(),
            message : $.message.getValue()
        });
    }

}

/**
 * clearPreviousSelections - clear our previous screen and store selections
 *
 * @api private
 */
function clearPreviousSelections() {
    logger.info('clearPreviousSelections called');
    switchToStoreSelector();
    var sections = $.store_list_container.getData();
    if (sections && _.isArray(sections) && sections.length > 0) {
        _.each(sections[0].rows, function(row, idx) {
            row.uncheckCheckbox();
        });
    }
    $.nearestStores.setSelectedStore(-1);
    enteredValidPostalCode = '';
    $.nearestStores.reset([]);
    currentBasket.setDifferentStorePickupMessage('');
    enableOrDisableStoreSelectedNextButton();
}

//---------------------------------------------------
// ## CONSTRUCTOR

render();
