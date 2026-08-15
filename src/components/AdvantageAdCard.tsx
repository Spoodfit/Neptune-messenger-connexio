import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { env } from "../config/env";
import { colors, gradients, typography } from "../theme";

export function AdvantageAdCard() {
  const url = `${env.businessWebBaseUrl.replace(/\/$/, "")}/comite-avantage`;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Découvrir le Comité Avantage Neptune"
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={gradients.primaryWarm}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.icon}>
          <Ionicons name="gift-outline" size={24} color={colors.white} />
        </View>
        <Text style={styles.eyebrow}>COMITÉ AVANTAGE</Text>
        <Text style={styles.title}>Des offres négociées pour les membres Neptune.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Découvrir les avantages</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: "100%", minHeight: 205, flex: 1, alignSelf: "stretch" },
  card: {
    flex: 1,
    minHeight: 205,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    justifyContent: "flex-end"
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginBottom: "auto",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,7,19,0.24)"
  },
  eyebrow: {
    color: colors.whiteMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  title: { ...typography.heading3, color: colors.white, marginTop: 6, lineHeight: 19 },
  cta: {
    minHeight: 34,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  ctaText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.987 }] }
});
