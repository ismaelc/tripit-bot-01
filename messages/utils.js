function getParameterByName(name, url) {
    /*
    if (!url) {
      url = window.location.href;
    }
    */
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// TODO: Move this to userData module
// Array of group channel addresses so that you can share info
// to last group/channel pair
function saveLastGroupChannelAddress(session) {
    //return 'test';
    // << Get current message's channel to compare later
    var channelId = session.message.address.channelId;
    var serviceUrl = session.message.address.serviceUrl;

    // >> If no group/channels are saved to userData yet, initialize it
    if(!session.userData.lastGroupChannelAddresses) session.userData.lastGroupChannelAddresses = [];

    // >> Loop through userData to compare incoming message address
    var i = 0;
    for(var len = session.userData.lastGroupChannelAddresses; i < len; i++) {
        var groupChannelAddress = session.userData.lastGroupChannelAddresses[i];
        if((groupChannelAddress.channelId == channelId) && (groupChannelAddress.serviceUrl == serviceUrl)) {
            // Found! Replace with current message address
            session.userData.lastGroupChannelAddresses[i] = session.message.address;
            break;
        }
    }

    return JSON.stringify(session.userData.lastGroupChannelAddresses);
}

exports.getParameterByName = getParameterByName;
exports.saveLastGroupChannelAddress = saveLastGroupChannelAddress;
