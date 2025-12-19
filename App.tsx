import { StatusBar } from "expo-status-bar";
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  Dimensions, Switch, SafeAreaView, Alert, Linking, ScrollView
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import { Audio } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

const { width } = Dimensions.get("window");

/* --------------------------
   THEME DEFINITIONS
--------------------------- */
const THEMES = {
  dark: { bg: "#0F0F12", header: "#4A1D65", card: "#1C1C21", accent: "#A855F7", text: "#FFFFFF", muted: "#A1A1AA", border: "#2C2C32" },
  light: { bg: "#F8F9FA", header: "#7C3AED", card: "#FFFFFF", accent: "#7C3AED", text: "#1A1A1A", muted: "#71717A", border: "#E4E4E7" },
};

export default function App() {
  const [musicFiles, setMusicFiles] = useState<MediaLibrary.Asset[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [tabIndex, setTabIndex] = useState(0);

  const colors = THEMES[themeMode];

  // 1. SCAN LOCAL STORAGE
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your files to play music.");
        return;
      }
      const media = await MediaLibrary.getAssetsAsync({ mediaType: "audio" });
      setMusicFiles(media.assets);
    })();
  }, []);

  // 2. AUDIO LOGIC
  const playTrack = async (index: number) => {
    if (index < 0 || index >= musicFiles.length) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: musicFiles[index].uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 1);
            if (status.didJustFinish) skip(1);
          }
        }
      );
      setSound(newSound);
      setCurrentIdx(index);
      setIsPlaying(true);
    } catch (e) {
      Alert.alert("Error", "Could not play this file.");
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    isPlaying ? await sound.pauseAsync() : await sound.playAsync();
    setIsPlaying(!isPlaying);
  };

  const skip = (dir: number) => {
    let next = currentIdx + dir;
    if (next < 0) next = musicFiles.length - 1;
    if (next >= musicFiles.length) next = 0;
    playTrack(next);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  /* --------------------------
     SCENES
  --------------------------- */
  const LibraryScene = () => (
    <FlatList
      data={musicFiles}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 15, paddingBottom: 220 }}
      ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.muted }]}>No music found on device.</Text>}
      renderItem={({ item, index }) => (
        <TouchableOpacity 
          style={[styles.trackRow, { backgroundColor: colors.card, borderColor: currentIdx === index ? colors.accent : colors.border }]} 
          onPress={() => playTrack(index)}
        >
          <View style={[styles.albumArt, { backgroundColor: colors.bg }]}>
            <Ionicons name="musical-notes" size={20} color={currentIdx === index ? colors.accent : colors.muted} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text numberOfLines={1} style={[styles.trackName, { color: colors.text }]}>{item.filename}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Local File • {formatTime(item.duration * 1000)}</Text>
          </View>
          {currentIdx === index && isPlaying && <Ionicons name="stats-chart" size={16} color={colors.accent} />}
        </TouchableOpacity>
      )}
    />
  );

  const SettingsScene = () => (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={[styles.sectionLabel, { color: colors.accent }]}>APPEARANCE</Text>
      <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Dark Mode</Text>
        <Switch 
          value={themeMode === "dark"} 
          onValueChange={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
          trackColor={{ true: colors.accent }}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.accent, marginTop: 30 }]}>ABOUT & LEGAL</Text>
      {[
        { label: "Privacy Policy", icon: "shield-checkmark-outline", url: "https://example.com/privacy" },
        { label: "Terms & Conditions", icon: "document-text-outline", url: "https://example.com/terms" },
        { label: "Contact Us", icon: "mail-outline", url: "mailto:support@eliteplayer.com" },
      ].map((item, i) => (
        <TouchableOpacity 
          key={i} 
          style={[styles.settingItem, { backgroundColor: colors.card, marginBottom: 8 }]}
          onPress={() => Linking.openURL(item.url)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={item.icon as any} size={20} color={colors.muted} style={{ marginRight: 15 }} />
            <Text style={{ color: colors.text, fontSize: 16 }}>{item.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      ))}
      <Text style={[styles.version, { color: colors.muted }]}>Elite Player v1.0.0 Pro</Text>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />
      <SafeAreaView style={{ backgroundColor: colors.header }}>
        <View style={styles.header}>
          <Ionicons name="headset" size={26} color="white" />
          <Text style={styles.headerTitle}>Elite Player</Text>
          <TouchableOpacity><Ionicons name="search" size={24} color="white" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <TabView
        navigationState={{ index: tabIndex, routes: [{ key: 'lib', title: 'Library' }, { key: 'set', title: 'Settings' }] }}
        onIndexChange={setTabIndex}
        initialLayout={{ width }}
        renderTabBar={p => (
          <TabBar {...p} 
            style={{ backgroundColor: colors.bg, elevation: 0 }} 
            indicatorStyle={{ backgroundColor: colors.accent, height: 3 }}
            labelStyle={{ fontWeight: '800', fontSize: 13 }}
            activeColor={colors.accent}
            inactiveColor={colors.muted}
          />
        )}
        renderScene={SceneMap({ lib: LibraryScene, set: SettingsScene })}
      />

      {/* PRO PLAYER CONSOLE */}
      {currentIdx !== -1 && (
        <View style={[styles.console, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.consoleInfo}>
            <View style={[styles.albumLarge, { backgroundColor: colors.bg }]} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text numberOfLines={1} style={[styles.consoleTitle, { color: colors.text }]}>{musicFiles[currentIdx].filename}</Text>
              <Text style={{ color: colors.muted }}>Now Playing</Text>
            </View>
          </View>

          <Slider
            style={{ width: '105%', height: 30, alignSelf: 'center' }}
            minimumValue={0}
            maximumValue={1}
            value={position / duration}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
            onSlidingComplete={val => sound?.setPositionAsync(val * duration)}
          />
          <View style={styles.timeRow}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(position)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity><Ionicons name="shuffle" size={22} color={colors.muted} /></TouchableOpacity>
            <TouchableOpacity onPress={() => skip(-1)}><Ionicons name="play-skip-back" size={30} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: colors.accent }]} onPress={togglePlayback}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skip(1)}><Ionicons name="play-skip-forward" size={30} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity><Ionicons name="repeat" size={22} color={colors.muted} /></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  trackRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 15, marginBottom: 10, borderWidth: 1 },
  albumArt: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trackName: { fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
  console: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, elevation: 20 },
  consoleInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  albumLarge: { width: 50, height: 50, borderRadius: 12 },
  consoleTitle: { fontSize: 16, fontWeight: '800' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  playBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16 },
  version: { textAlign: 'center', marginTop: 40, fontSize: 12 }
});