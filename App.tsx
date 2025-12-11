import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
  Switch, // NEW IMPORT for Settings
  ScrollView, // NEW IMPORT for Settings
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import * as Audio from "expo-audio";
import * as MediaLibrary from "expo-media-library";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

// --- MOCKING ASYNC STORAGE FOR THEME PERSISTENCE ---
// In a real app, you would use '@react-native-async-storage/async-storage'
const mockAsyncStorage = {
  getTheme: async () => {
    // Simulate reading saved theme
    return Math.random() < 0.5 ? "dark" : "light"; // Random start
  },
  saveTheme: async (theme) => {
    // Simulate saving theme
    console.log(`Simulating saving theme: ${theme}`);
  },
};

/* --------------------------
   TYPE DEFINITIONS
--------------------------- */
type MusicFile = {
  id: string;
  filename: string;
  uri: string;
  duration: number; // Duration in seconds
};

type ColorScheme = "dark" | "light";

// Define the root styles to use a variable for easy switching
const COLORS = {
  dark: {
    background: "#0d0d0e",
    surface: "#161616",
    surfaceHighlight: "#1f2a38",
    accent: "#4A90E2", // Blue
    danger: "#E74C3C", // Red
    text: "#fff",
    textMuted: "#999",
    textSubtle: "#777",
    textAccent: "#cce6ff",
    border: "#222",
  },
  light: {
    background: "#f0f2f5",
    surface: "#ffffff",
    surfaceHighlight: "#e5f1ff",
    accent: "#007AFF", // System Blue
    danger: "#FF3B30",
    text: "#000",
    textMuted: "#555",
    textSubtle: "#aaa",
    textAccent: "#004799",
    border: "#ddd",
  },
};

const initialLayout = { width: Dimensions.get("window").width };

/* --------------------------
   UTILITY
--------------------------- */
const formatDuration = (ms: number | undefined): string => {
  if (!ms) return "00:00";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// Helper function to get the current set of styles based on theme
const getThemedStyles = (theme: ColorScheme) => {
  const currentColors = COLORS[theme];
  const isDark = theme === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background,
      paddingTop: 50,
    },
    header: {
      fontSize: 28,
      fontWeight: "bold",
      color: currentColors.accent,
      textAlign: "center",
      marginBottom: 10,
    },
    scene: {
      flex: 1,
      backgroundColor: currentColors.background,
    },
    centerScene: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    infoText: {
      marginTop: 15,
      color: currentColors.text,
      fontSize: 16,
      textAlign: "center",
      lineHeight: 24,
    },
    subText: {
        color: currentColors.textSubtle,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 5,
    },

    /* PERMISSION STYLES */
    permissionNote: {
      color: currentColors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
      marginTop: 10,
      lineHeight: 20,
      fontWeight: '500',
    },
    permissionButton: {
      backgroundColor: currentColors.accent,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      marginTop: 20,
    },
    permissionButtonText: {
      color: isDark ? currentColors.text : currentColors.background,
      fontSize: 16,
      fontWeight: 'bold',
    },

    /* TAB BAR */
    tabBar: {
      backgroundColor: isDark ? "#121212" : "#fff",
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    tabIndicator: {
      backgroundColor: currentColors.accent,
      height: 3,
      borderRadius: 10,
    },

    /* TRACK LIST */
    listContainer: {
      paddingBottom: 200,
    },
    trackItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: currentColors.surface,
      padding: 14,
      marginVertical: 6,
      marginHorizontal: 10,
      borderRadius: 10,
      shadowColor: isDark ? "#000" : "#000",
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 4,
    },
    currentTrack: {
      backgroundColor: currentColors.surfaceHighlight,
      borderColor: currentColors.accent,
      borderWidth: 1,
    },
    trackInfo: {
      marginLeft: 15,
      flex: 1,
    },
    fileName: {
      fontSize: 17,
      fontWeight: "600",
      color: currentColors.text,
    },
    duration: {
      fontSize: 12,
      marginTop: 3,
      color: currentColors.textSubtle,
    },
    currentTrackText: { color: currentColors.text },
    currentTrackSubText: { color: currentColors.textAccent },
    accentColor: { color: currentColors.accent },

    // MINI PLAYER
    miniPlayer: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      backgroundColor: isDark ? "#121212" : "#fff",
      padding: 15,
      borderTopWidth: 2,
      borderTopColor: currentColors.accent,
    },
    playerBarTitle: {
      color: currentColors.text,
      fontWeight: "600",
      fontSize: 16,
      textAlign: "center",
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
    },
    timeText: {
      color: currentColors.textMuted,
      fontSize: 12,
    },
    controls: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    playPauseButton: {
      width: 65,
      height: 65,
      borderRadius: 40,
      backgroundColor: currentColors.accent,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: currentColors.accent,
      shadowOpacity: 0.8,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 10,
    },
    noTrackBar: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      backgroundColor: isDark ? "#181818" : "#fff",
      padding: 20,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: currentColors.border,
    },
    noTrackText: {
      color: currentColors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
    
    // SETTINGS STYLES
    settingsContainer: {
        padding: 20,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: currentColors.border,
    },
    settingText: {
        fontSize: 17,
        color: currentColors.text,
        fontWeight: '500',
    },
    settingSubText: {
        fontSize: 12,
        color: currentColors.textSubtle,
        marginTop: 2,
    },
    settingLink: {
        flexDirection: 'row',
        alignItems: 'center',
    }
  });
};


