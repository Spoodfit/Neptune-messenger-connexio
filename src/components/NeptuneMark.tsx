import { Image, StyleSheet, View } from "react-native";

import { NEPTUNE_LOGO_DATA_URI } from "../assets/neptuneLogo";

interface NeptuneMarkProps {
  size?: number;
}

export function NeptuneMark({ size = 56 }: NeptuneMarkProps) {
  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={{ uri: NEPTUNE_LOGO_DATA_URI }}
        resizeMode="contain"
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "100%",
    height: "100%"
  }
});
