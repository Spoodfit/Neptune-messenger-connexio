import { useContext, useEffect, useRef } from "react";
import { Animated, type DimensionValue, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii } from "../theme";
import { SkeletonPulseContext } from "./SkeletonPulseGroup";

interface LoadingSkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSkeleton({ width = "100%", height, radius = radii.md, style }: LoadingSkeletonProps) {
  const controller = useContext(SkeletonPulseContext);
  const fallback = useRef(new Animated.Value(0.62)).current;

  useEffect(() => {
    if (!controller) return;
    return controller.retain();
  }, [controller]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[styles.block, { width, height, borderRadius: radius, opacity: controller ? controller.opacity : fallback }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.borderSoft }
});
