var firebase      = require('firebase');
var defaultDatabase, channelRef, broadcastRef;
var channels = [];
var vweeters = {};
var broadcasts = [];

var isBroadcasting = false;

Vweeter = () => {
    defaultDatabase = firebase.database();
    channelRef = firebase.database().ref('Channel');
    broadcastRef = firebase.database().ref('Broadcast');

    trackChannels();

    trackBroadCasts();
}

Vweeter.update = () => {
    console.log('-- update --');
}

trackBroadCasts = () => {
    broadcastRef.on('child_added', function(snapshot){
        if(snapshot.val() != null){
            console.log( 'broadcast of ' + snapshot.key + ' intialized as ' + snapshot.val().live);
        }
    });
}

trackChannels = () => {
    channelRef.on('child_added', function(snapshot) {
        var name = snapshot.key;
        channels.push(name);
        trackVweeters(name);
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

        // if (isBroadcasting){
        //     broadcastQuery = broadcastRef.child(channelName);
        //     broadcastQuery.once('value', function(snapshot){
        //         var live = snapshot.val().live;
        //         if (live == -9999 && vweeters[channelName].length > 0){
        //             console.log('we need to upate ' + channelName + ' live as : ' + key + ' from ' + live);
        //             broadcastRef.child(channelName).set({
        //                 'live' : key
        //             });
        //         }
        //     });
        // }
    });

    queryRef.on('child_removed', function(snapshot){
        if(snapshot.val() != null){
            for (var idx = 0; idx < vweeters[channelName].length; idx++){
                var vweeter = vweeters[channelName][idx];
                var key = vweeter.key;
                console.log(snapshot.key);
                if (snapshot.key == key){
                    console.log(snapshot.key + ' should be removed.');
                    vweeters[channelName].splice(idx,1);

                    if(vweeters[channelName].length == 0){
                        broadcastRef.child(channelName).set({
                            'live' : -9999
                        });
                    }
                }
            }
        }
    });

    queryRef.once('value', function(snapshot){
        broadcastChannel(channelName);
    });
}

broadcastChannel = (channelName) => {

    var size = vweeters[channelName].length;
    var idx = -9999;
    var next_idx = 0; // next tweeter
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

        isBroadcasting = true;
    });

    broadcastQuery.on('value', function(snapshot){
        if (snapshot.val() != null){
            var channel = snapshot.key;
            var current = snapshot.val().live;
            console.log('broadcast of ' + channel + ' value has been changed :' + current);

            var idn = 0;
            for (var idx = 0; idx < vweeters[channel].length; idx++){
                var vweeter = vweeters[channel][idx];
                var key = vweeter.key;
                var duration = vweeter.duration; 
                if (key == current){
                    idn = idx + 1;
                    if (idn >= vweeters[channel].length){
                        idn = 0;
                    }

                    var next_vweeter = vweeters[channel][idn];
                    next_idx = next_vweeter.key;

                    setTimeout(next, duration*1000);
                    break;
                }
            }
        }
    });

    function next(){
        broadcastRef.child(channelName).set({
            'live' : next_idx
        });
    }

    /*
    if(duration > 0){
        function next() {
            console.log('Hello');
            setTimeout(next, duration*1000);
        }
        setTimeout(next, duration*1000);
    }*/
}

module.exports = Vweeter;