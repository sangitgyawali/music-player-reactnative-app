import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
// 🛑 UPDATED IMPORT: Using the new expo-audio package
import * as Audio from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Asset } from 'expo-media-library';

// --- TYPE DEFINITIONS ---
type MusicFile = Asset;

// --- UTILITY FUNCTIONS ---

/**
 * Formats milliseconds into a MM:SS string.
 * @param ms - Duration in milliseconds.
 */
const formatDuration = (ms: number | undefined): string => {
  if (!ms) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- MAIN COMPONENT ---

export default function App() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  // Use the Audio.Sound type from the new package
  const [sound, setSound] = useState<Audio.Sound | null>(null); 
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  // Use the new Audio.PlaybackStatus type
  const [status, setStatus] = useState<Audio.PlaybackStatus | null>(null); 

  // --- PERMISSION & FETCHING ---

  const getPermissions = async (): Promise<boolean> => {
    if (permissionResponse?.status !== 'granted') {
      const { status: newStatus } = await requestPermission();
      if (newStatus !== 'granted') {
        Alert.alert('Permission Required', 'Media library access is needed to play music. Please grant it in app settings.');
        return false;
      }
    }
    return true;
  };

  const getMusicFiles = async () => {
    const hasPermission = await getPermissions();
    if (!hasPermission) return;

    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        limit: 50,
      });
      setMusicFiles(media.assets);
      console.log(`Found ${media.assets.length} audio files.`);
    } catch (error) {
      console.error('Error fetching music files:', error);
    }
  };

  // --- PLAYBACK LOGIC ---

  // 🛑 UPDATED TYPE: Use Audio.PlaybackStatus
  const onPlaybackStatusUpdate = (playbackStatus: Audio.PlaybackStatus) => { 
    setStatus(playbackStatus);
    
    // The structure of playbackStatus.isLoaded and playbackStatus.didJustFinish remains similar
    if (playbackStatus.isLoaded && playbackStatus.didJustFinish) { 
      setIsPlaying(false);
      setCurrentTrackIndex(-1);
      sound?.unloadAsync(); 
      setSound(null);
    }
  };

  const playTrack = async (fileUri: string, index: number) => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }

    try {
      // Audio.Sound.createAsync is the same in the new package
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    } catch (e) {
      console.error('Error playing track:', e);
      Alert.alert('Playback Error', 'Could not play the selected file. Ensure the file exists and is a valid format.');
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  // --- EFFECTS ---

  useEffect(() => {
    getMusicFiles();

    return () => {
      if (sound) {
        console.log('Unloading Sound on component unmount');
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // --- RENDER FUNCTIONS ---

  const renderItem = ({ item, index }: { item: MusicFile, index: number }) => {
    const isCurrentTrack = index === currentTrackIndex;
    const iconName = isCurrentTrack && isPlaying ? 'pause-circle' : 'play-circle';
    
    // Status check remains the same
    const currentPosition = status?.isLoaded && isCurrentTrack ? status.positionMillis : 0;
    const totalDuration = status?.isLoaded && isCurrentTrack ? status.durationMillis : item.duration ? item.duration * 1000 : 0; 
    
    const progressText = isCurrentTrack && status?.isLoaded 
      ? `${formatDuration(currentPosition)} / ${formatDuration(totalDuration)}`
      : formatDuration(item.duration ? item.duration * 1000 : 0);

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrentTrack && styles.currentTrack]}
        onPress={() => {
          if (isCurrentTrack) {
            togglePlayPause(); 
          } else {
            playTrack(item.uri, index); 
          }
        }}
      >
        <Ionicons name={iconName} size={30} color={isCurrentTrack ? '#FFF' : '#4CAF50'} />
        <View style={styles.trackInfo}>
          <Text style={[styles.fileName, { color: isCurrentTrack ? '#FFF' : '#333' }]} numberOfLines={1}>
            {item.filename}
          </Text>
          <Text style={[styles.duration, { color: isCurrentTrack ? '#CCC' : '#888' }]}>
            {progressText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const currentTrackName = currentTrackIndex !== -1 
    ? musicFiles[currentTrackIndex]?.filename
    : 'Select a song';

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.header}>🎧 Offline Music Player</Text>
      
      {musicFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No music files found or permission denied.
            {'\n'}
            **CRITICAL NOTE**: You must run this using a **Development Build** (`npx expo run:android`).
          </Text>
          <TouchableOpacity onPress={getMusicFiles} style={styles.refreshButton}>
             <Text style={styles.refreshButtonText}>Refresh/Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={musicFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      {/* Permanent Player Bar at the bottom */}
      <View style={styles.playerBar}>
        <Text style={styles.playerBarText} numberOfLines={1}>
            {currentTrackIndex !== -1 
                ? `${isPlaying ? '▶️ Playing:' : '⏸️ Paused:'} ${currentTrackName}`
                : '🎶 Tap a song to begin playback.'}
        </Text>
      </View>
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 100, // Make room for the player bar
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.41,
    elevation: 2,
  },
  currentTrack: {
    backgroundColor: '#4CAF50', // Green highlight for current playing track
  },
  trackInfo: {
    marginLeft: 15,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    marginTop: 2,
  },
  playerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#555',
  },
  playerBarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});