// trackPlayerService.js

import TrackPlayer, { Event, RepeatMode } from 'react-native-track-player';

module.exports = async function() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
        TrackPlayer.seekTo(position);
    });
    
    // Auto-repeat mode for testing/production
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ track, position }) => {
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
            // Loop the whole queue
            TrackPlayer.setRepeatMode(RepeatMode.Queue);
        }
    });
};