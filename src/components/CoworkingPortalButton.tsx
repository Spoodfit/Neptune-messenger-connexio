import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useCoworking } from "../providers/CoworkingProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { colors, gradients } from "../theme";
import { Text } from "./LocalizedText";

export function CoworkingPortalButton() {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const compact = width < 310;
  const { activeCount } = useCoworking();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion || activeCount === 0) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true, isInteraction: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true, isInteraction: false })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeCount, pulse, reducedMotion]);

  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.38] });

  return (
    <View pointerEvents="box-none" style={[styles.anchor, compact && styles.compactAnchor]}>
      <View style={[styles.shell, compact && styles.compactShell, { backgroundColor: theme.pageBackground }]}>
        {activeCount > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity, borderColor: theme.violet }]} />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la Map"
          accessibilityHint="Afficher les membres connectés et les événements sur la carte"
          onPress={() => router.push("/coworking")}
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        >
          <LinearGradient colors={gradients.primary} style={styles.gradient}>
            <Ionicons name="map-outline" size={compact ? 24 : 27} color={colors.white} />
            {activeCount > 0 ? (
              <View style={styles.countPill} pointerEvents="none">
                <Text style={styles.countText}>{activeCount > 99 ? "99+" : String(activeCount)}</Text>
              </View>
            ) : null}
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
  halo: { position: "absolute", left: -4, right: -4, top: -4, bottom: -4, borderRadius: 35, borderWidth: 2 },
  pressable: { flex: 1, borderRadius: 27, overflow: "hidden" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  gradient: { flex: 1, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  countPill: { position: "absolute", right: -3, top: -3, minWidth: 23, height: 19, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#071127", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.34)", alignItems: "center", justifyContent: "center" },
  countText: { color: colors.white, fontSize: 10, lineHeight: 12, fontWeight: "900" }
});
