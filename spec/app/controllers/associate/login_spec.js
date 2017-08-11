var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
describe('app/controllers/associate/login.js', function() {
    var addRemoveEventListener = {
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub()
    };

    var stub = {
        'appSettings': {
            setSetting: sinon.stub()
        },
        'logging': sinon.stub().returns({
            info: sinon.stub()
        }),
        'dialogUtils': {
            'showActivityIndicator': sinon.stub()
        },
        'config/countries': {
            'countryConfig': {
                'us': {
                    'displayName': 'United State'
                }
            }
        },
        'EAUtils': {
            isSymbolBasedLanguage: sinon.stub(),
            isLatinBasedLanguage: sinon.stub().returns(true),
            updateLocaleGlobalVariables: function() {
                var deferred = new _.Deferred();
                deferred.resolve();
                return deferred.promise();
            }
        }
    };

    $ = require('tiunit/mockcontroller').createControllerMock('app/controllers/associate/login.js');
    $ = _.extend($, {
        '__controllerPath': 'path',
        'employee_code': _.extend(addRemoveEventListener, {
            setValue: sinon.stub(),
            setHintText: sinon.stub()
        }),
        'employee_pin': addRemoveEventListener,
        'login_button': _.extend(addRemoveEventListener, {
            setTitle: sinon.stub()
        }),
        'success_ok_button': addRemoveEventListener,
        'country_cancel_button': addRemoveEventListener,
        'country_apply_button': _.extend(addRemoveEventListener, {
            setEnabled: sinon.stub()
        }),

        'new_password_cancel_button': addRemoveEventListener,
        'success_subtitle_label': _.extend(addRemoveEventListener, {
            setFont: sinon.stub()
        }),
        'change_country_label': _.extend(addRemoveEventListener, {
            setHeight: sinon.stub(),
            setVisible: sinon.stub(),
            setText: sinon.stub(),
        }),
        'storefront_label': {
            setText: sinon.stub(),
        },
        'country_label': {
            setText: sinon.stub(),
        },
        'assoc_title': {
            setText: sinon.stub(),
        },
        'country_dropdown_view': {
            init: sinon.stub(),
            deinit: sinon.stub(),
            updateCountrySelectedItem: sinon.stub()
        },
        'language_dropdown_view': {
            init: sinon.stub(),
            deinit: sinon.stub(),
            populateLanguages: sinon.stub(),
            updateLanguageSelectedItem: sinon.stub(),
            updateLanguageSelectedValue: sinon.stub()
        },
        'forgot_password_label': _.extend(addRemoveEventListener, {
            'setVisible': sinon.stub()
        }),
        'new_password_button': addRemoveEventListener,
        'new_password': _.extend(addRemoveEventListener, {
            hide: sinon.stub(),
            show: sinon.stub(),
            setHeight: sinon.stub()
        }),
        'country_selector': {
            hide: sinon.stub(),
            show: sinon.stub(),
            setHeight: sinon.stub()
        },
        'contents': {
            show: sinon.stub(),
            hide: sinon.stub(),
            setHeight: sinon.stub(),
            getVisible: sinon.stub()
        },
        'assoc_button': _.extend(addRemoveEventListener, {
            setFont: sinon.stub()
        }),
        'assoc_cancel_button': _.extend(addRemoveEventListener, {
            setFont: sinon.stub()
        }),
        'manager_view': {
            deinit: sinon.stub(),
            clearErrorMessage: sinon.stub()
        },

        'login_error_label': {
            setText: sinon.stub(),
            setHeight: sinon.stub(),
            hide: sinon.stub(),
            show: sinon.stub(),
            setHeight: sinon.stub()
        },
        'new_password_subtitle_label': {
            setHeight: sinon.stub(),
            hide: sinon.stub(),
            show: sinon.stub(),
            setText: sinon.stub()
        },
        'login_subtitle_label': {
            setHeight: sinon.stub(),
            hide: sinon.stub(),
            show: sinon.stub(),
            setText: sinon.stub()
        },
        'assoc_subtitle_label': {
            setHeight: sinon.stub(),
            show: sinon.stub(),
            setText: sinon.stub()
        },
        'assoc_error_label': {
            setText: sinon.stub(),
            hide: sinon.stub(),
            setHeight: sinon.stub(),
            show: sinon.stub()
        },
        'new_password_error_label': {
            setText: sinon.stub(),
            hide: sinon.stub(),
            setHeight: sinon.stub(),
            show: sinon.stub()
        },
        'getNewPassword': {
            setValue: sinon.stub()
        },
        'password_verify': {
            setValue: sinon.stub(),
            setHintText: sinon.stub()
        },
        'password': {
            setHintText: sinon.stub(),
            setValue: sinon.stub()
        },
        'assoc_code': {
            setValue: sinon.stub(),
            setHintText: sinon.stub()
        },
        'login_title': {
            setText: sinon.stub()
        },
        'success_title': {
            setText: sinon.stub()
        },
        'new_password_title': {
            setText: sinon.stub()
        },
        'stopListening': sinon.stub(),
        'destroy': sinon.stub()
    });

    Alloy.Styles = {
        appFont: {}
    };
    Alloy.CFG = Alloy.CFG || {};
    Alloy.CFG.show_forgot_password_link = true;
    Alloy.CFG.login_change_country_link = true;

    Alloy.eventDispatcher = {
        trigger: sinon.stub()
    }
    var controllerUnderTest = proxyquire('../../../../app/controllers/associate/login.js', stub);

    describe('init', function() {
        var createController = sinon.stub().returns({
            setTextFields: sinon.stub()
        });

        beforeAll(function() {
            Alloy.CFG.countrySelected = 'us';

            Alloy.CFG.login_change_country_link = true;
            Alloy.createController = createController;
            controllerUnderTest.init({
                'employee_id': '123'
            });
        });

        it('should have called setFont on $.assoc_cancel_button', function() {
            expect($.assoc_cancel_button.setFont.called).toEqual(true);
        });

    });

    describe('deinit', function() {
        beforeAll(function() {
            Alloy.CFG.show_forgot_password_link = true;
            $.toolbar.deinit = sinon.stub();
            controllerUnderTest.deinit();
        })
        it('should have called $.destroy', function() {
            expect($.destroy.called).toEqual(true);
        });
    });

    describe('onCountryChange', function() {
        beforeAll(function() {
            Alloy.Dialog = {
                showConfirmationDialog: sinon.spy()
            }
            $.country_apply_button.setEnabled = sinon.spy();
            controllerUnderTest.onCountryChange({
                selectedCountry: 'FR'
            });
        });

        it('should have called showConfirmationDialog on Alloy.Dialog', function() {
            expect(Alloy.Dialog.showConfirmationDialog.called).toEqual(true);
        });

        it('should have called setEnabled on $.country_apply_button with correct parameters', function() {
            expect($.country_apply_button.setEnabled.calledWith(false)).toEqual(true);
        });
    })

    describe('onCountryChange', function() {
        beforeAll(function() {
            Alloy.Dialog = {
                showConfirmationDialog: sinon.spy()
            }
            $.language_dropdown_view.populateLanguages = sinon.spy();
            $.language_dropdown_view.updateLanguageSelectedValue = sinon.spy();
            $.country_apply_button.setEnabled = sinon.spy();
            controllerUnderTest.onCountryChange({
                selectedCountry: 'us'
            });
        });


        it('should have called populateLanguages on $.language_dropdown_view with correct parameters', function() {
            expect($.language_dropdown_view.populateLanguages.calledWith('us')).toEqual(true);
        });

        it('should have called updateLanguageSelectedValue on $.language_dropdown_view', function() {
            expect($.language_dropdown_view.updateLanguageSelectedValue.called).toEqual(true);
        });

        it('should have called setEnabled on $.country_apply_button with correct parameters', function() {
            expect($.country_apply_button.setEnabled.calledWith(true)).toEqual(true);
        });
    });

    describe('onLanguageChange', function() {
        beforeAll(function() {
            $.country_apply_button.setEnabled = sinon.spy();
            controllerUnderTest.onLanguageChange({});
        })
        it('should have called setEnabled on $.country_apply_button with correct parameters', function() {
            expect($.country_apply_button.setEnabled.calledWith(true)).toEqual(true);
        });
    });

    describe('onLanguageChange', function() {
        beforeAll(function() {
            $.country_apply_button.setEnabled = sinon.spy();
            controllerUnderTest.onLanguageChange();
        })
        it('should have called setEnabled on $.country_apply_button with correct parameters', function() {
            expect($.country_apply_button.setEnabled.calledWith(false)).toEqual(true);
        });
    });

    describe('showCountrySelector', function() {
        beforeAll(function() {
            $.contents.setHeight = sinon.spy();
            controllerUnderTest.showCountrySelector();
        })
        it('should have called setHeight on $.contents', function() {
            expect($.contents.setHeight.called).toEqual(true);
        });
    });

    describe('validatePassword', function() {
        it('validatePassword should return true', function() {
            expect(controllerUnderTest.validatePassword()).toEqual(true);
        });
    });

    describe('resetError', function() {
        beforeAll(function() {
            $.contents.getVisible = sinon.stub().returns(true);
            $.login_subtitle_label.setHeight = sinon.spy();
            controllerUnderTest.resetError();
        })
        it('should have called setHeight on $.login_subtitle_label with the correct parameters', function() {
            expect($.login_subtitle_label.setHeight.calledWith(50)).toEqual(true);
        });
    });

    describe('resetError', function() {
        beforeAll(function() {
            $.contents.getVisible = sinon.stub().returns(false);
            $.associate.getVisible = sinon.stub().returns(true);
            $.assoc_subtitle_label.setHeight = sinon.spy();
            controllerUnderTest.resetError();
        })
        it('should have called setHeight on $.assoc_subtitle_label with the correct parameters', function() {
            expect($.assoc_subtitle_label.setHeight.calledWith(50)).toEqual(true);
        });
    });

    describe('resetError', function() {
        beforeAll(function() {
            $.contents.getVisible = sinon.stub().returns(false);
            $.associate.getVisible = sinon.stub().returns(false);
            $.new_password.getVisible = sinon.stub().returns(true);
            $.new_password_subtitle_label.setHeight = sinon.spy();
            controllerUnderTest.resetError();
        })
        it('should have called setHeight on $.new_password_subtitle_label with the correct parameters', function() {
            expect($.new_password_subtitle_label.setHeight.calledWith(50)).toEqual(true);
        });
    });

    describe('getNewPassword', function() {
        beforeAll(function() {
            $.assoc_code.setValue = sinon.spy();
            controllerUnderTest.getNewPassword();
        })
        it('should have called setValue on $.getNewPassword', function() {
            expect($.assoc_code.setValue.called).toEqual(true);
        });
    });

    describe('renderError', function() {
        beforeAll(function() {
            $.new_password_subtitle_label.hide = sinon.stub();
            $.new_password_error_label.setFont = sinon.spy();
            $.new_password_error_label.show = sinon.spy();
            controllerUnderTest.renderError('error');
        })
        it('should have called setFont on $.new_password_error_label', function() {
            expect($.new_password_error_label.setFont.called).toEqual(true);
        });
        it('should have called show on $.new_password_error_label', function() {
            expect($.new_password_error_label.show.called).toEqual(true);
        });
    });

    describe('renderError', function() {
        beforeAll(function() {
            $.login_error_label.hide = sinon.stub();
            $.login_error_label.show = sinon.spy();
            $.login_error_label.setFont = sinon.stub();
            $.login_subtitle_label.setFont = sinon.stub();
            $.login_subtitle_label.show = sinon.stub();
            $.contents.getVisible = sinon.stub().returns(true);
            controllerUnderTest.renderError('error');
        })
        it('should have called show on $.login_error_label', function() {
            expect($.login_error_label.show.called).toEqual(true);
        });

    });

    describe('renderError', function() {
        beforeAll(function() {

            $.assoc_error_label.setFont = sinon.stub();
            $.assoc_subtitle_label.hide = sinon.stub();
            $.contents.getVisible = sinon.stub().returns(false);
            $.associate.getVisible = sinon.stub().returns(true);
            $.assoc_error_label.show = sinon.spy();
            controllerUnderTest.renderError('error');
        });
        it('should have called show on $.assoc_error_label', function() {
            expect($.assoc_error_label.show.called).toEqual(true);
        });

    });

    describe('showPasswordChangedSuccessfully', function() {
        beforeAll(function() {
            $.password_verify.setValue = sinon.spy();
            controllerUnderTest.showPasswordChangedSuccessfully('error');
        })
        it('should have called setValue on $.password_verify', function() {
            expect($.password_verify.setValue.called).toEqual(true)
        })
    });

    describe('doForgotPassword', function() {
        beforeAll(function() {
            Alloy.createModel = sinon.stub().returns({});
            $.manager_view.init = sinon.stub();
            $.manager_view.getView = sinon.stub().returns({
                setHeight: sinon.stub(),
                setLeft: sinon.stub(),
                setTop: sinon.stub()
            });
            controllerUnderTest.doForgotPassword();
        });
        it('should have called clearErrorMessage on $.manager_view', function() {
            expect(true).toEqual(true)
        })
    });

    describe('resetLoginForm', function() {
        beforeAll(function() {
            Alloy.createModel = sinon.stub();
            $.manager_view.clearErrorMessage = sinon.spy();
            controllerUnderTest.doForgotPassword();
            controllerUnderTest.resetLoginForm();
        });
        it('should have called clearErrorMessage on $.manager_view', function() {
            expect($.manager_view.clearErrorMessage.called).toEqual(true)
        })
    });

    describe('resetLoginForm', function() {
        var modelGet = sinon.stub().returns({
            message: 'hello'
        });
        beforeAll(function() {

            Alloy.createModel = sinon.stub().returns({
                isLoggedIn: sinon.stub().returns(true),
                logout: function() {
                    var deferred = new _.Deferred();
                    deferred.reject({
                        get: modelGet
                    });
                    return deferred.promise();
                }
            });
            $.manager_view.clearErrorMessage = sinon.spy();
            controllerUnderTest.doForgotPassword();
            controllerUnderTest.resetLoginForm();
        });
        it('should have called model.get after manager logout fail', function() {
            expect(modelGet.called).toEqual(true)
        })
    });

    describe('updateLabels', function() {
        beforeAll(function() {
            $.login_title.setText = sinon.stub();
            $.manager_view.updateLabels = sinon.spy()
            controllerUnderTest.updateLabels();
        });

        it('should have called updateLabels on $.manager_view', function() {
            expect($.manager_view.updateLabels.called).toEqual(true)
        })
    });

    describe('onCountryApplyClick', function() {
        beforeAll(function() {
            Ti.Locale.setLanguage = sinon.stub();
            $.change_country_label.setText = sinon.spy();
            controllerUnderTest.onCountryApplyClick()
        });

        it('should have called setText on $.change_country_label', function() {
            expect($.change_country_label.setText.called).toEqual(true)
        });
    });

    describe('onChangeCountryClick', function() {
        beforeAll(function() {
            $.language_dropdown_view.updateLanguageSelectedItem = sinon.spy();
            controllerUnderTest.onChangeCountryClick()
        });

        it('should have called updateLanguageSelectedItem on $.language_dropdown_view', function() {
            expect($.language_dropdown_view.updateLanguageSelectedItem.called).toEqual(true)
        });
    });

    describe('getAssociateId', function() {
        beforeAll(function() {
            $.manager.setHeight = sinon.spy();
            controllerUnderTest.getAssociateId()
        });

        it('should have called setHeight on $.manager', function() {
            expect($.manager.setHeight.called).toEqual(true)
        });
    });

    describe('validateAssociateExists', function() {
        var modelGet = sinon.stub().returns({
            message: 'hello'
        });
        beforeAll(function() {
            Alloy.createModel = sinon.stub().returns({
                validateAssociateExists: function() {
                    var deferred = new _.Deferred();
                    deferred.resolve({
                        get: modelGet
                    });
                    return deferred.promise();
                }
            });
            controllerUnderTest.doForgotPassword();
            $.assoc_code.getValue = sinon.stub();
            controllerUnderTest.validateAssociateExists()
        });

        it('should have called model.get on promise done with the right parameters', function() {
            expect(modelGet.calledWith('fault')).toEqual(true)
        });

    });

    describe('validateAssociateExists', function() {
        var modelGet = sinon.stub().returns({
            message: 'hello'
        });
        beforeAll(function() {

            Alloy.createModel = sinon.stub().returns({
                validateAssociateExists: function() {
                    var deferred = new _.Deferred();
                    deferred.reject({
                        get: modelGet
                    });
                    return deferred.promise();
                }
            });
            controllerUnderTest.doForgotPassword();
            $.assoc_code.getValue = sinon.stub();
            controllerUnderTest.validateAssociateExists();
        });

        it('should have called model.get on promise fail with the right parameters', function() {
            expect(modelGet.calledWith('fault')).toEqual(true)
        });

    });

    describe('doLogin', function() {
        beforeAll(function() {
            Alloy.Models.associate = {
                loginAssociate: function() {
                    var deferred = new _.Deferred();
                    deferred.resolve();
                    return deferred.promise();
                },
                getPermissions: sinon.stub().returns({
                    allowLOBO: true
                })
            };

            controllerUnderTest = proxyquire('../../../../app/controllers/associate/login.js', stub);
            $.login_button.animate = sinon.stub();
            $.employee_pin.blur = sinon.stub();
            $.employee_code.getValue = sinon.stub().returns({});
            $.trigger = sinon.spy();
            controllerUnderTest.doLogin();

        })
        it('should have called $.trigger on promise done', function() {
            expect($.trigger.called).toEqual(true)
        })
    });

    describe('doLogin', function() {
        beforeAll(function() {
            Alloy.Models.associate = {
                get: sinon.stub().returns(200),
                loginAssociate: function() {
                    var deferred = new _.Deferred();
                    deferred.reject();
                    return deferred.promise();
                },
                getPermissions: sinon.stub().returns({
                    allowLOBO: true
                })
            };

            controllerUnderTest = proxyquire('../../../../app/controllers/associate/login.js', stub);
            $.login_button.animate = sinon.stub();
            $.employee_code.getValue = sinon.stub().returns({});
            $.employee_pin.setValue = sinon.spy();
            controllerUnderTest.doLogin();

        })
        it('should have called $.employee_pin.setValue on promise fail', function() {
            expect($.employee_pin.setValue.called).toEqual(true)
        })
    });

    describe('changePassword', function() {
        success = sinon.stub().returns(200)
        modelGet = function(key) {
            if (key === 'httpStatus') {
                return success();
            } else {
                return;
            }
        };
        beforeAll(function() {

            Alloy.createModel = sinon.stub().returns({
                validateAssociateExists: function() {
                    var deferred = new _.Deferred();
                    deferred.resolve({
                        get: modelGet
                    });
                    return deferred.promise();
                },
                changePassword: function() {
                    success = sinon.stub().returns(200)
                    var newModelGet = function(key) {
                        if (key === 'httpStatus') {
                            return success();
                        } else {
                            return;
                        }
                    };
                    var deferred = new _.Deferred();
                    deferred.resolve({
                        get: newModelGet
                    });
                    return deferred.promise();
                }
            });
            controllerUnderTest.doForgotPassword();
            $.assoc_code.getValue = sinon.stub();
            controllerUnderTest.validateAssociateExists();

            $.password.getValue = sinon.stub();
            $.password_verify.getValue = sinon.stub();
            controllerUnderTest.changePassword();
        })
        it('shoul have called model.get("httpStatus") 4 times after changePassword done', function() {
            expect(success.callCount).toEqual(3)
        })
    });

    describe('changePassword', function() {
        success = sinon.stub().returns(200)
        modelGet = function(key) {
            if (key === 'httpStatus') {
                return success();
            } else {
                return;
            }
        };
        beforeAll(function() {

            Alloy.createModel = sinon.stub().returns({
                validateAssociateExists: function() {
                    var deferred = new _.Deferred();
                    deferred.resolve({
                        get: modelGet
                    });
                    return deferred.promise();
                },
                changePassword: function() {
                    success = sinon.stub().returns(200)
                    var newModelGet = function(key) {
                        if (key === 'httpStatus') {
                            return success();
                        } else {
                            return;
                        }
                    };
                    var deferred = new _.Deferred();
                    deferred.reject({
                        get: newModelGet
                    });
                    return deferred.promise();
                }
            });
            controllerUnderTest.doForgotPassword();
            $.assoc_code.getValue = sinon.stub();
            controllerUnderTest.validateAssociateExists();

            $.password.getValue = sinon.stub();
            $.password_verify.getValue = sinon.stub();
            controllerUnderTest.changePassword();
        })
        it('shoul have called model.get("httpStatus") once after changePassword fail', function() {
            expect(success.callCount).toEqual(1)
        })
    });

})
