import { createContext, type PropsWithChildren, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";

export const SkeletonPulseContext = createContext<Animated.Value | null>(null);

export function SkeletonPulseGroup({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.46)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(0.64);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.42, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return <SkeletonPulseContext.Provider value={opacity}>{children}</SkeletonPulseContext.Provider>;
}
