import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";

import { env } from "../config/env";
import { useSession } from "../providers/SessionProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { colors, gradients, typography } from "../theme";
import type { HighlightPost, QuickReaction } from "../types/experience";
import { ActionSheet, type ActionSheetOption } from "./ActionSheet";
import { HighlightMediaView } from "./HighlightMediaView";

interface HighlightCardProps {
  post: HighlightPost;
  compact?: boolean;
  onReact: (emoji: QuickReaction) => void;
}

const REACTIONS: QuickReaction[] = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];

const kindLabel: Record<HighlightPost["kind"], string> = {
  standard: "TEMPS FORT",
  besoin: "BESOIN",
  reussite: "RÉUSSITE",
  offre: "OFFRE"
};

export function HighlightCard({
  post,
  compact = false,
  onReact
}: HighlightCardProps) {
  const { accessToken } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [reactionOpen, setReactionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const totalReactions = post.reactions.reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );

  const sharePost = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = api
        ? await api.shareHighlight(post.id)
        : {
            url: Linking.createURL(`/highlight/${encodeURIComponent(post.id)}`),
            shareCount: post.shareCount + 1
          };
      await Share.share({
        title: `${post.author.name} sur Connexio`,
        message: `${post.body || "Temps fort Neptune"}\n${result.url}`,
        url: result.url
      });
    } catch (error) {
      Alert.alert(
        "Partage impossible",
        error instanceof Error
          ? error.message
          : "La publication n’a pas pu être partagée."
      );
    } finally {
      setSharing(false);
    }
  };

  const reportPost = async () => {
    if (!api) {
      Alert.alert(
        "Signalement enregistré",
        "Le mode démonstration a simulé la transmission à la modération."
      );
      return;
    }
    try {
      await api.reportContent(
        "highlight",
        post.id,
        "Contenu signalé depuis Connexio"
      );
      Alert.alert(
        "Signalement transmis",
        "La modération Neptune examinera cette publication."
      );
    } catch (error) {
      Alert.alert(
        "Signalement impossible",
        error instanceof Error ? error.message : "Réessayez ultérieurement."
      );
    }
  };

  const menuOptions: ActionSheetOption[] = [
    {
      id: "profile",
      label: `Voir le profil de ${post.author.name}`,
      icon: "person-outline",
      onPress: () =>
        router.push(`/profile/${encodeURIComponent(post.author.id)}`)
    },
    {
      id: "share",
      label: "Partager cette publication",
      icon: "paper-plane-outline",
      onPress: sharePost
    },
    {
      id: "report",
      label: "Signaler cette publication",
      icon: "flag-outline",
      destructive: true,
      onPress: reportPost
    }
  ];

  return (
    <LinearGradient
      colors={gradients.glass}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.card, compact && styles.compactCard]}
    >
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir le profil de ${post.author.name}`}
          onPress={() =>
            router.push(`/profile/${encodeURIComponent(post.author.id)}`)
          }
          style={styles.authorPressable}
        >
          <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
            <View style={styles.avatarInner}>
              {post.author.avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: post.author.avatarUrl }}
                  onError={() => setAvatarFailed(true)}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.initials}>{post.author.initials}</Text>
              )}
            </View>
          </LinearGradient>
          <View style={styles.authorContent}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {post.author.company} ·{" "}
              {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Options de la publication"
          onPress={() => setMenuOpen(true)}
          style={styles.moreButton}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.kindRow}>
        <View
          style={[
            styles.kindBadge,
            post.kind === "besoin" && styles.needBadge,
            post.kind === "offre" && styles.offerBadge
          ]}
        >
          <Text
            style={[
              styles.kindText,
              post.kind === "besoin" && styles.needText,
              post.kind === "offre" && styles.offerText
            ]}
          >
            {kindLabel[post.kind]}
          </Text>
        </View>
        {post.syncedWithBusinessApp ? (
          <View style={styles.syncBadge}>
            <Ionicons name="sync" size={12} color={colors.success} />
            {!compact ? (
              <Text style={styles.syncText}>
                {post.kind === "offre" ? "Comité Avantage" : "Neptune Business"}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {post.media ? (
        <View style={styles.mediaWrap}>
          <HighlightMediaView media={post.media} compact={compact} />
          {post.media.durationSeconds ? (
            <View style={styles.duration}>
              <Text style={styles.durationText}>
                {Math.floor(post.media.durationSeconds / 60)}:
                {String(Math.floor(post.media.durationSeconds % 60)).padStart(
                  2,
                  "0"
                )}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.body, compact && styles.compactBody]} numberOfLines={compact ? 4 : undefined}>
        {post.body}
      </Text>

      {post.coordinates ? (
        <View style={styles.locationLine}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {post.locationLabel ?? "Position approximative"}
          </Text>
        </View>
      ) : null}

      <View style={styles.metrics}>
        <Text style={styles.metricText}>{totalReactions} réactions</Text>
        <Text style={styles.metricText}>{post.comments.length} commentaires</Text>
        {!compact ? <Text style={styles.metricText}>{post.shareCount} partages</Text> : null}
      </View>

      {reactionOpen ? (
        <View style={styles.reactionPicker}>
          {REACTIONS.map((emoji) => {
            const active = post.reactions.some(
              (reaction) =>
                reaction.emoji === emoji && reaction.reactedByCurrentUser
            );
            return (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Réagir avec ${emoji}`}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onReact(emoji);
                  setReactionOpen(false);
                }}
                style={styles.reactionChoiceTarget}
              >
                <View
                  style={[
                    styles.reactionChoiceVisual,
                    active && styles.reactionChoiceActive
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {post.reactions.length > 0 ? (
        <View style={styles.reactionSummary}>
          {post.reactions.map((reaction) => (
            <Pressable
              key={reaction.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.emoji}, ${reaction.count} réactions`}
              accessibilityState={{ selected: reaction.reactedByCurrentUser }}
              onPress={() => onReact(reaction.emoji)}
              style={styles.reactionTarget}
            >
              <View
                style={[
                  styles.reactionVisual,
                  reaction.reactedByCurrentUser && styles.reactionActive
                ]}
              >
                <Text style={styles.reactionPillEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionPillCount}>{reaction.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réagir à la publication"
          onPress={() => setReactionOpen((value) => !value)}
          style={styles.action}
        >
          <Ionicons name="happy-outline" size={19} color={colors.textMuted} />
          {!compact ? <Text style={styles.actionText}>Réagir</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Commenter la publication"
          onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)}
          style={styles.action}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textMuted}
          />
          {!compact ? <Text style={styles.actionText}>Commenter</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager la publication"
          accessibilityState={{ busy: sharing }}
          disabled={sharing}
          onPress={() => void sharePost()}
          style={styles.action}
        >
          <Ionicons
            name={sharing ? "hourglass-outline" : "paper-plane-outline"}
            size={18}
            color={colors.textMuted}
          />
          {!compact ? <Text style={styles.actionText}>Partager</Text> : null}
        </Pressable>
      </View>

      <ActionSheet
        visible={menuOpen}
        title="Options du Temps fort"
        subtitle={post.author.name}
        options={menuOptions}
        onClose={() => setMenuOpen(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  compactCard: { minHeight: 205, padding: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  authorPressable: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  avatarShell: { width: 42, height: 42, borderRadius: 14, padding: 2 },
  avatarInner: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  authorContent: { flex: 1, minWidth: 0 },
  authorName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 8.5, marginTop: 2 },
  moreButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  kindRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  kindBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(244,177,131,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.24)",
    alignItems: "center",
    justifyContent: "center"
  },
  needBadge: {
    backgroundColor: "rgba(255,123,134,0.13)",
    borderColor: "rgba(255,123,134,0.35)"
  },
  offerBadge: {
    backgroundColor: "rgba(66,211,146,0.12)",
    borderColor: "rgba(66,211,146,0.35)"
  },
  kindText: { color: colors.orange, fontSize: 8.5, fontWeight: "900" },
  needText: { color: colors.danger },
  offerText: { color: colors.success },
  syncBadge: {
    minHeight: 24,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: colors.successSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  syncText: { color: colors.success, fontSize: 8.5, fontWeight: "900" },
  mediaWrap: { marginTop: 9, position: "relative" },
  duration: {
    position: "absolute",
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(2,7,19,0.78)"
  },
  durationText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 9
  },
  compactBody: { fontSize: 11, lineHeight: 16 },
  locationLine: { minHeight: 26, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { flex: 1, color: colors.textMuted, fontSize: 8.5, fontWeight: "700" },
  metrics: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricText: { color: colors.textMuted, fontSize: 9, fontWeight: "700" },
  reactionPicker: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  reactionChoiceTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  reactionChoiceVisual: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reactionChoiceActive: { borderWidth: 1, borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  reactionEmoji: { fontSize: 21 },
  reactionSummary: { marginTop: 5, flexDirection: "row", flexWrap: "wrap", gap: 1 },
  reactionTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  reactionVisual: {
    minHeight: 27,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  reactionActive: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  reactionPillEmoji: { fontSize: 12 },
  reactionPillCount: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  actions: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: "row"
  },
  action: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  actionText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }
});
