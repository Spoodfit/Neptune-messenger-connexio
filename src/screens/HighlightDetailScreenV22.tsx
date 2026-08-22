import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighlightCard } from "@/components/HighlightCard";
import { HighlightEditModal } from "@/components/HighlightEditModal";
import { HighlightShareButton } from "@/components/HighlightShareButton";
import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";
import { ContentEditApi } from "@/services/api/contentEditApi";
import { AppAlert } from "@/services/ui/AppAlert";
import { applyHighlightEdit, rememberCommentEdit, rememberHighlightEdit, useContentEditRevision } from "@/state/contentEdits";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { HighlightComment, HighlightKind, HighlightPost, QuickReaction } from "@/types/experience";

const REACTIONS: QuickReaction[] = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

export default function HighlightDetailScreenV22() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const { currentUser, accessToken } = useSession();
  const { posts, members, togglePostReaction, addComment, toggleCommentReaction } = useExperience();
  useContentEditRevision();
  const rawPost = posts.find((item) => item.id === id);
  const post = rawPost ? applyHighlightEdit(rawPost) : undefined;
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<HighlightComment | null>(null);
  const [reactionCommentId, setReactionCommentId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<HighlightPost | null>(null);
  const [editingComment, setEditingComment] = useState<HighlightComment | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const editApi = useMemo(() => new ContentEditApi(accessToken), [accessToken]);

  const mentionQuery = useMemo(() => {
    const match = body.match(/(?:^|\s)@([^\s@]*)$/u);
    return match?.[1]?.toLocaleLowerCase("fr") ?? null;
  }, [body]);
  const suggestions = useMemo(() => mentionQuery === null ? [] : members.filter((member) => [member.name, member.company].join(" ").toLocaleLowerCase("fr").includes(mentionQuery)).slice(0, 4), [members, mentionQuery]);

  if (!post) return (
    <LinearGradient colors={theme.pageGradient} style={styles.missing}>
      <Text style={styles.missingTitle}>Publication introuvable</Text>
      <Text style={styles.missingText}>Elle a été supprimée, masquée ou n’est plus accessible.</Text>
      <Pressable onPress={() => router.replace("/(tabs)/highlights")} style={styles.primaryButton}><Text style={styles.primaryText}>Retour aux Temps forts</Text></Pressable>
    </LinearGradient>
  );

  const insertMention = (name: string) => setBody((current) => current.replace(/@[^\s@]*$/u, `@${name.split(" ")[0]} `));
  const submitComment = () => {
    const cleanBody = body.trim();
    if (!cleanBody) return;
    const mentionedUserIds = members.filter((member) => {
      const text = cleanBody.toLocaleLowerCase("fr");
      const firstName = member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
      return firstName && text.includes(`@${firstName}`);
    }).map((member) => member.id);
    addComment(post.id, cleanBody, replyingTo?.id, mentionedUserIds);
    setBody("");
    setReplyingTo(null);
  };

  const savePost = async (nextBody: string, nextKind: HighlightKind) => {
    if (!editingPost || savingEdit) return;
    setSavingEdit(true);
    try {
      if (!env.mockMode && env.backendContract === "connexio-v1" && !editingPost.id.startsWith("post-") && !editingPost.id.startsWith("local-")) await editApi.editHighlight(editingPost.id, nextBody, nextKind);
      rememberHighlightEdit(editingPost.id, nextBody, nextKind);
      setEditingPost(null);
    } catch (error) {
      AppAlert.alert("Modification impossible", error instanceof Error ? error.message : "La publication n’a pas pu être modifiée.");
    } finally { setSavingEdit(false); }
  };

  const openCommentEditor = (comment: HighlightComment) => {
    if (comment.author.id !== currentUser.id) return;
    setCommentDraft(comment.body);
    setEditingComment(comment);
  };
  const saveComment = async () => {
    if (!editingComment || savingEdit || !commentDraft.trim()) return;
    setSavingEdit(true);
    try {
      if (!env.mockMode && env.backendContract === "connexio-v1" && !editingComment.id.startsWith("comment-") && !editingComment.id.startsWith("local-")) await editApi.editComment(editingComment.id, commentDraft.trim());
      rememberCommentEdit(editingComment.id, commentDraft.trim());
      setEditingComment(null);
    } catch (error) {
      AppAlert.alert("Modification impossible", error instanceof Error ? error.message : "Le commentaire n’a pas pu être modifié.");
    } finally { setSavingEdit(false); }
  };

  const renderComment = ({ item }: { item: HighlightComment }) => (
    <View style={[styles.comment, item.parentCommentId ? styles.replyComment : undefined]}>
      <Pressable onPress={() => router.push(`/profile/${encodeURIComponent(item.author.id)}`)} style={styles.commentAvatarPressable}><StatusAvatar user={item.author} size={38} accessible={false} /></Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Commentaire de ${item.author.name}`}
        accessibilityHint={item.author.id === currentUser.id ? "Maintenir pour modifier" : undefined}
        onPress={() => undefined}
        onLongPress={item.author.id === currentUser.id ? () => openCommentEditor(item) : undefined}
        delayLongPress={500}
        style={[styles.commentContent, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
      >
        <Pressable onPress={() => router.push(`/profile/${encodeURIComponent(item.author.id)}`)}><Text style={styles.commentName}>{item.author.name}</Text></Pressable>
        <Text style={styles.commentBody}>{item.body}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.commentDate}>{new Date(item.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{item.updatedAt ? " · modifié" : ""}</Text>
          {env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? <Pressable onPress={() => setReplyingTo(item)} hitSlop={8}><Text style={styles.commentActionText}>Répondre</Text></Pressable> : null}
          {env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? <Pressable onPress={() => setReactionCommentId(item.id)} hitSlop={8}><Text style={styles.commentActionText}>Réagir</Text></Pressable> : null}
          {item.author.id === currentUser.id ? <Pressable onPress={() => openCommentEditor(item)} hitSlop={8}><Text style={styles.commentActionText}>Modifier</Text></Pressable> : null}
        </View>
        {reactionCommentId === item.id ? <View style={styles.commentReactionPicker}>{REACTIONS.map((emoji) => <Pressable key={emoji} onPress={() => { toggleCommentReaction(post.id, item.id, emoji); setReactionCommentId(null); }} style={styles.commentReactionChoice}><Text style={styles.commentReactionEmoji}>{emoji}</Text></Pressable>)}</View> : null}
        {item.reactions.length > 0 ? <View style={styles.commentReactionSummary}>{item.reactions.map((reaction) => <Pressable key={reaction.emoji} onPress={() => toggleCommentReaction(post.id, item.id, reaction.emoji)} style={[styles.commentReactionPill, reaction.reactedByCurrentUser && styles.commentReactionPillActive]}><Text style={styles.smallEmoji}>{reaction.emoji}</Text><Text style={styles.smallCount}>{reaction.count}</Text></Pressable>)}</View> : null}
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={theme.pageGradient} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), paddingLeft: spacing.sm + insets.left, paddingRight: spacing.sm + insets.right }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Publication</Text>
        <View style={styles.headerActions}><ThemeModeButton /><HighlightShareButton post={post} /></View>
      </View>

      <FlatList
        data={post.comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right }]}
        ListHeaderComponent={<View style={styles.postWrap}><Pressable accessibilityHint={post.author.id === currentUser.id ? "Maintenir pour modifier votre publication" : undefined} onPress={() => undefined} onLongPress={post.author.id === currentUser.id ? () => setEditingPost(post) : undefined} delayLongPress={500}><HighlightCard post={post} onReact={env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? (emoji) => togglePostReaction(post.id, emoji) : undefined} /></Pressable>{post.updatedAt ? <Text style={[styles.postEdited, { color: theme.pageTextMuted }]}>modifié</Text> : null}<Text style={styles.commentsTitle}>Commentaires · {post.comments.length}</Text></View>}
        ListEmptyComponent={<View style={styles.emptyComments}><Ionicons name="chatbubbles-outline" size={27} color={theme.pageTextMuted} /><Text style={styles.emptyText}>Soyez le premier à commenter.</Text></View>}
      />

      {env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? <View style={[styles.composerArea, { paddingLeft: spacing.sm + insets.left, paddingRight: spacing.sm + insets.right, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {suggestions.length > 0 ? <View style={styles.suggestions}>{suggestions.map((member) => <Pressable key={member.id} onPress={() => insertMention(member.name)} style={styles.suggestionRow}><StatusAvatar user={member} size={32} accessible={false} /><View style={styles.suggestionContent}><Text style={styles.suggestionName}>{member.name}</Text><Text style={styles.suggestionCompany} numberOfLines={1}>{member.company}</Text></View></Pressable>)}</View> : null}
        {replyingTo ? <View style={styles.replyingBar}><View style={styles.replyAccent} /><View style={styles.replyingContent}><Text style={styles.replyingTitle}>Réponse à {replyingTo.author.name}</Text><Text style={styles.replyingText} numberOfLines={1}>{replyingTo.body}</Text></View><Pressable onPress={() => setReplyingTo(null)} style={styles.closeReply}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable></View> : null}
        <View style={styles.composer}><TextInput value={body} onChangeText={setBody} placeholder={replyingTo ? "Écrire une réponse…" : "Ajouter un commentaire…"} placeholderTextColor={theme.pageTextMuted} multiline maxLength={1_000} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Publier le commentaire" disabled={!body.trim()} onPress={submitComment} style={[styles.sendButton, !body.trim() && styles.sendDisabled]}><LinearGradient colors={gradients.primary} style={styles.sendGradient}><Ionicons name="send" size={18} color={colors.white} /></LinearGradient></Pressable></View>
      </View> : null}

      <HighlightEditModal post={editingPost} saving={savingEdit} onClose={() => setEditingPost(null)} onSave={savePost} />
      <Modal transparent animationType="fade" visible={Boolean(editingComment)} onRequestClose={() => setEditingComment(null)}>
        <Pressable style={[styles.editBackdrop, { backgroundColor: theme.overlay }]} onPress={() => setEditingComment(null)}><Pressable style={[styles.editSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}><View style={styles.editHeader}><Ionicons name="create-outline" size={21} color={theme.violet} /><Text style={[styles.editTitle, { color: theme.pageText }]}>Modifier le commentaire</Text><Pressable accessibilityLabel="Fermer" onPress={() => setEditingComment(null)} style={styles.editClose}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable></View><TextInput autoFocus multiline value={commentDraft} onChangeText={setCommentDraft} maxLength={1_000} placeholder="Modifier votre commentaire…" placeholderTextColor={theme.pageTextMuted} style={[styles.editInput, { color: theme.pageText, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong }]} /><Pressable accessibilityRole="button" accessibilityLabel="Enregistrer le commentaire modifié" disabled={!commentDraft.trim() || savingEdit} onPress={() => void saveComment()} style={[styles.editSave, { backgroundColor: theme.violet }, (!commentDraft.trim() || savingEdit) && styles.sendDisabled]}><Text style={styles.primaryText}>{savingEdit ? "Enregistrement…" : "Enregistrer"}</Text></Pressable></Pressable></Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.pageBackground },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: theme.pageText, flex: 1, textAlign: "center" },
  list: { width: "100%", maxWidth: 680, alignSelf: "center", paddingBottom: spacing.lg },
  postWrap: { paddingTop: spacing.sm },
  postEdited: { alignSelf: "flex-end", fontSize: 11, fontWeight: "700", marginTop: 3, marginRight: 8 },
  commentsTitle: { ...typography.heading3, color: theme.pageText, marginTop: spacing.lg, marginBottom: 8 },
  comment: { minHeight: 74, paddingVertical: 9, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  replyComment: { marginLeft: 32 },
  commentAvatarPressable: { width: 38, height: 38 },
  commentContent: { flex: 1, minWidth: 0, padding: 10, borderRadius: 16, borderWidth: 1 },
  commentName: { color: theme.pageText, fontSize: 12, fontWeight: "900" },
  commentBody: { ...typography.bodySmall, color: theme.pageTextSecondary, marginTop: 4 },
  commentActions: { marginTop: 7, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  commentDate: { color: theme.pageTextMuted, fontSize: 11 },
  commentActionText: { color: theme.orange, fontSize: 11, fontWeight: "800" },
  commentReactionPicker: { marginTop: 7, minHeight: 48, paddingHorizontal: 4, borderRadius: 22, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  commentReactionChoice: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  commentReactionEmoji: { fontSize: 20 },
  commentReactionSummary: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  commentReactionPill: { minHeight: 28, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 },
  commentReactionPillActive: { borderColor: theme.violet, backgroundColor: theme.violetSoft },
  smallEmoji: { fontSize: 12 },
  smallCount: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "800" },
  emptyComments: { minHeight: 130, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { ...typography.bodySmall, color: theme.pageTextMuted },
  composerArea: { paddingTop: 6, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.borderSoft },
  suggestions: { marginBottom: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceStrong, overflow: "hidden" },
  suggestionRow: { minHeight: 50, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  suggestionContent: { flex: 1, minWidth: 0 },
  suggestionName: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  suggestionCompany: { color: theme.pageTextMuted, fontSize: 11, marginTop: 1 },
  replyingBar: { marginBottom: 6, padding: 8, borderRadius: 13, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 },
  replyAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: theme.orange },
  replyingContent: { flex: 1, minWidth: 0 },
  replyingTitle: { color: theme.orange, fontSize: 11, fontWeight: "900" },
  replyingText: { color: theme.pageTextSecondary, fontSize: 11, marginTop: 2 },
  closeReply: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, color: theme.pageText, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  sendButton: { width: 48, height: 48, borderRadius: 17, overflow: "hidden" },
  sendGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.4 },
  editBackdrop: { flex: 1, justifyContent: "flex-end", padding: 10 },
  editSheet: { width: "100%", maxWidth: 560, alignSelf: "center", borderRadius: 24, borderWidth: 1, padding: 14, gap: 12 },
  editHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  editTitle: { flex: 1, fontSize: 16, fontWeight: "900" },
  editClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  editInput: { minHeight: 120, maxHeight: 220, borderWidth: 1, borderRadius: 18, padding: 13, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  editSave: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  missingTitle: { ...typography.heading2, color: theme.pageText, textAlign: "center" },
  missingText: { ...typography.body, color: theme.pageTextMuted, textAlign: "center", maxWidth: 430 },
  primaryButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" }
});
