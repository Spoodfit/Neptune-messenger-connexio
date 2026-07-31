import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, gradients } from "../theme";

interface NeptuneMarkProps {
  size?: number;
}

export function NeptuneMark({ size = 56 }: NeptuneMarkProps) {
  const radius = Math.round(size * 0.34);
  return (
    <LinearGradient
      colors={gradients.primaryWarm}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.shell,
        { width: size, height: size, borderRadius: radius }
      ]}
      accessibilityElementsHidden
    >
      <View style={[styles.inner, { borderRadius: Math.max(8, radius - 3) }]}>
        <Text style={[styles.letter, { fontSize: Math.round(size * 0.48) }]}>N</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.violet,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  inner: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  letter: {
    color: colors.white,
    fontWeight: "900",
    lineHeight: undefined
  }
});
