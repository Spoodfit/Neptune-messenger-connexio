import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { env } from "@/config/env";
import { members } from "@/data/mockData";
import { colors, radii, spacing, typography } from "@/theme";

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
            <View style={styles.avatar} accessibilityElementsHidden>
              <Text style={styles.initials}>{item.initials}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.company}>
                {item.company} · {item.city}
              </Text>
            </View>
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
                    color: item.online ? colors.success : colors.textMuted
                  }
                ]}
              >
                {item.online ? "En ligne" : "Absent"}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              Annuaire non connecté
            </Text>
            <Text style={styles.emptyText}>
              Aucun membre fictif n’est affiché. L’annuaire sera activé après validation de l’endpoint Neptune et des règles de confidentialité.
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
  row: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  initials: {
    color: colors.white,
    fontWeight: "900"
  },
  content: {
    flex: 1
  },
  name: {
    ...typography.heading3,
    color: colors.text
  },
  company: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3
  },
  status: {
    borderRadius: radii.pill,
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
  emptyTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" }
});
