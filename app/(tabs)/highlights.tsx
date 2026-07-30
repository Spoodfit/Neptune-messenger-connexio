import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { env } from "@/config/env";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const POSTS = [
  {
    id: "lea",
    name: "Léa Despoulins",
    initials: "LD",
    meta: "Carcassonne · il y a 12 min",
    title: "Première session studio validée",
    body: "Une nouvelle étape pour Neptune Média. Les coulisses arrivent très vite.",
    kind: "Réussite",
    wide: true
  },
  {
    id: "oceane",
    name: "Océane",
    initials: "OC",
    meta: "Carcassonne · il y a 28 min",
    title: "Afterwork en préparation",
    body: "Les derniers détails sont en place.",
    kind: "Coulisses",
    wide: false
  },
  {
    id: "nabiha",
    name: "Nabiha",
    initials: "NA",
    meta: "Toulouse · il y a 41 min",
    title: "Deux mises en relation concrètes",
    body: "Le réseau produit déjà des opportunités.",
    kind: "Réussite",
    wide: false
  },
  {
    id: "christelle",
    name: "Christelle",
    initials: "CH",
    meta: "Montpellier · il y a 1 h",
    title: "Coulisses de demain",
    body: "Préparation du prochain rendez-vous du club.",
    kind: "Vidéo",
    wide: false
  },
  {
    id: "johan",
    name: "Johan Zambelli",
    initials: "JZ",
    meta: "Carcassonne · il y a 2 h",
    title: "Construire une messagerie qui change vraiment les usages",
    body: "Le défi n’est pas d’ajouter des boutons. Il faut rendre chaque interaction plus fluide, plus claire et plus humaine.",
    kind: "Défi",
    wide: true
  }
] as const;

const MAP_MEMBERS = [
  { id: "oceane", initials: "OC", city: "Toulouse", left: "20%", top: "20%" },
  { id: "lea", initials: "LD", city: "Carcassonne", left: "38%", top: "52%" },
  { id: "nabiha", initials: "NA", city: "Narbonne", left: "57%", top: "67%" },
  { id: "christelle", initials: "CH", city: "Montpellier", left: "76%", top: "35%" }
] as const;

type HighlightMode = "feed" | "map";

