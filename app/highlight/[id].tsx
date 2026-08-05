import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighlightCard } from "@/components/HighlightCard";
import { HighlightShareButton } from "@/components/HighlightShareButton";
import { useExperience } from "@/providers/ExperienceProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { HighlightComment, QuickReaction } from "@/types/experience";
import { StatusAvatar } from "@/components/StatusAvatar";

const REACTIONS: QuickReaction[] = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];

export default function HighlightDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const {
    posts,
    members,
    togglePostReaction,
    addComment,
    toggleCommentReaction
  } = useExperience();
  const post = posts.find((item) => item.id === id);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<HighlightComment | null>(null);
  const [reactionCommentId, setReactionCommentId] = useState<string | null>(null);

  const mentionQuery = useMemo(() => {
    const match = body.match(/(?:^|\s)@([^\s@]*)$/u);
    return match?.[1]?.toLocaleLowerCase("fr") ?? null;
  }, [body]);
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((member) =>
        [member.name, member.company]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(mentionQuery)
      )
      .slice(0, 4);
  }, [members, mentionQuery]);

  if (!post) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text style={styles.missingTitle}>Publication introuvable</Text>
        <Text style={styles.missingText}>
          Elle a été supprimée, masquée ou n’est plus accessible.
        </Text>
        <Pressable onPress={() => router.replace("/(tabs)/highlights")} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Retour aux Temps forts</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const insertMention = (name: string) => {
    setBody((current) => current.replace(/@[^\s@]*$/u, `@${name.split(" ")[0]} `));
  };

  const submitComment = () => {
    const cleanBody = body.trim();
    if (!cleanBody) return;
    const mentionedUserIds = members
      .filter((member) => {
        const text = cleanBody.toLocaleLowerCase("fr");
        const firstName = member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
        return firstName && text.includes(`@${firstName}`);
      })
      .map((member) => member.id);
    addComment(post.id, cleanBody, replyingTo?.id, mentionedUserIds);
    setBody("");
    setReplyingTo(null);
  };

  const renderComment = ({ item }: { item: HighlightComment }) => (
    <View
      style={[
        styles.comment,
        item.parentCommentId ? styles.replyComment : undefined
      ]}
    >
      <Pressable
        onPress={() => router.push(`/profile/${encodeURIComponent(item.author.id)}`)}
        style={styles.commentAvatarPressable}
      >
        <StatusAvatar user={item.author} size={38} accessible={false} />
      </Pressable>
      <View style={styles.commentContent}>
        <Pressable
          onPress={() => router.push(`/profile/${encodeURIComponent(item.author.id)}`)}
        >
          <Text style={styles.commentName}>{item.author.name}</Text>
        </Pressable>
        <Text style={styles.commentBody}>{item.body}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.commentDate}>
            {new Date(item.createdAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </Text>
          <Pressable onPress={() => setReplyingTo(item)} hitSlop={8}>
            <Text style={styles.commentActionText}>Répondre</Text>
          </Pressable>
          <Pressable onPress={() => setReactionCommentId(item.id)} hitSlop={8}>
            <Text style={styles.commentActionText}>Réagir</Text>
          </Pressable>
        </View>
        {reactionCommentId === item.id ? (
          <View style={styles.commentReactionPicker}>
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  toggleCommentReaction(post.id, item.id, emoji);
                  setReactionCommentId(null);
                }}
                style={styles.commentReactionChoice}
              >
                <Text style={styles.commentReactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {item.reactions.length > 0 ? (
          <View style={styles.commentReactionSummary}>
            {item.reactions.map((reaction) => (
              <Pressable
                key={reaction.emoji}
                onPress={() =>
                  toggleCommentReaction(post.id, item.id, reaction.emoji)
                }
                style={[
                  styles.commentReactionPill,
                  reaction.reactedByCurrentUser && styles.commentReactionPillActive
                ]}
              >
                <Text style={styles.smallEmoji}>{reaction.emoji}</Text>
                <Text style={styles.smallCount}>{reaction.count}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Publication
        </Text>
        <HighlightShareButton post={post} />
      </View>

      <FlatList
        data={post.comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right }
        ]}
        ListHeaderComponent={
          <View style={styles.postWrap}>
            <HighlightCard
              post={post}
              onReact={(emoji) => togglePostReaction(post.id, emoji)}
            />
            <Text style={styles.commentsTitle}>
              Commentaires · {post.comments.length}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Ionicons name="chatbubbles-outline" size={27} color={colors.textMuted} />
            <Text style={styles.emptyText}>Soyez le premier à commenter.</Text>
          </View>
        }
      />

      <View
        style={[
          styles.composerArea,
          {
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right,
            paddingBottom: Math.max(insets.bottom, spacing.sm)
          }
        ]}
      >
        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => insertMention(member.name)}
                style={styles.suggestionRow}
              >
                <StatusAvatar user={member} size={32} accessible={false} />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionName}>{member.name}</Text>
                  <Text style={styles.suggestionCompany} numberOfLines={1}>
                    {member.company}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {replyingTo ? (
          <View style={styles.replyingBar}>
            <View style={styles.replyAccent} />
            <View style={styles.replyingContent}>
              <Text style={styles.replyingTitle}>
                Réponse à {replyingTo.author.name}
              </Text>
              <Text style={styles.replyingText} numberOfLines={1}>
                {replyingTo.body}
              </Text>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} style={styles.closeReply}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={replyingTo ? "Écrire une réponse…" : "Ajouter un commentaire…"}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1_000}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publier le commentaire"
            disabled={!body.trim()}
            onPress={submitComment}
            style={[styles.sendButton, !body.trim() && styles.sendDisabled]}
          >
            <LinearGradient colors={gradients.primary} style={styles.sendGradient}>
              <Ionicons name="send" size={18} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  list: { width: "100%", maxWidth: 680, alignSelf: "center", paddingBottom: spacing.lg },
  postWrap: { paddingTop: spacing.sm },
  commentsTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.lg, marginBottom: 8 },
  comment: { minHeight: 74, paddingVertical: 9, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  replyComment: { marginLeft: 32 },
  commentAvatarPressable: { width: 38, height: 38 },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  commentContent: { flex: 1, minWidth: 0, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  commentName: { color: colors.text, fontSize: 11, fontWeight: "900" },
  commentBody: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },
  commentActions: { marginTop: 7, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  commentDate: { color: colors.textMuted, fontSize: 11 },
  commentActionText: { color: colors.orange, fontSize: 11, fontWeight: "800" },
  commentReactionPicker: { marginTop: 7, minHeight: 48, paddingHorizontal: 4, borderRadius: 22, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  commentReactionChoice: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  commentReactionEmoji: { fontSize: 20 },
  commentReactionSummary: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  commentReactionPill: { minHeight: 25, paddingHorizontal: 7, borderRadius: 13, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 },
  commentReactionPillActive: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.22)" },
  smallEmoji: { fontSize: 11 },
  smallCount: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  emptyComments: { minHeight: 130, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  composerArea: { paddingTop: 6, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  suggestions: { marginBottom: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, overflow: "hidden" },
  suggestionRow: { minHeight: 50, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  suggestionAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  suggestionInitials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  suggestionContent: { flex: 1, minWidth: 0 },
  suggestionName: { color: colors.text, fontSize: 14, fontWeight: "900" },
  suggestionCompany: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  replyingBar: { marginBottom: 6, padding: 8, borderRadius: 13, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 },
  replyAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.orange },
  replyingContent: { flex: 1, minWidth: 0 },
  replyingTitle: { color: colors.orange, fontSize: 11, fontWeight: "900" },
  replyingText: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  closeReply: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 48, maxHeight: 118, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, color: colors.text, ...typography.bodySmall },
  sendButton: { width: 48, height: 48, borderRadius: 17, overflow: "hidden" },
  sendGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.4 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  missingTitle: { ...typography.heading2, color: colors.text, textAlign: "center" },
  missingText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430 },
  primaryButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontWeight: "900" }
});
