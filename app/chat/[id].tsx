import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExperience } from "../../src/providers/ExperienceProvider";
import { useGroupAdmin } from "../../src/providers/GroupAdminProvider";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { useSession } from "../../src/providers/SessionProvider";
import ChatConversationScreen from "../../src/screens/ChatConversationScreen";
import { colors, gradients, spacing, typography } from "../../src/theme";
import type { ChatMessage } from "../../src/types/messaging";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

function mentionsViewer(message: ChatMessage, user: { id: string; name: string; company: string }) {
  if (message.isMine) return false;
  if (message.mentionedUserIds?.includes(user.id)) return true;
  const text = message.body.toLocaleLowerCase("fr");
  const firstName = user.name.trim().split(/\s+/)[0]?.toLocaleLowerCase("fr") ?? "";
  return [firstName, user.name.toLocaleLowerCase("fr"), user.company.toLocaleLowerCase("fr")]
    .filter(Boolean)
    .some((alias) => text.includes(`@${alias}`));
}

export default function ChatRoute() {
  const params = useLocalSearchParams<{ id: string | string[]; focusMention?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const id = first(params.id);
  const focusMention = first(params.focusMention) === "1";
  const { currentUser } = useSession();
  const messaging = useMessaging();
  const experience = useExperience();
  const groupAdmin = useGroupAdmin();

  const serverConversation = messaging.getConversation(id);
  const privateConversation = experience.getConversation(id);
  const adminConversation = groupAdmin.getCreatedGroup(id);
  const conversation = serverConversation ?? privateConversation ?? adminConversation;
  const localOnly = Boolean(privateConversation || adminConversation);
  const messages = adminConversation
    ? groupAdmin.getCreatedGroupMessages(id)
    : privateConversation
      ? experience.getConversationMessages(id)
      : messaging.getMessages(id);

  const ordered = useMemo(
    () => [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [messages]
  );
  const mentionIndex = useMemo(() => {
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (mentionsViewer(ordered[index]!, currentUser)) return index;
    }
    return -1;
  }, [currentUser, ordered]);
  const mention = mentionIndex >= 0 ? ordered[mentionIndex] : undefined;
  const context = mention
    ? ordered.slice(Math.max(0, mentionIndex - 2), Math.min(ordered.length, mentionIndex + 3))
    : [];
  const loading = messaging.loadingConversationIds.has(id);
  const loadingMore = messaging.loadingMoreConversationIds.has(id);
  const hasMore = messaging.hasMoreMessages(id);

  useEffect(() => {
    if (!focusMention || localOnly || !id || messages.length || loading) return;
    void messaging.loadMessages(id);
  }, [focusMention, id, loading, localOnly, messages.length, messaging]);

  useEffect(() => {
    if (!focusMention || localOnly || !id || mention || loading || loadingMore || !hasMore) return;
    void messaging.loadMoreMessages(id);
  }, [focusMention, hasMore, id, loading, loadingMore, localOnly, mention, messaging]);

  useEffect(() => {
    if (!focusMention || localOnly || !id || messages.length === 0) return;
    void messaging.markConversationRead(id);
  }, [focusMention, id, localOnly, messages.length, messaging]);

  if (!focusMention || (!mention && !loading && !loadingMore && !hasMore)) {
    return <ChatConversationScreen />;
  }

  const openConversation = () => router.replace({ pathname: "/chat/[id]", params: { id } });

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux discussions" onPress={() => router.replace("/(tabs)/messages")} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title}>{conversation?.name ?? "Conversation"}</Text>
          <Text style={styles.headerMeta}>Mention retrouvée</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Afficher les messages récents" onPress={openConversation} style={styles.iconButton}>
          <Ionicons name="arrow-down-circle-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {!mention ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.loadingTitle}>Recherche de votre mention…</Text>
          <Text style={styles.muted}>Connexio remonte automatiquement dans l’historique.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.info}>
            <Ionicons name="at" size={23} color={colors.orange} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Vous avez été mentionné ici</Text>
              <Text style={styles.muted}>Le message est affiché avec son contexte immédiat.</Text>
            </View>
          </View>

          <View style={styles.stack}>
            {context.map((message) => {
              const selected = message.id === mention.id;
              return (
                <View key={message.id} style={[styles.card, selected && styles.selectedCard]}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.sender, selected && styles.selectedSender]}>{message.senderName}</Text>
                    <Text style={styles.date}>{new Date(message.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <Text selectable style={styles.body}>{message.body}</Text>
                  {selected ? <Text style={styles.badge}>@ Votre mention</Text> : null}
                </View>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la discussion et répondre" onPress={openConversation} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.white} />
            <Text style={styles.primaryText}>Ouvrir la discussion et répondre</Text>
          </Pressable>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0, alignItems: "center" },
  title: { ...typography.heading3, color: colors.text },
  headerMeta: { color: colors.orange, fontSize: 11, fontWeight: "900", marginTop: 2 },
  loading: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: spacing.md },
  info: { minHeight: 72, padding: 13, borderRadius: 20, borderWidth: 1, borderColor: "rgba(244,177,131,0.30)", backgroundColor: "rgba(244,177,131,0.08)", flexDirection: "row", alignItems: "center", gap: 11 },
  infoCopy: { flex: 1 },
  infoTitle: { ...typography.heading3, color: colors.text, marginBottom: 3 },
  stack: { marginTop: spacing.md, gap: 9 },
  card: { padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  selectedCard: { borderColor: colors.orange, backgroundColor: "rgba(244,177,131,0.09)" },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sender: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: "900" },
  selectedSender: { color: colors.orange },
  date: { color: colors.textMuted, fontSize: 11 },
  body: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 7 },
  badge: { color: colors.orange, fontSize: 11, fontWeight: "900", marginTop: 10 },
  primary: { minHeight: 54, marginTop: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] }
});
