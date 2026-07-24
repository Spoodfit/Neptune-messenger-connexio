import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii, spacing, typography } from "@/theme";

interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <Text style={styles.logoText}>N</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Platform.OS === "ios" ? 58 : 28,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "900"
  },
  content: {
    flex: 1
  },
  title: {
    ...typography.display,
    color: colors.white
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.whiteMuted,
    marginTop: 3
  }
});
