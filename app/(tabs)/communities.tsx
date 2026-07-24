import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, radii, spacing, typography } from "@/theme";

export default function CommunitiesScreen() {
  const { visibleConversations } = useMessaging();

  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Espaces Neptune"
        subtitle="Les groupes sont attribués selon la ville et le rôle."
      />

      <FlatList
        data={visibleConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons
                name={item.type === "announcement" ? "megaphone" : "people"}
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
            {item.restricted ? (
              <Ionicons name="lock-closed" size={17} color={colors.textMuted} />
            ) : null}
          </View>
        )}
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
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
  }
});
