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
    width: 78,
    height: 96,
    borderRadius: 48,
    left: 0,
    top: -56,
    backgroundColor: "rgba(0,72,186,0.17)"
  },
  violetGlow: {
    position: "absolute",
    width: 74,
    height: 94,
    borderRadius: 47,
    right: 0,
    top: -58,
    backgroundColor: "rgba(107,79,234,0.14)"
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
