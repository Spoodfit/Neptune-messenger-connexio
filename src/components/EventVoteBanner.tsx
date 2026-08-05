import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../theme";
import type { EventVoteAlert } from "../types/messaging";

interface EventVoteBannerProps {
  alert: EventVoteAlert;
}

export function EventVoteBanner({ alert }: EventVoteBannerProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${alert.pendingCount} évènement${alert.pendingCount > 1 ? "s" : ""} à voter pour ${alert.clubName}`}
      style={styles.banner}
    >
      <View style={styles.icon}>
        <Ionicons name="calendar" size={19} color={colors.orange} />
      </View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>VOTE DU CLUB</Text>
        <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {alert.pendingCount} vote{alert.pendingCount > 1 ? "s" : ""} en attente · {alert.clubName}
          {alert.city ? ` · ${alert.city}` : ""}
        </Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Accéder aux votes évènements"
        onPress={() => void Linking.openURL(alert.webUrl)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Voter</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(244,177,131,0.26)",
    backgroundColor: "rgba(244,177,131,0.09)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,177,131,0.14)" },
  content: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.orange, fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  button: { minWidth: 72, minHeight: 48, paddingHorizontal: 11, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] }
});
