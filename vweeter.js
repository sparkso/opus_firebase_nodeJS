var firebase      = require('firebase');
var defaultDatabase, channelRef, broadcastRef;
var channels = [];
var vweeters = {}, isInitializedVweeters = {};
var broadcasts = [];

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
            console.log( 'broadcast of ' + snapshot.key + ' intialized as ' + snapshot.val().live.idx);
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

trackVweeters = (channel) => {
    var vweeterRef = firebase.database().ref('Vweeter/' + channel);
    var queryRef = vweeterRef.limitToLast(20);
    vweeters[channel] = [];
    isInitializedVweeters[channel] = false;

    queryRef.on('child_added', function(snapshot) {
        var key = snapshot.key;
        var duration = snapshot.val().duration;
        var voice = snapshot.val().voice;
    
        var isInitialized = isInitializedVweeters[channel];
        if (isInitialized){
            vweeters[channel].push({
                'key': key,
                'voice':voice,
                'duration':duration,
                'isNew':true
            });
        }else{
            vweeters[channel].push({
                'key': key,
                'voice':voice,
                'duration':duration,
                'isNew':false
            });
        }
    });

    queryRef.on('child_removed', function(snapshot){
        if(snapshot.val() != null){
            for (var idx = 0; idx < vweeters[channel].length; idx++){
                var vweeter = vweeters[channel][idx];
                var key = vweeter.key;
                console.log(snapshot.key);
                if (snapshot.key == key){
                    console.log(snapshot.key + ' should be removed.');
                    vweeters[channel].splice(idx,1);

                    if(vweeters[channel].length == 0){
                        broadcastRef.child(channel).set({
                            'live' : {
                                'idx':-9999,
                                'isNew':true
                            },
                        });
                    }
                }
            }
        }
    });

    queryRef.once('value', function(snapshot){
        isInitializedVweeters[channel] = true;
        broadcastChannel(channel);
    });
}

broadcastChannel = (channel) => {

    var next_idx = 0;       // next vweeter idx
    var next_link = "null"; // next link of voice

    // need to create broadcast if we dont have yet
    checkoutBroadcast(channel);

    broadcastQuery.on('value', function(snapshot){
        if (snapshot.val() != null){
            var channel = snapshot.key;
            var current = snapshot.val().live.idx;
            console.log('broadcast of ' + channel + ' -> :' + current);

            updateBroadcast(channel, current);
        }
    });

    function checkNewVweeter(channel, callback){
        var isExist = false;
        var vweeter = null;
        var indexOf = 0;
        for (var idx = 0; idx < vweeters[channel].length; idx++){
            vweeter = vweeters[channel][idx];
            indexOf = idx;
            var isNew = vweeter.isNew;
            if (isNew == true) {
                isExist = true;
                vweeter.isNew = false; // update dictoionary value
                break;
            }
        }

        return callback(isExist, vweeter, indexOf);
    }

    function updateBroadcast(channel, current){

        checkNewVweeter(channel, function(isExist, vweeter, indexOf){
            if (isExist){
                var duration = vweeter.duration;
                next_idx = vweeter.key;
                setTimeout(function(){
                    broadcastRef.child(channel).set({
                        'live' : {
                            'idx':next_idx,
                            'isNew':isExist
                        },
                    });
                }, (duration + 1.5) * 1000);
            }else{
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
                        next_link = next_vweeter.voice;
                        setTimeout(function(){
                            
                            broadcastRef.child(channel).set({
                                'live' : {
                                    'idx':next_idx,
                                    'isNew':isExist
                                },
                            });
                        }, (duration + 1.5) * 1000);
                        break; 
                    }
                }
            }
        });
    }

    function checkoutBroadcast(channel){
        var size = vweeters[channel].length;
        var idx = -9999;
        var duration = 0;
        if (size > 0){
            var currentVweeter = vweeters[channel][size - 1];
            idx = currentVweeter.key;
            duration = currentVweeter.duration;
        }
        broadcastQuery = broadcastRef.child(channel);
        broadcastQuery.once('value', function(snapshot){
            if(snapshot.val() == null){
                broadcastRef.child(channel).set({
                    'live' : {
                        'idx':idx,
                        'isNew':true
                    },
                });
                console.log('created ' + channel + ' broadcast');
            }
        });
    }
}

module.exports = Vweeter;