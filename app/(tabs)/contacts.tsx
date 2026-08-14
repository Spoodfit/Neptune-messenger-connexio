import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { members } from "@/data/mockData";
import { useAppTheme } from "@/providers/ThemeProvider";
import { radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

export default function ContactsScreen() {
  const visibleMembers = env.mockMode ? members : [];
  const theme = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <BrandHeader title="Membres" subtitle="Annuaire de l’écosystème Neptune." />
      <FlatList
        accessibilityLabel="Annuaire des membres Neptune"
        data={visibleMembers}
        keyExtractor={(item) => item.id}
        style={styles.listViewport}
        contentContainerStyle={[styles.list, visibleMembers.length === 0 && styles.emptyList]}
        renderItem={({ item }) => (
          <View accessible accessibilityLabel={`${item.name}. ${item.company}. ${item.city}. ${item.online ? "En ligne" : "Absent"}`} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <StatusAvatar user={item} size={46} accessible={false} />
            <View style={styles.content}>
              <Text style={[styles.name, { color: theme.pageText }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.company, { color: theme.pageTextMuted }]} numberOfLines={2}>{item.company} · {item.city}</Text>
              <View style={[styles.status, { backgroundColor: item.online ? theme.successSoft : theme.surfaceMuted }]}>
                <Text style={[styles.statusText, { color: item.online ? theme.success : theme.pageTextSecondary }]}>{item.online ? "En ligne" : "Absent"}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyState}><Text accessibilityRole="header" style={[styles.emptyTitle, { color: theme.pageText }]}>Annuaire non connecté</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Aucun membre fictif n’est affiché. L’annuaire sera activé après validation de l’endpoint Neptune et des règles de confidentialité.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listViewport: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 96 },
  emptyList: { flexGrow: 1 },
  row: { width: "100%", minHeight: 82, flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
  content: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  name: { ...typography.heading3, maxWidth: "100%" },
  company: { ...typography.caption, fontSize: 14, lineHeight: 20, marginTop: 3, maxWidth: "100%" },
  status: { minHeight: 30, alignSelf: "flex-start", borderRadius: radii.pill, marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, justifyContent: "center" },
  statusText: { ...typography.caption, fontWeight: "800" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.heading3, textAlign: "center" },
  emptyText: { ...typography.body, textAlign: "center" }
});
