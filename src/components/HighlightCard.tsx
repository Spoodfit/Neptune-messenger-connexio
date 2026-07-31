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
import { colors, gradients, radii, typography } from "../theme";
import type { HighlightPost, QuickReaction } from "../types/experience";
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

  const reportPost = () => {
    Alert.alert(
      "Signaler cette publication",
      "Le signalement sera transmis à la modération Neptune.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          style: "destructive",
          onPress: () => {
            if (!api) {
              Alert.alert("Signalement enregistré", "Mode démonstration.");
              return;
            }
            void api
              .reportContent(
                "highlight",
                post.id,
                "Contenu signalé depuis Connexio"
              )
              .then(() =>
                Alert.alert(
                  "Signalement transmis",
                  "La modération Neptune examinera cette publication."
                )
              )
              .catch((error: unknown) =>
                Alert.alert(
                  "Signalement impossible",
                  error instanceof Error
                    ? error.message
                    : "Réessayez ultérieurement."
                )
              );
          }
        }
      ]
    );
  };

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
          onPress={reportPost}
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
            post.kind === "besoin" && styles.needBadge
          ]}
        >
          <Text
            style={[
              styles.kindText,
              post.kind === "besoin" && styles.needText
            ]}
          >
            {kindLabel[post.kind]}
          </Text>
        </View>
        {post.syncedWithBusinessApp ? (
          <View style={styles.syncBadge}>
            <Ionicons name="sync" size={12} color={colors.success} />
            <Text style={styles.syncText}>Neptune Business</Text>
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

      <Text style={styles.body} numberOfLines={compact ? 5 : undefined}>
        {post.body}
      </Text>

      <View style={styles.metrics}>
        <Text style={styles.metricText}>{totalReactions} réactions</Text>
        <Text style={styles.metricText}>{post.comments.length} commentaires</Text>
        <Text style={styles.metricText}>{post.shareCount} partages</Text>
      </View>

      {reactionOpen ? (
        <View style={styles.reactionPicker}>
          {REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Réagir avec ${emoji}`}
              onPress={() => {
                onReact(emoji);
                setReactionOpen(false);
              }}
              style={styles.reactionChoice}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {post.reactions.length > 0 ? (
        <View style={styles.reactionSummary}>
          {post.reactions.map((reaction) => (
            <Pressable
              key={reaction.emoji}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.emoji}, ${reaction.count} réactions`}
              onPress={() => onReact(reaction.emoji)}
              style={[
                styles.reactionPill,
                reaction.reactedByCurrentUser && styles.reactionPillActive
              ]}
            >
              <Text style={styles.reactionPillEmoji}>{reaction.emoji}</Text>
              <Text style={styles.reactionPillCount}>{reaction.count}</Text>
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
          <Ionicons name="happy-outline" size={18} color={colors.textMuted} />
          <Text style={styles.actionText}>Réagir</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Commenter la publication"
          onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)}
          style={styles.action}
        >
          <Ionicons
            name="chatbubble-outline"
            size={17}
            color={colors.textMuted}
          />
          <Text style={styles.actionText}>Commenter</Text>
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
            size={17}
            color={colors.textMuted}
          />
          <Text style={styles.actionText}>Partager</Text>
        </Pressable>
      </View>
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
  compactCard: { minHeight: 205 },
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
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  kindBadge: {
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 13,
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
  kindText: { color: colors.orange, fontSize: 8.5, fontWeight: "900" },
  needText: { color: colors.danger },
  syncBadge: {
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.successSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  syncText: { color: colors.success, fontSize: 8.5, fontWeight: "900" },
  mediaWrap: { marginTop: 10, position: "relative" },
  duration: {
    position: "absolute",
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: "rgba(2,7,19,0.78)"
  },
  durationText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 10
  },
  metrics: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricText: { color: colors.textMuted, fontSize: 9.5, fontWeight: "700" },
  reactionPicker: {
    marginTop: 10,
    minHeight: 52,
    paddingHorizontal: 5,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  reactionChoice: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  reactionEmoji: { fontSize: 23 },
  reactionSummary: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  reactionPill: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  reactionPillActive: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  reactionPillEmoji: { fontSize: 12 },
  reactionPillCount: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  actions: {
    marginTop: 10,
    paddingTop: 8,
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
