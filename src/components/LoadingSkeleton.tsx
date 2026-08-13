import { useEffect, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { colors, radii } from "../theme";

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
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.46)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(0.64);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

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
