import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

import { useAppTheme } from "@/providers/ThemeProvider";
export default function CommunitiesScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        style={styles.listViewport}
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
              <Text style={styles.title} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {item.memberCount} membres · {item.categoryLabel}
              </Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Ionicons
              accessibilityElementsHidden
              name={item.canPost ? "chevron-forward" : "lock-closed"}
              size={18}
              color={theme.pageTextMuted}
              style={styles.trailingIcon}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun espace accessible</Text>
            <Text style={styles.emptyText}>
              Les espaces apparaîtront après la synchronisation de votre club et
              de votre rôle Neptune.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.pageBackground
  },
  listViewport: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center"
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 96
  },
  emptyList: { flexGrow: 1 },
  card: {
    width: "100%",
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 23,
    backgroundColor: theme.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  title: {
    ...typography.heading3,
    color: theme.pageText
  },
  meta: {
    ...typography.caption,
    color: theme.pageTextMuted
  },
  description: {
    ...typography.bodySmall,
    color: theme.pageTextSecondary
  },
  trailingIcon: { flexShrink: 0 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: {
    ...typography.heading3,
    color: theme.pageText,
    textAlign: "center"
  },
  emptyText: {
    ...typography.body,
    color: theme.pageTextMuted,
    textAlign: "center"
  }
});