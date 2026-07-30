import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConversationRow } from "@/components/ConversationRow";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

export default function MessagesScreen() {
  const {
    visibleConversations,
    getMessages,
    refreshConversations,
    loadingConversations,
    lastError
  } = useMessaging();
  const sortedConversations = useMemo(
    () =>
      visibleConversations
        .map((conversation) => {
          const localLatestMessage = getMessages(conversation.id)[0];
          if (!localLatestMessage) return conversation;

          const serverTimestamp = conversation.lastMessageAt
            ? Date.parse(conversation.lastMessageAt)
            : 0;
          const localTimestamp = Date.parse(localLatestMessage.createdAt);
          if (!Number.isFinite(localTimestamp) || localTimestamp <= serverTimestamp) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: localLatestMessage.body,
            lastMessageAt: localLatestMessage.createdAt
          };
        })
        .sort((first, second) => {
          const firstTime = first.lastMessageAt
            ? Date.parse(first.lastMessageAt)
            : 0;
          const secondTime = second.lastMessageAt
            ? Date.parse(second.lastMessageAt)
            : 0;
          return secondTime - firstTime;
        }),
    [getMessages, visibleConversations]
  );

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Messages" subtitle="Les échanges Neptune, au même endroit." />

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Discussions
        </Text>
        <View style={styles.sectionCountShell}>
          <Text
            accessibilityLabel={`${sortedConversations.length} discussions visibles`}
            style={styles.sectionCount}
          >
            {sortedConversations.length}
          </Text>
        </View>
      </View>

      {lastError && sortedConversations.length === 0 ? (
        <View style={styles.feedbackWrap}>
          <LinearGradient colors={gradients.glass} style={styles.feedback}>
            <Text accessibilityRole="alert" style={styles.feedbackTitle}>
              Discussions indisponibles
            </Text>
            <Text style={styles.feedbackText}>{lastError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer de charger les discussions"
              onPress={() => void refreshConversations()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed
              ]}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </LinearGradient>
        </View>
      ) : loadingConversations && sortedConversations.length === 0 ? (
        <View
          style={styles.feedbackWrap}
          accessibilityLabel="Chargement des discussions"
        >
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : (
        <FlatList
          accessibilityLabel="Liste des discussions Neptune"
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} />}
          style={styles.listViewport}
          contentContainerStyle={[
            styles.list,
            sortedConversations.length === 0 && styles.emptyList
          ]}
          refreshing={loadingConversations}
          onRefresh={() => void refreshConversations()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.feedbackTitle}>Aucune discussion</Text>
              <Text style={styles.feedbackText}>
                Les groupes autorisés apparaîtront ici après la synchronisation
                Neptune.
              </Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sectionHeader: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontWeight: "900"
  },
  sectionCountShell: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(107,79,234,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  sectionCount: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900"
  },
  listViewport: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center"
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 22
  },
  emptyList: { flexGrow: 1 },
  feedbackWrap: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    flex: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  feedback: {
    width: "100%",
    maxWidth: 430,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    gap: spacing.sm
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  feedbackTitle: {
    ...typography.heading3,
    color: colors.text,
    textAlign: "center"
  },
  feedbackText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center"
  },
  retryButton: {
    minHeight: 48,
    minWidth: 124,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  retryPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  retryText: { color: colors.white, fontWeight: "900" }
});
