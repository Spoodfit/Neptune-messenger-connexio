import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, radii, spacing, typography } from "@/theme";

export default function CommunitiesScreen() {
  const {
    visibleConversations,
    refreshConversations,
    loadingConversations
  } = useMessaging();
  const spaces = useMemo(
    () =>
      visibleConversations.filter(
        (conversation) =>
          conversation.type !== "direct" && conversation.type !== "small_group"
      ),
    [visibleConversations]
  );

  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Espaces Neptune"
        subtitle="Les groupes sont attribués selon la ville et le rôle."
      />

      <FlatList
        accessibilityLabel="Espaces Neptune accessibles"
        data={spaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          spaces.length === 0 && styles.emptyList
        ]}
        refreshing={loadingConversations}
        onRefresh={() => void refreshConversations()}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir ${item.name}. ${item.memberCount} membres. ${item.categoryLabel}. ${item.canPost ? "Publication autorisée" : "Lecture seule"}`}
            onPress={() => router.push(`/chat/${encodeURIComponent(item.id)}`)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.icon} accessibilityElementsHidden>
              <Ionicons
                name={
                  item.type === "announcement"
                    ? "megaphone"
                    : item.type === "support"
                      ? "construct"
                      : item.type === "role"
                        ? "ribbon"
                        : "people"
                }
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.memberCount} membres · {item.categoryLabel}
              </Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
            </View>
            <Ionicons
              name={item.canPost ? "chevron-forward" : "lock-closed"}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun espace accessible</Text>
            <Text style={styles.emptyText}>
              Les espaces apparaîtront après la synchronisation de votre club et de votre rôle Neptune.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 96
  },
  emptyList: { flexGrow: 1 },
  card: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flex: 1,
    gap: 3
  },
  title: {
    ...typography.heading3,
    color: colors.text
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" }
});
