sinon = require('sinon');
Backbone = require('backbone');
_ = require('underscore');
_.mixin(require('./underscore.deferred'));

String.format = _L = L = function (text) {
    return text;
};

Ti = require('tiunit/jsca.api.parser').parse();
getFullControllerPath = sinon.stub();

Alloy = {
    '_': _,
    UNIT_TEST: true,
    Styles: {},
    CFG: {
        theme: 'demandware',
        storefront_host: 'demandware.com',
        ocapi: {
            validate_secure_cert: false
        }
    },
    Globals: {

    },
    Models: {
        associate: {}
    }
};
