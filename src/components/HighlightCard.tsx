import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii, spacing, typography } from "../theme";
import type { HighlightPost, QuickReaction } from "../types/experience";

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
  const [reactionOpen, setReactionOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const totalReactions = post.reactions.reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );

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
          onPress={() => router.push(`/profile/${encodeURIComponent(post.author.id)}`)}
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
              {post.author.company} · {new Date(post.createdAt).toLocaleDateString("fr-FR", {
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
          onPress={() =>
            Alert.alert(
              "Publication",
              "Les actions masquer, signaler et modérer seront branchées aux règles Neptune."
            )
          }
          style={styles.moreButton}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            post.media.kind === "video" ? "Lire la vidéo" : "Ouvrir la photo"
          }
          onPress={() =>
            Alert.alert(
              post.media?.kind === "video" ? "Vidéo courte" : "Photo",
              "Le lecteur, le cache média et le CDN privé seront branchés sur ce composant."
            )
          }
          style={styles.media}
        >
          <LinearGradient
            colors={
              post.media.kind === "video"
                ? ["#063C72", "#1859D9", "#9145ED"]
                : ["#24345C", "#734EE3", "#FF7E75"]
            }
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name={post.media.kind === "video" ? "play-circle" : "image"}
            size={44}
            color={colors.white}
          />
          {post.media.durationSeconds ? (
            <View style={styles.duration}>
              <Text style={styles.durationText}>
                0:{String(post.media.durationSeconds).padStart(2, "0")}
              </Text>
            </View>
          ) : null}
        </Pressable>
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
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <Text style={styles.actionText}>Commenter</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager la publication"
          onPress={() =>
            Alert.alert(
              "Partager",
              "Le partage interne, le lien public sécurisé et la feuille de partage native seront branchés ici."
            )
          }
          style={styles.action}
        >
          <Ionicons name="paper-plane-outline" size={17} color={colors.textMuted} />
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
  authorPressable: { flex: 1, minWidth: 0, minHeight: 46, flexDirection: "row", alignItems: "center", gap: 9 },
  avatarShell: { width: 42, height: 42, borderRadius: 14, padding: 2 },
  avatarInner: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.surface, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  authorContent: { flex: 1, minWidth: 0 },
  authorName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 8.5, marginTop: 2 },
  moreButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  kindRow: { marginTop: 10, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  kindBadge: { minHeight: 25, paddingHorizontal: 8, borderRadius: 13, backgroundColor: "rgba(244,177,131,0.12)", borderWidth: 1, borderColor: "rgba(244,177,131,0.24)", alignItems: "center", justifyContent: "center" },
  needBadge: { backgroundColor: "rgba(255,123,134,0.13)", borderColor: "rgba(255,123,134,0.35)" },
  kindText: { color: colors.orange, fontSize: 8.5, fontWeight: "900" },
  needText: { color: colors.danger },
  syncBadge: { minHeight: 25, paddingHorizontal: 8, borderRadius: 13, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "center", gap: 4 },
  syncText: { color: colors.success, fontSize: 8.5, fontWeight: "900" },
  media: { height: 180, marginTop: 10, borderRadius: 17, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  duration: { position: "absolute", right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: "rgba(2,7,19,0.78)" },
  durationText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  body: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 19, marginTop: 10 },
  metrics: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricText: { color: colors.textMuted, fontSize: 9.5, fontWeight: "700" },
  reactionPicker: { marginTop: 10, minHeight: 52, paddingHorizontal: 5, borderRadius: 26, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  reactionChoice: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  reactionEmoji: { fontSize: 23 },
  reactionSummary: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  reactionPill: { minHeight: 27, paddingHorizontal: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 4 },
  reactionPillActive: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  reactionPillEmoji: { fontSize: 12 },
  reactionPillCount: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  actions: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft, flexDirection: "row" },
  action: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }
});
