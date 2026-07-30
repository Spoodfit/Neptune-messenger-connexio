import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NEPTUNE_LOGO_DATA_URI } from "@/assets/neptuneLogo";
import { colors, spacing, typography } from "@/theme";

interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingLeft: spacing.md + insets.left,
          paddingRight: spacing.md + insets.right
        }
      ]}
    >
      <View pointerEvents="none" style={styles.blueGlow} />
      <View pointerEvents="none" style={styles.violetGlow} />

      <View style={styles.logoShell} accessibilityElementsHidden>
        <Image
          source={{ uri: NEPTUNE_LOGO_DATA_URI }}
          resizeMode="contain"
          style={styles.logo}
        />
      </View>

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
    minHeight: 58,
    paddingBottom: spacing.sm,
    overflow: "hidden",
    backgroundColor: "rgba(2,7,19,0.98)",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  blueGlow: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    left: -52,
    top: -74,
    backgroundColor: "rgba(0,72,186,0.18)"
  },
  violetGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -48,
    top: -76,
    backgroundColor: "rgba(107,79,234,0.15)"
  },
  logoShell: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: 38,
    height: 38
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    flex: 1,
    minWidth: 0
  }
});
