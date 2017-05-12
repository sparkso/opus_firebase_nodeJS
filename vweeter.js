var firebase      = require('firebase');
var defaultDatabase, channelRef, broadcastRef;
var channels = [];
var vweeters = {};
var broadcasts = [];

Vweeter = () => {
    defaultDatabase = firebase.database();
    channelRef = firebase.database().ref('Channel');
    broadcastRef = firebase.database().ref('Broadcast');
    trackChannels();
}

Vweeter.update = () => {
    console.log('-- update --');
}

trackBroadCasts = () => {

}

trackChannels = () => {

    channelRef.on('child_added', function(snapshot) {
        var name = snapshot.key;
        console.log(name + ' channel is ready.');
        channels.push(name);
        trackVweeters(name);
    });

    broadcastRef.on('child_added', function(snapshot){
        if(snapshot.val() != null){
            console.log( snapshot.key + ' broadcast idx -> ' + snapshot.val().live);
        }
    });
}

trackVweeters = (channelName) => {
    var vweeterRef = firebase.database().ref('Vweeter/' + channelName);
    var queryRef = vweeterRef.limitToLast(20);
    vweeters[channelName] = [];
    queryRef.on('child_added', function(snapshot) {
        var key = snapshot.key;
        var duration = snapshot.val().duration;
        var voice = snapshot.val().voice;
        vweeters[channelName].push({
            'key': key,
            'voice':voice,
            'duration':duration
        });
    });

    queryRef.on('child_removed', function(snapshot){
        var isExist = (vweeters[channelName].indexOf(snapshot) > -1);
        if (isExist){
            console.log(snapshot.key + ' should be removed.');
            vweeters[channelName].forEach(function(element) {
                var key = element.key;
                var removed = vweeters[channelName].filter(function(obj) {
                    return obj.key !== key;
                });
            });        
        }
    });

    queryRef.once('value', function(snapshot){
        broadcastChannel(channelName);
    });
}

broadcastChannel = (channelName) => {

    var size = vweeters[channelName].length;
    var idx = -9999;
    var duration = 0;
    if (size > 0){
        var currentVweeter = vweeters[channelName][size - 1];
        idx = currentVweeter.key;
        duration = currentVweeter.duration;
    }

    // need to create broadcast if we dont have yet
    broadcastQuery = broadcastRef.child(channelName);
    broadcastQuery.once('value', function(snapshot){
        if(snapshot.val() == null){
            broadcastRef.child(channelName).set({
                'live' : idx
            });
            console.log('created ' + channelName + ' broadcast');
        }
    });
    /*vweeters[channelName].forEach(function(element) {
        var key = element.key;
        console.log(channelName + ' -> ' + key);
    });*/
}

module.exports = Vweeter;