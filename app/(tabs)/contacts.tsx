import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { members } from "@/data/mockData";
import { colors, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

export default function ContactsScreen() {
  const visibleMembers = env.mockMode ? members : [];

  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Membres"
        subtitle="Annuaire de l’écosystème Neptune."
      />

      <FlatList
        accessibilityLabel="Annuaire des membres Neptune"
        data={visibleMembers}
        keyExtractor={(item) => item.id}
        style={styles.listViewport}
        contentContainerStyle={[
          styles.list,
          visibleMembers.length === 0 && styles.emptyList
        ]}
        renderItem={({ item }) => (
          <View
            accessible
            accessibilityLabel={`${item.name}. ${item.company}. ${item.city}. ${item.online ? "En ligne" : "Absent"}`}
            style={styles.row}
          >
            <StatusAvatar user={item} size={46} accessible={false} />
            <View style={styles.content}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.company} numberOfLines={2}>
                {item.company} · {item.city}
              </Text>
              <View
                style={[
                  styles.status,
                  {
                    backgroundColor: item.online
                      ? colors.successSoft
                      : colors.surfaceMuted
                  }
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.online
                        ? colors.success
                        : colors.textSecondary
                    }
                  ]}
                >
                  {item.online ? "En ligne" : "Absent"}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              Annuaire non connecté
            </Text>
            <Text style={styles.emptyText}>
              Aucun membre fictif n’est affiché. L’annuaire sera activé après
              validation de l’endpoint Neptune et des règles de confidentialité.
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
  row: {
    width: "100%",
    minHeight: 74,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    flexShrink: 0
  },
  initials: {
    color: colors.white,
    fontWeight: "900"
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start"
  },
  name: {
    ...typography.heading3,
    color: colors.text,
    maxWidth: "100%"
  },
  company: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 3,
    maxWidth: "100%"
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  statusText: {
    ...typography.caption,
    fontWeight: "800"
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.text,
    textAlign: "center"
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center"
  }
});
