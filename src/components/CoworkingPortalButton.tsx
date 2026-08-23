import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { colors, gradients } from "../theme";

export function CoworkingPortalButton() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 310;

  return (
    <View pointerEvents="box-none" style={[styles.anchor, compact && styles.compactAnchor]}>
      <View style={[styles.shell, compact && styles.compactShell, { backgroundColor: theme.pageBackground }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la Map"
          accessibilityHint="Afficher les membres connectés et les événements sur la carte"
          onPress={() => router.push("/coworking")}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        >
          <LinearGradient colors={gradients.primary} style={styles.gradient}>
            <Ionicons name="map-outline" size={compact ? 24 : 27} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -13,
    alignItems: "center",
    zIndex: 1020,
    elevation: 50
  },
  compactAnchor: { top: -9 },
  shell: { width: 62, height: 62, borderRadius: 31, padding: 4 },
  compactShell: { width: 56, height: 56, borderRadius: 28 },
  pressable: { flex: 1, borderRadius: 27, overflow: "hidden" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  gradient: { flex: 1, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }
});
