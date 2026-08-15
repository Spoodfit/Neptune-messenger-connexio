import { Text } from "@/components/LocalizedText";
import { StyleSheet, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import type { UserRole } from "../types/messaging";

interface MemberStatusBadgeProps {
  role: UserRole;
  compact?: boolean;
  accessibilityLabel?: string;
}

export function MemberStatusBadge({
  role,
  compact = false,
  accessibilityLabel
}: MemberStatusBadgeProps) {
  const theme = useAppTheme();
  const appearance = getRoleAppearance(role, theme.isLight);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `Statut ${appearance.label}`}
      style={[
        styles.badge,
        compact && styles.compact,
        {
          backgroundColor: appearance.background,
          borderColor: appearance.border
        }
      ]}
    >
      <View style={[styles.dot, { backgroundColor: appearance.foreground }]} />
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          compact && styles.compactLabel,
          { color: appearance.foreground }
        ]}
      >
        {compact ? appearance.shortLabel : appearance.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    maxWidth: "100%",
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  compact: {
    minHeight: 22,
    paddingHorizontal: 7,
    borderRadius: 11
  },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  label: { flexShrink: 1, fontSize: 11, fontWeight: "900" },
  compactLabel: { fontSize: 11 }
});
