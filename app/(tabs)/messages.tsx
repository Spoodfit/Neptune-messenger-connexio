import { FlatList, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { ConversationRow } from "@/components/ConversationRow";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, spacing, typography } from "@/theme";

export default function MessagesScreen() {
  const { visibleConversations } = useMessaging();

  return (
    <View style={styles.screen}>
      <BrandHeader
        title="Connexio"
        subtitle="Les échanges Neptune, au même endroit."
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discussions récentes</Text>
        <Text style={styles.sectionCount}>
          {visibleConversations.length}
        </Text>
      </View>

      <FlatList
        data={visibleConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  }
});
