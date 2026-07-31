import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { HighlightCard } from "@/components/HighlightCard";
import NeptuneMap from "@/components/NeptuneMap";
import { useExperience } from "@/providers/ExperienceProvider";
import { colors, gradients, spacing, typography } from "@/theme";

export default function HighlightsScreen() {
  const {
    posts,
    mapMoments,
    togglePostReaction,
    createPrivateConversation
  } = useExperience();
  const [mode, setMode] = useState<"feed" | "map">("feed");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const overlayProgress = useRef(new Animated.Value(0)).current;

  const selectedMoment = useMemo(
    () => mapMoments.find((moment) => moment.member.id === selectedMemberId),
    [mapMoments, selectedMemberId]
  );
  const selectedPosts = useMemo(
    () =>
      selectedMoment
        ? posts.filter((post) => selectedMoment.recentPostIds.includes(post.id))
        : [],
    [posts, selectedMoment]
  );

  useEffect(() => {
    Animated.spring(overlayProgress, {
      toValue: selectedMemberId ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.75
    }).start();
  }, [overlayProgress, selectedMemberId]);

  const contactSelectedMember = () => {
    if (!selectedMoment) return;
    const existing = createPrivateConversation({
      memberIds: [selectedMoment.member.id]
    });
    router.push(`/chat/${encodeURIComponent(existing.id)}`);
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader
        title="Temps forts"
        subtitle="Publications, besoins et proximité Neptune."
      />

      <View style={styles.toolbar}>
        <View style={styles.modeBar} accessibilityRole="tablist">
          {(["feed", "map"] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  item === "feed" ? "Afficher le Feed" : "Afficher la carte"
                }
                onPress={() => setMode(item)}
                style={styles.modeButton}
              >
                {active ? (
                  <LinearGradient
                    colors={gradients.activeTab}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Ionicons
                  name={item === "feed" ? "sparkles" : "map"}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publier un Temps fort"
          onPress={() => router.push("/new-highlight")}
          style={styles.createButton}
        >
          <LinearGradient colors={gradients.primary} style={styles.createGradient}>
            <Ionicons name="add" size={23} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </View>

      {mode === "feed" ? (
        <ScrollView
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.feedGrid}>
            {posts.map((post, index) => {
              const wide = post.kind === "besoin" || index % 4 === 0;
              return (
                <View key={post.id} style={wide ? styles.postWide : styles.postHalf}>
                  <HighlightCard
                    post={post}
                    compact={!wide}
                    onReact={(emoji) => togglePostReaction(post.id, emoji)}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.mapStage}>
          <NeptuneMap
            moments={mapMoments}
            selectedMemberId={selectedMemberId}
            onSelectMember={(memberId) =>
              setSelectedMemberId((current) =>
                current === memberId ? null : memberId
              )
            }
          />

          {selectedMoment ? (
            <Animated.View
              style={[
                styles.momentOverlay,
                {
                  opacity: overlayProgress,
                  transform: [
                    {
                      translateY: overlayProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={styles.memberSummary}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir le profil de ${selectedMoment.member.name}`}
                  onPress={() =>
                    router.push(
                      `/profile/${encodeURIComponent(selectedMoment.member.id)}`
                    )
                  }
                  style={styles.memberIdentity}
                >
                  <LinearGradient
                    colors={gradients.primaryWarm}
                    style={styles.memberAvatar}
                  >
                    <View style={styles.memberAvatarInner}>
                      <Text style={styles.memberInitials}>
                        {selectedMoment.member.initials}
                      </Text>
                    </View>
                  </LinearGradient>
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {selectedMoment.member.name}
                    </Text>
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {selectedMoment.member.company} · position approximative
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer les publications"
                  onPress={() => setSelectedMemberId(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.floatingMoments}>
                {selectedPosts.slice(0, 3).map((post, index) => (
                  <Pressable
                    key={post.id}
                    accessibilityRole="button"
                    accessibilityLabel="Ouvrir la publication"
                    onPress={() =>
                      router.push(`/highlight/${encodeURIComponent(post.id)}`)
                    }
                    style={[
                      styles.momentBubble,
                      {
                        marginLeft: index * 12,
                        marginRight: Math.max(0, 24 - index * 10)
                      }
                    ]}
                  >
                    <View style={styles.momentTop}>
                      <Text style={styles.momentKind}>
                        {post.kind.toLocaleUpperCase("fr")}
                      </Text>
                      <Text style={styles.momentDate}>
                        {new Date(post.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </Text>
                    </View>
                    <Text style={styles.momentBody} numberOfLines={3}>
                      {post.body}
                    </Text>
                    <View style={styles.momentStats}>
                      <Text style={styles.momentStat}>
                        {post.reactions.reduce(
                          (sum, reaction) => sum + reaction.count,
                          0
                        )} réactions
                      </Text>
                      <Text style={styles.momentStat}>
                        {post.comments.length} commentaires
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={styles.quickActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={contactSelectedMember}
                  style={styles.quickAction}
                >
                  <Ionicons name="chatbubble" size={19} color={colors.text} />
                  <Text style={styles.quickText}>Message</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Alert.alert(
                      "Appel audio",
                      "Le fournisseur d’appel sera branché sur cette action."
                    )
                  }
                  style={styles.quickAction}
                >
                  <Ionicons name="call" size={19} color={colors.text} />
                  <Text style={styles.quickText}>Appeler</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Alert.alert(
                      "Visio",
                      "La signalisation WebRTC sera branchée sur cette action."
                    )
                  }
                  style={styles.quickAction}
                >
                  <Ionicons name="videocam" size={20} color={colors.text} />
                  <Text style={styles.quickText}>Visio</Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.mapHint}>
              <Ionicons name="sparkles" size={16} color={colors.orange} />
              <Text style={styles.mapHintText}>
                Les contours pulsants indiquent une publication récente.
              </Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  modeBar: {
    flex: 1,
    height: 52,
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    overflow: "hidden"
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    overflow: "hidden",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  modeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" },
  modeLabelActive: { color: colors.text },
  createButton: { width: 44, height: 44, borderRadius: 15, overflow: "hidden" },
  createGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  feed: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingBottom: 24
  },
  feedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 9
  },
  postWide: { width: "100%" },
  postHalf: { width: "48.5%" },
  mapStage: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
    position: "relative"
  },
  mapHint: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 24,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(8,18,38,0.94)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  mapHintText: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  momentOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    maxHeight: "72%",
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(5,11,28,0.96)",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 }
  },
  memberSummary: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 7 },
  memberIdentity: { flex: 1, minWidth: 0, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9 },
  memberAvatar: { width: 43, height: 43, padding: 2, borderRadius: 15 },
  memberAvatarInner: { flex: 1, borderRadius: 13, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.surface, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { color: colors.text, fontSize: 13, fontWeight: "900" },
  memberMeta: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  floatingMoments: { gap: 7, paddingVertical: 6 },
  momentBubble: {
    padding: 11,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface
  },
  momentTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  momentKind: { color: colors.orange, fontSize: 8.5, fontWeight: "900" },
  momentDate: { color: colors.textMuted, fontSize: 8.5, fontWeight: "700" },
  momentBody: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 6 },
  momentStats: { flexDirection: "row", gap: 10, marginTop: 7 },
  momentStat: { color: colors.textMuted, fontSize: 8.5, fontWeight: "700" },
  quickActions: { marginTop: 5, flexDirection: "row", gap: 7 },
  quickAction: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  quickText: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" }
});
