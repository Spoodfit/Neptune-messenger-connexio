import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../providers/ThemeProvider";

const HIDDEN_ROOTS = new Set(["(tabs)", "sign-in", "access-help", "call"]);

function fallbackFor(root?: string): "/(tabs)/messages" | "/(tabs)/highlights" | "/(tabs)/calls" | "/(tabs)/settings" {
  if (root === "highlight" || root === "new-highlight") return "/(tabs)/highlights";
  if (root === "call" || root === "schedule-call") return "/(tabs)/calls";
  if (root === "account" || root === "privacy" || root === "blocked-users" || root === "notification-settings") return "/(tabs)/settings";
  return "/(tabs)/messages";
}

export function FloatingBackButton() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const root = segments[0] as string | undefined;
  if (!root || HIDDEN_ROOTS.has(root)) return null;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackFor(root));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour à l’écran précédent"
      onPress={goBack}
      style={({ pressed }) => [
        styles.button,
        {
          left: Math.max(12, insets.left + 12),
          bottom: Math.max(92, insets.bottom + 86),
          backgroundColor: theme.shellBackground,
          borderColor: theme.border,
          shadowColor: theme.shadow
        },
        pressed && styles.pressed
      ]}
    >
      <Ionicons name="arrow-back" size={18} color={theme.pageText} />
      <Text style={[styles.label, { color: theme.pageText }]}>Retour</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", zIndex: 5000, elevation: 32, minWidth: 94, height: 48, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  label: { fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] }
});
