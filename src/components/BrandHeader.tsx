import { Text } from "@/components/LocalizedText";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NEPTUNE_LOGO_DATA_URI } from "@/assets/neptuneLogo";
import { useAppTheme } from "@/providers/ThemeProvider";
import { spacing, typography } from "@/theme";
import { ThemeModeButton } from "./ThemeModeButton";

interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingLeft: spacing.md + insets.left,
          paddingRight: spacing.sm + insets.right,
          backgroundColor: theme.shellBackground,
          borderBottomColor: theme.shellBorder
        }
      ]}
    >
      <View pointerEvents="none" style={[styles.blueGlow, theme.isLight && styles.blueGlowLight]} />
      <View pointerEvents="none" style={[styles.violetGlow, theme.isLight && styles.violetGlowLight]} />
      <View style={styles.logoShell} accessibilityElementsHidden>
        <Image source={{ uri: NEPTUNE_LOGO_DATA_URI }} resizeMode="contain" style={styles.logo} />
      </View>
      <Text accessibilityRole="header" accessibilityHint={subtitle} numberOfLines={1} style={[styles.title, { color: theme.pageText }]}>{title}</Text>
      <ThemeModeButton />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    overflow: "hidden",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  blueGlow: { position: "absolute", width: 78, height: 96, borderRadius: 48, left: 0, top: -56, backgroundColor: "rgba(0,72,186,0.17)" },
  blueGlowLight: { backgroundColor: "rgba(0,72,186,0.08)" },
  violetGlow: { position: "absolute", width: 74, height: 94, borderRadius: 47, right: 0, top: -58, backgroundColor: "rgba(107,79,234,0.14)" },
  violetGlowLight: { backgroundColor: "rgba(107,79,234,0.06)" },
  logoShell: { width: 42, height: 42, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logo: { width: 38, height: 38 },
  title: { ...typography.heading2, flex: 1, minWidth: 0 }
});
