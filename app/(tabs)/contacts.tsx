import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { members } from "@/data/mockData";
import { colors, radii, spacing, typography } from "@/theme";

export default function ContactsScreen() {
  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Membres"
        subtitle="Annuaire simplifié de l’écosystème Neptune."
      />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
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
  row: {
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
  }
});
