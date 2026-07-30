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
        accessibilityElementsHidden
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <Text style={styles.logoText}>N</Text>
      </LinearGradient>

      <Text
        accessibilityRole="header"
        accessibilityHint={subtitle}
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: Platform.OS === "ios" ? 50 : 18,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: Platform.OS === "ios" ? 96 : 64,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.white,
    fontSize: 21,
    fontWeight: "900"
  },
  title: {
    ...typography.heading2,
    color: colors.white,
    flex: 1
  }
});