export default function HighlightsScreen() {
  const [mode, setMode] = useState<HighlightMode>("feed");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  }, [mode, transition]);

  const contentStyle = {
    opacity: transition,
    transform: [
      {
        translateY: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0]
        })
      }
    ]
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Temps forts" subtitle="Le quotidien professionnel du réseau Neptune." />

      <View style={styles.modeBar} accessibilityRole="tablist">
        {(["feed", "map"] as const).map((item) => {
          const active = mode === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item === "feed" ? "Afficher le feed" : "Afficher la carte"}
              onPress={() => setMode(item)}
              style={styles.modeButton}
            >
              {active ? (
                <LinearGradient
                  colors={gradients.activeTab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Ionicons
                name={item === "feed" ? "sparkles-outline" : "map-outline"}
                size={16}
                color={active ? colors.text : colors.textMuted}
              />
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                {item === "feed" ? "Feed" : "Map"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!env.mockMode ? (
        <View style={styles.unavailableWrap}>
          <LinearGradient colors={gradients.glass} style={styles.unavailable}>
            <Ionicons name="sparkles-outline" size={28} color={colors.violet} />
            <Text style={styles.unavailableTitle}>Temps forts à connecter</Text>
            <Text style={styles.unavailableText}>
              Le design est prêt. Les publications, commentaires et positions devront provenir du backend Neptune avant le pilote.
            </Text>
          </LinearGradient>
        </View>
      ) : mode === "feed" ? (
        <Animated.View style={[styles.flex, contentStyle]}>
          <ScrollView
            contentContainerStyle={styles.feed}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.feedGrid}>
              {POSTS.map((post) => (
                <LinearGradient
                  key={post.id}
                  colors={gradients.glass}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={[styles.post, post.wide ? styles.postWide : styles.postHalf]}
                >
                  <View style={styles.postHead}>
                    <LinearGradient
                      colors={gradients.primaryWarm}
                      style={styles.postAvatarShell}
                    >
                      <View style={styles.postAvatar}>
                        <Text style={styles.postAvatarText}>{post.initials}</Text>
                      </View>
                    </LinearGradient>
                    <View style={styles.postMetaWrap}>
                      <Text style={styles.postName} numberOfLines={1}>{post.name}</Text>
                      <Text style={styles.postMeta} numberOfLines={1}>{post.meta}</Text>
                    </View>
                  </View>
                  <View style={styles.kindChip}>
                    <Text style={styles.kindText}>{post.kind}</Text>
                  </View>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postBody} numberOfLines={post.wide ? 4 : 5}>
                    {post.body}
                  </Text>
                  <View style={styles.postActions}>
                    <View style={styles.metric}>
                      <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.metricText}>18</Text>
                    </View>
                    <View style={styles.metric}>
                      <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.metricText}>6</Text>
                    </View>
                    <Ionicons name="paper-plane-outline" size={15} color={colors.textMuted} />
                  </View>
                </LinearGradient>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.mapWrap, contentStyle]}>
          <LinearGradient
            colors={["#071A38", "#061027", "#040A18"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.map}
          >
            <View style={[styles.route, styles.routeOne]} />
            <View style={[styles.route, styles.routeTwo]} />
            <View style={[styles.route, styles.routeThree]} />
            <Text style={[styles.cityGhost, { left: "13%", top: "13%" }]}>TOULOUSE</Text>
            <Text style={[styles.cityGhost, { left: "30%", top: "46%" }]}>CARCASSONNE</Text>
            <Text style={[styles.cityGhost, { left: "52%", top: "78%" }]}>NARBONNE</Text>
            <Text style={[styles.cityGhost, { left: "67%", top: "27%" }]}>MONTPELLIER</Text>

            {MAP_MEMBERS.map((member) => {
              const selected = selectedMember === member.id;
              return (
                <Pressable
                  key={member.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir les temps forts de ${member.city}`}
                  onPress={() => setSelectedMember(selected ? null : member.id)}
                  style={[
                    styles.mapMarkerTouch,
                    { left: member.left, top: member.top }
                  ]}
                >
                  <View style={[styles.mapPulse, selected && styles.mapPulseSelected]} />
                  <LinearGradient
                    colors={gradients.primaryWarm}
                    style={[styles.mapMarker, selected && styles.mapMarkerSelected]}
                  >
                    <View style={styles.mapMarkerInner}>
                      <Text style={styles.mapMarkerText}>{member.initials}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}

            {selectedMember ? (
              <LinearGradient colors={gradients.glass} style={styles.mapStory}>
                <Text style={styles.mapStoryEyebrow}>PUBLICATION RÉCENTE</Text>
                <Text style={styles.mapStoryTitle}>
                  {POSTS.find((post) => post.id === selectedMember)?.title ?? "Temps fort Neptune"}
                </Text>
                <Text style={styles.mapStoryText} numberOfLines={3}>
                  Touchez la photo du membre pour ouvrir son profil ou démarrer une conversation.
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.mapHint}>
                <Text style={styles.mapHintText}>Touchez un membre actif</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  modeBar: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 7
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.glass,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  modeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  modeLabelActive: { color: colors.text },
  feed: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingBottom: 24
  },
  feedGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 9
  },
  post: {
    minWidth: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 11,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  postWide: { width: "100%" },
  postHalf: { width: "48.5%", minHeight: 210 },
  postHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  postAvatarShell: { width: 34, height: 34, padding: 2, borderRadius: 11 },
  postAvatar: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  postAvatarText: { color: colors.text, fontSize: 9, fontWeight: "900" },
  postMetaWrap: { flex: 1, minWidth: 0 },
  postName: { color: colors.text, fontSize: 11, lineHeight: 14, fontWeight: "900" },
  postMeta: { color: colors.textMuted, fontSize: 8.5, lineHeight: 12, marginTop: 1 },
  kindChip: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(244,177,131,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.22)"
  },
  kindText: { color: colors.orange, fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  postTitle: { color: colors.text, fontSize: 15, lineHeight: 18, fontWeight: "900", marginTop: 9 },
  postBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 6 },
  postActions: {
    marginTop: 12,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  metric: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricText: { color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  unavailableWrap: { flex: 1, padding: spacing.md, alignItems: "center", justifyContent: "center" },
  unavailable: {
    width: "100%",
    maxWidth: 430,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    gap: spacing.sm
  },
  unavailableTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  unavailableText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center" },
  mapWrap: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingBottom: 12
  },
  map: {
    flex: 1,
    minHeight: 410,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative"
  },
  route: {
    position: "absolute",
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(24,168,255,0.20)"
  },
  routeOne: { width: "70%", left: "8%", top: "42%", transform: [{ rotate: "18deg" }] },
  routeTwo: { width: "50%", left: "34%", top: "59%", transform: [{ rotate: "-27deg" }] },
  routeThree: { width: "48%", left: "23%", top: "35%", transform: [{ rotate: "72deg" }] },
  cityGhost: { position: "absolute", color: "rgba(210,219,239,0.28)", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  mapMarkerTouch: { position: "absolute", width: 58, height: 58, marginLeft: -29, marginTop: -29, alignItems: "center", justifyContent: "center" },
  mapPulse: { position: "absolute", width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: "rgba(24,168,255,0.30)" },
  mapPulseSelected: { width: 62, height: 62, borderRadius: 31, borderColor: "rgba(160,68,200,0.50)" },
  mapMarker: { width: 44, height: 44, padding: 2, borderRadius: 22 },
  mapMarkerSelected: { transform: [{ scale: 1.08 }] },
  mapMarkerInner: { flex: 1, borderRadius: 20, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  mapMarkerText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  mapHint: { position: "absolute", alignSelf: "center", bottom: 16, left: 0, right: 0, alignItems: "center" },
  mapHintText: { color: colors.textMuted, fontSize: 10, fontWeight: "800", backgroundColor: "rgba(2,7,19,0.78)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  mapStory: { position: "absolute", left: 12, right: 12, bottom: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  mapStoryEyebrow: { color: colors.orange, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  mapStoryTitle: { color: colors.text, fontSize: 15, lineHeight: 18, fontWeight: "900", marginTop: 5 },
  mapStoryText: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15, marginTop: 5 }
});
