import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { coworkingPresentUserIds } from "../domain/coworking";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { colors, gradients } from "../theme";
import { StatusAvatar } from "./StatusAvatar";
import { Text } from "./LocalizedText";

export function CoworkingPortalButton() {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const { snapshot, activeCount } = useCoworking();
  const { members } = useExperience();
  const pulse = useRef(new Animated.Value(0)).current;

  const previewMembers = useMemo(() => {
    const present = coworkingPresentUserIds(snapshot);
    return present
      .map((id) => members.find((member) => member.id === id))
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .slice(0, 3);
  }, [members, snapshot]);

  useEffect(() => {
    if (reducedMotion || activeCount === 0) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true, isInteraction: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true, isInteraction: false })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeCount, pulse, reducedMotion]);

  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.48] });

  return (
    <View style={[styles.shell, { backgroundColor: theme.pageBackground }]}>
      {activeCount > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity, borderColor: theme.violet }]} />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={activeCount > 0 ? `Coworking, ${activeCount} personnes présentes` : "Ouvrir le Coworking"}
        onPress={() => router.push("/coworking")}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <LinearGradient colors={activeCount > 0 ? gradients.primaryWarm : gradients.primary} style={styles.gradient}>
          {previewMembers.length > 0 ? (
            <View style={styles.avatarRow} pointerEvents="none">
              {previewMembers.map((member, index) => (
                <View key={member.id} style={[styles.avatar, index > 0 && styles.avatarOverlap]}>
                  <StatusAvatar user={member} size={23} ringWidth={1.5} accessible={false} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyIcon} pointerEvents="none">
              <Ionicons name="videocam" size={24} color={colors.white} />
              <View style={styles.peopleDot}><Ionicons name="people" size={11} color={colors.white} /></View>
            </View>
          )}
          {activeCount > 0 ? (
            <View style={styles.countPill} pointerEvents="none">
              <View style={styles.liveDot} />
              <Text style={styles.countText}>{activeCount > 99 ? "99+" : String(activeCount)}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: "50%",
    marginLeft: -31,
    top: -13,
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 4,
    zIndex: 1020,
    elevation: 50
  },
  halo: { position: "absolute", left: -4, right: -4, top: -4, bottom: -4, borderRadius: 35, borderWidth: 2 },
  pressable: { flex: 1, borderRadius: 27, overflow: "hidden" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  gradient: {
    flex: 1,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)"
  },
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingLeft: 4 },
  avatar: { borderRadius: 14 },
  avatarOverlap: { marginLeft: -8 },
  emptyIcon: { width: 34, height: 30, alignItems: "center", justifyContent: "center" },
  peopleDot: { position: "absolute", right: -4, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(2,7,19,0.72)", alignItems: "center", justifyContent: "center" },
  countPill: { position: "absolute", right: -5, top: -5, minWidth: 30, height: 21, paddingHorizontal: 5, borderRadius: 11, backgroundColor: "#071127", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.34)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  countText: { color: colors.white, fontSize: 11, lineHeight: 13, fontWeight: "900" }
});