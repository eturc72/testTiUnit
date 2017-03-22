function doClick(e) {
    Ti.UI.createAlertDialog({
        message: $.label.text,
        ok: 'Okay',
        title: 'File Deleted'
    }).show();
}

$.index.open();

function isNetworkPresent() {
    if (_.isEqual(Ti.Network.NETWORK_NONE, Ti.Network.getNetworkType())) {
        Ti.API.warn('Please connect to a network and try again');
        console.log('The network is not present');
        return false;
    } else {
        Ti.App.fireEvent('bar');
        console.log('The network is present');
        return true;
    }
}

module.exports = {
    isNetworkPresent: isNetworkPresent,
    doClick: doClick
};