/* --------------------------
   SCREEN COMPONENTS
--------------------------- */

// *** Permission Denied Screen ***
const PermissionScreen = ({ styles, requestPermission }) => (
  <View style={styles.centerScene}>
    <Text style={styles.header}>Offline Music Player</Text>
    <Text style={styles.permissionNote}>
      **CRITICAL NOTE**: Reading local files requires storage permission. 
      {"\n"}
      Also, you **must** run this using a **Development Build** (`npx expo run android`).
    </Text>
    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
      <Text style={styles.permissionButtonText}>Refresh/Grant Permission</Text>
    </TouchableOpacity>
    <Ionicons name="warning" size={100} color={COLORS.dark.danger} style={{marginTop: 30}} />
  </View>
);

// *** All Songs Screen ***
const AllSongsRoute = ({
  musicFiles,
  currentTrackIndex,
  isPlaying,
  playTrack,
  togglePlayPause,
  styles, // Passed styles
}) => {
  const renderItem = ({ item, index }) => {
    const isCurrent = index === currentTrackIndex;
    const iconName = isCurrent && isPlaying ? "pause-circle" : "play-circle";

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrent && styles.currentTrack]}
        onPress={() => {
          if (isCurrent) togglePlayPause();
          else playTrack(item.uri, index);
        }}
      >
        <Ionicons
          name={iconName}
          size={32}
          color={isCurrent ? styles.accentColor.color : styles.textSubtle.color}
        />

        <View style={styles.trackInfo}>
          <Text
            style={[
              styles.fileName,
              isCurrent ? styles.currentTrackText : styles.fileName,
            ]}
            numberOfLines={1}
          >
            {item.filename}
          </Text>
          <Text
            style={[
              styles.duration,
              isCurrent ? styles.currentTrackSubText : styles.duration,
            ]}
          >
            {formatDuration(item.duration * 1000)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (musicFiles.length === 0) {
    return (
      <View style={styles.centerScene}>
        <Ionicons name="musical-notes-outline" size={80} color={styles.textSubtle.color} />
        <Text style={styles.infoText}>
          No music files found or permission denied.
        </Text>
        <Text style={styles.subText}>
          Ensure files are on device and permissions are granted.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.scene}>
      <FlatList
        data={musicFiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

// *** Playlists Screen ***
const PlaylistsRoute = ({ styles }) => (
  <View style={styles.centerScene}>
    <Ionicons name="folder-open" size={100} color={styles.accentColor.color} />
    <Text style={styles.infoText}>
      <Text style={{ fontWeight: "bold" }}>Playlists</Text> feature is coming soon!
      {"\n"}
      This is where your custom song lists will be stored.
    </Text>
  </View>
);

// *** Favorites Screen ***
const FavoritesRoute = ({ styles }) => (
  <View style={styles.centerScene}>
    <Ionicons name="heart" size={100} color={COLORS.dark.danger} />
    <Text style={styles.infoText}>
      <Text style={{ fontWeight: "bold" }}>Favorites</Text> feature is coming soon!
      {"\n"}
      Your loved songs will appear here. (Requires AsyncStorage)
    </Text>
  </View>
);

// *** Settings Screen (NEW) ***
const SettingsRoute = ({ styles, colorScheme, toggleTheme }) => (
    <ScrollView style={styles.scene} contentContainerStyle={styles.settingsContainer}>
        <View style={styles.settingItem}>
            <View>
                <Text style={styles.settingText}>Dark Mode / Light Mode</Text>
                <Text style={styles.settingSubText}>Current: {colorScheme === 'dark' ? 'Dark' : 'Light'}</Text>
            </View>
            <Switch
                trackColor={{ false: styles.textSubtle.color, true: styles.accentColor.color }}
                thumbColor={styles.text.color}
                ios_backgroundColor={styles.textSubtle.color}
                onValueChange={toggleTheme}
                value={colorScheme === 'dark'}
            />
        </View>

        <View style={styles.settingItem}>
            <View>
                <Text style={styles.settingText}>Privacy Policy</Text>
                <Text style={styles.settingSubText}>Review how your data is handled.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={styles.textSubtle.color} />
        </View>

        <View style={styles.settingItem}>
            <View>
                <Text style={styles.settingText}>Terms & Conditions</Text>
                <Text style={styles.settingSubText}>The rules for using this app.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={styles.textSubtle.color} />
        </View>

        <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View>
                <Text style={styles.settingText}>Contact Us</Text>
                <Text style={styles.settingSubText}>Report a bug or ask a question.</Text>
            </View>
            <Ionicons name="mail-outline" size={24} color={styles.textSubtle.color} />
        </View>
        
    </ScrollView>
);

/* --------------------------
   APP (Handles Permissions & Logic)
--------------------------- */
export default function App() {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const [status, setStatus] = useState<Audio.PlaybackStatus | null>(null);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);

  // --- THEME STATE ---
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const styles = useMemo(() => getThemedStyles(colorScheme), [colorScheme]);
  const isDark = colorScheme === "dark";

  const toggleTheme = () => {
    const newTheme = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(newTheme);
    mockAsyncStorage.saveTheme(newTheme);
  };

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "all", title: "All Songs", icon: "musical-notes" },
    { key: "playlists", title: "Playlists", icon: "list-circle" },
    { key: "favorites", title: "Favorites", icon: "heart" },
    { key: "settings", title: "Settings", icon: "settings" }, // NEW ROUTE
  ]);

  /* --------------------
      PERMISSIONS & LOADING
  --------------------- */
  
  const getMusicFiles = async () => {
    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.audio],
        limit: 100,
      });
      
      const files: MusicFile[] = media.assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        uri: asset.uri,
        duration: asset.duration,
      }));
      
      setMusicFiles(files);
      if (files.length === 0) {
        Alert.alert("No Files Found", "Make sure you have audio files saved on your device.");
      }
    } catch (error) {
      console.error("Error fetching media library:", error);
    }
  };

  const requestPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      getMusicFiles();
    } else {
      setPermissionGranted(false);
      Alert.alert("Permission Denied", "Cannot access local music files without storage permission.");
    }
  };

  /* --------------------
      AUDIO LOGIC
  --------------------- */

  const onPlaybackStatusUpdate = (st: Audio.PlaybackStatus) => {
    setStatus(st);
    if (!st.isLoaded) return;

    setPositionMillis(st.positionMillis);
    setDurationMillis(st.durationMillis || 1);

    if (st.didJustFinish) playNextTrack();
  };

  const playTrack = async (uri: string, index: number) => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to play song. Check file access permissions/URI.");
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

  const playNextTrack = () => {
    if (musicFiles.length === 0) return;
    const next = (currentTrackIndex + 1) % musicFiles.length;
    playTrack(musicFiles[next].uri, next);
  };

  const playPreviousTrack = () => {
    if (musicFiles.length === 0) return;
    const prev = (currentTrackIndex - 1 + musicFiles.length) % musicFiles.length;
    playTrack(musicFiles[prev].uri, prev);
  };

  const onSeek = (value: number) => {
    if (sound && status?.isLoaded) {
      // value is 0 to 1, scale it to duration
      sound.setPositionAsync(Math.floor(value * durationMillis));
    }
  };

  /* --------------------
      EFFECTS
  --------------------- */

  useEffect(() => {
    const loadInitialData = async () => {
        // Load theme from storage
        const savedTheme = await mockAsyncStorage.getTheme();
        if (savedTheme === 'light' || savedTheme === 'dark') {
            setColorScheme(savedTheme);
        }
        
        // Request permissions and load files
        requestPermission();
    }
    
    loadInitialData();

    return () => {
      sound?.unloadAsync();
    };
  }, []);

  /* --------------------
      SCENES
  --------------------- */
  const renderScene = SceneMap({
    all: () => (
      <AllSongsRoute
        musicFiles={musicFiles}
        currentTrackIndex={currentTrackIndex}
        isPlaying={isPlaying}
        playTrack={playTrack}
        togglePlayPause={togglePlayPause}
        styles={styles}
      />
    ),
    playlists: () => <PlaylistsRoute styles={styles} />,
    favorites: () => <FavoritesRoute styles={styles} />,
    settings: () => <SettingsRoute styles={styles} colorScheme={colorScheme} toggleTheme={toggleTheme} />,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      renderLabel={({ route, focused }) => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={focused ? route.icon : route.icon + "-outline"}
            size={18}
            color={focused ? styles.accentColor.color : styles.textMuted.color}
          />
          <Text
            style={{
              marginLeft: 6,
              color: focused ? styles.accentColor.color : styles.textMuted.color,
              fontWeight: "600",
            }}
          >
            {route.title}
          </Text>
        </View>
      )}
    />
  );

  /* --------------------
      RENDER
  --------------------- */

  if (!permissionGranted) {
    return <PermissionScreen styles={styles} requestPermission={requestPermission} />;
  }

  const currentTrack = musicFiles[currentTrackIndex];
  
  return (
    <View style={styles.container}>
      {/* Use auto for dark/light mode status bar text */}
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={isDark ? "#121212" : "#f0f2f5"} /> 
      <Text style={styles.header}>🎧 Elite Player</Text>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        initialLayout={initialLayout}
      />

      {/* Mini Player */}
      {currentTrack ? (
        <View style={styles.miniPlayer}>
          <Text style={styles.playerBarTitle} numberOfLines={1}>
            {currentTrack.filename}
          </Text>

          {/* PROGRESS */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatDuration(positionMillis)}</Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              value={positionMillis / durationMillis}
              onSlidingComplete={onSeek}
              minimumTrackTintColor={styles.accentColor.color}
              maximumTrackTintColor={isDark ? "#444" : "#ccc"}
              thumbTintColor={styles.accentColor.color}
              style={{ flex: 1, marginHorizontal: 8 }}
            />
            <Text style={styles.timeText}>{formatDuration(durationMillis)}</Text>
          </View>

          {/* CONTROLS */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={playPreviousTrack}>
              <Ionicons name="play-skip-back" size={28} color={styles.accentColor.color} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color={isDark ? "#fff" : styles.background.color} // Always white on dark button
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playNextTrack}>
              <Ionicons name="play-skip-forward" size={28} color={styles.accentColor.color} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noTrackBar}>
          <Text style={styles.noTrackText}>🎶 Tap a track to start listening</Text>
        </View>
      )}
    </View>
  );
}