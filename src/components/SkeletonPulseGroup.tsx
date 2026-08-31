import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef } from "react";
import { Animated
} from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";

type PulseController = {
  opacity: Animated.Value;
  retain: () => () => void;
};

export const SkeletonPulseContext = createContext<PulseController | null>(null);

export function SkeletonPulseGroup({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.62)).current;
  const consumers = useRef(0);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    if (reducedMotion) {
      opacity.setValue(0.64);
      return;
    }
    opacity.setValue(0.46);
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.42, duration: 700, useNativeDriver: true })
      ])
    );
    loopRef.current.start();
  }, [opacity, reducedMotion, stop]);

  const retain = useCallback(() => {
    consumers.current += 1;
    if (consumers.current === 1) start();
    return () => {
      consumers.current = Math.max(0, consumers.current - 1);
      if (consumers.current === 0) stop();
    };
  }, [start, stop]);

  useEffect(() => {
    if (consumers.current > 0) start();
    return stop;
  }, [start, stop]);

  const value = useMemo(() => ({ opacity, retain }), [opacity, retain]);
  return <SkeletonPulseContext.Provider value={value}>{children}</SkeletonPulseContext.Provider>;
}
