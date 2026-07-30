import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConversationRow } from "@/components/ConversationRow";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, spacing, typography } from "@/theme";

export default function MessagesScreen() {
  const {
    visibleConversations,
    refreshConversations,
    loadingConversations,
    lastError
  } = useMessaging();
  const sortedConversations = useMemo(
    () =>
      [...visibleConversations].sort((first, second) => {
        const firstTime = first.lastMessageAt
          ? Date.parse(first.lastMessageAt)
          : 0;
        const secondTime = second.lastMessageAt
          ? Date.parse(second.lastMessageAt)
          : 0;
        return secondTime - firstTime;
      }),
    [visibleConversations]
  );

  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Connexio"
        subtitle="Les échanges Neptune, au même endroit."
      />

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Discussions récentes
        </Text>
        <Text
          accessibilityLabel={`${sortedConversations.length} discussions visibles`}
          style={styles.sectionCount}
        >
          {sortedConversations.length}
        </Text>
      </View>

      {lastError && sortedConversations.length === 0 ? (
        <View style={styles.feedback}>
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
        </View>
      ) : loadingConversations && sortedConversations.length === 0 ? (
        <View style={styles.feedback} accessibilityLabel="Chargement des discussions">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          accessibilityLabel="Liste des discussions Neptune"
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} />}
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
                Les groupes autorisés apparaîtront ici après la synchronisation Neptune.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text
  },
  sectionCount: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    lineHeight: 26
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 96
  },
  emptyList: { flexGrow: 1 },
  feedback: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  feedbackTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  feedbackText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
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
