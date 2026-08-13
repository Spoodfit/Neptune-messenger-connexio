import { useContext, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { colors, radii } from "../theme";
import { SkeletonPulseContext } from "./SkeletonPulseGroup";

interface LoadingSkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSkeleton({
  width = "100%",
  height,
  radius = radii.md,
  style
}: LoadingSkeletonProps) {
  const sharedOpacity = useContext(SkeletonPulseContext);
  const fallbackOpacity = useRef(new Animated.Value(0.62)).current;
  const opacity = sharedOpacity ?? fallbackOpacity;

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft
  }
});
