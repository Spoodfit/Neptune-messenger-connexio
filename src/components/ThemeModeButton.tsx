import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";

export function ThemeModeButton() {
  const theme = useAppTheme();
  const nextMode = theme.isLight ? "dark" : "light";
  const label = theme.isLight ? "Passer en mode sombre" : "Passer en mode clair";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => theme.setMode(nextMode)}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft },
        pressed && styles.pressed
      ]}
    >
      <Ionicons
        name={theme.isLight ? "moon-outline" : "sunny-outline"}
        size={21}
        color={theme.pageText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    marginHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] }
});
