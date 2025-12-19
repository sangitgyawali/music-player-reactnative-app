import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Switch,
  SafeAreaView,
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import { Audio } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

/* --------------------------
   TYPES & MOCK DATA
--------------------------- */
type MusicFile = { id: string; filename: string; artist: string; uri: string; duration: number };
type ColorScheme = "dark" | "light";

const MOCK_MUSIC: MusicFile[] = [
  { id: "1", filename: "Midnight City", artist: "Synthwave Pro", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: 360 },
  { id: "2", filename: "Ocean Breeze", artist: "Lo-Fi Girl", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: 300 },
  { id: "3", filename: "Neon Dreams", artist: "Retro Kid", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration: 420 },
];

const { width } = Dimensions.get("window");

/* --------------------------
   STYLES & THEME
--------------------------- */
const COLORS = {
  dark: { bg: "#09090B", surface: "#18181B", accent: "#8B5CF6", text: "#FAFAFA", muted: "#A1A1AA", border: "#27272A" },
  light: { bg: "#F4F4F5", surface: "#FFFFFF", accent: "#7C3AED", text: "#18181B", muted: "#71717A", border: "#E4E4E7" },
};

const getStyles = (theme: ColorScheme) => {
  const c = COLORS[theme];
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    headerText: { fontSize: 28, fontWeight: "800", color: c.text, letterSpacing: -0.5 },
    
    tabBar: { backgroundColor: c.bg, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: c.border },
    indicator: { backgroundColor: c.accent, height: 3, borderRadius: 3 },
    label: { fontWeight: "700", textTransform: "capitalize", fontSize: 14 },

    trackCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      marginHorizontal: 16,
      marginVertical: 6,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    activeTrack: { borderColor: c.accent, backgroundColor: theme === 'dark' ? "#1E1B4B" : "#F5F3FF" },
    albumArt: { width: 48, height: 48, borderRadius: 12, backgroundColor: c.accent + "20", justifyContent: "center", alignItems: "center" },
    info: { marginLeft: 15, flex: 1 },
    title: { color: c.text, fontSize: 16, fontWeight: "700" },
    artist: { color: c.muted, fontSize: 13, marginTop: 2 },

    miniPlayer: {
      position: "absolute",
      bottom: 20,
      left: 10,
      right: 10,
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    slider: { width: "105%", height: 20, alignSelf: 'center' },
    controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
    playBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.accent, justifyContent: "center", alignItems: "center" },
    
    settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '90%', padding: 20, backgroundColor: c.surface, borderRadius: 15, marginTop: 20 },
  });
};

/* --------------------------
   COMPONENT
--------------------------- */
export default function App() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(1);
  const [theme, setTheme] = useState<ColorScheme>("dark");

  const styles = useMemo(() => getStyles(theme), [theme]);
  const activeColor = COLORS[theme].accent;

  const play = async (index: number) => {
    if (sound) await sound.unloadAsync();
    const { sound: s } = await Audio.Sound.createAsync(
      { uri: MOCK_MUSIC[index].uri },
      { shouldPlay: true },
      (st) => { if (st.isLoaded) { setPos(st.positionMillis); setDur(st.durationMillis || 1); } }
    );
    setSound(s);
    setCurrent(index);
    setPlaying(true);
  };

  const toggle = async () => {
    if (!sound) return;
    playing ? await sound.pauseAsync() : await sound.playAsync();
    setPlaying(!playing);
  };

  const skip = (dir: number) => {
    const nextIdx = (current + dir + MOCK_MUSIC.length) % MOCK_MUSIC.length;
    play(nextIdx);
  };

  const [tabIndex, setTabIndex] = useState(0);
  const routes = [{ key: "all", title: "Library" }, { key: "settings", title: "Settings" }];

  const renderScene = SceneMap({
    all: () => (
      <FlatList
        data={MOCK_MUSIC}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 150 }}
        renderItem={({ item, index }) => {
          const isActive = current === index;
          return (
            <TouchableOpacity 
              style={[styles.trackCard, isActive && styles.activeTrack]} 
              onPress={() => play(index)}
              activeOpacity={0.7}
            >
              <View style={styles.albumArt}>
                <Ionicons name={isActive && playing ? "stats-chart" : "musical-notes"} size={24} color={activeColor} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.title, isActive && { color: activeColor }]}>{item.filename}</Text>
                <Text style={styles.artist}>{item.artist}</Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={20} color={COLORS[theme].muted} />
            </TouchableOpacity>
          );
        }}
      />
    ),
    settings: () => (
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 30 }}>
        <View style={styles.settingsRow}>
          <Text style={styles.title}>Dark Mode</Text>
          <Switch 
            value={theme === "dark"} 
            onValueChange={() => setTheme(theme === "dark" ? "light" : "dark")}
            trackColor={{ false: "#767577", true: activeColor }}
          />
        </View>
      </View>
    ),
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <Text style={styles.headerText}>Player</Text>
      </View>

      <TabView
        navigationState={{ index: tabIndex, routes }}
        onIndexChange={setTabIndex}
        initialLayout={{ width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.indicator}
            labelStyle={[styles.label, { color: COLORS[theme].text }]}
            activeColor={activeColor}
            inactiveColor={COLORS[theme].muted}
          />
        )}
        renderScene={renderScene}
      />

      {current !== -1 && (
        <View style={styles.miniPlayer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={styles.info}>
               <Text style={styles.title} numberOfLines={1}>{MOCK_MUSIC[current].filename}</Text>
               <Text style={styles.artist}>{MOCK_MUSIC[current].artist}</Text>
            </View>
            <TouchableOpacity style={styles.playBtn} onPress={toggle}>
              <Ionicons name={playing ? "pause" : "play"} size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={pos / dur}
            minimumTrackTintColor={activeColor}
            maximumTrackTintColor={COLORS[theme].border}
            thumbTintColor={activeColor}
            onSlidingComplete={(v) => sound?.setPositionAsync(v * dur)}
          />
          
          <View style={styles.controls}>
             <TouchableOpacity onPress={() => skip(-1)}>
               <Ionicons name="play-back" size={24} color={COLORS[theme].text} />
             </TouchableOpacity>
             <Text style={styles.artist}>{Math.floor(pos/60000)}:{(Math.floor(pos/1000)%60).toString().padStart(2,'0')}</Text>
             <TouchableOpacity onPress={() => skip(1)}>
               <Ionicons name="play-forward" size={24} color={COLORS[theme].text} />
             </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}