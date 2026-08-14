import { router, useSegments } from "expo-router";
import { type PropsWithChildren, useMemo, useRef } from "react";
import { Animated, PanResponder, Platform, StyleSheet } from "react-native";

import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { useReducedMotion } from "../hooks/useReducedMotion";

const CALLS_AVAILABLE = env.mockMode || capabilitiesForBackendContract(env.backendContract).calls;
const ROUTES = CALLS_AVAILABLE
  ? ["messages", "highlights", "calls", "settings"] as const
  : ["messages", "highlights", "settings"] as const;
const TRIGGER_DISTANCE = 72;
const TRIGGER_VELOCITY = 0.55;

export function SwipeTabShell({ children }: PropsWithChildren) {
  const segments = useSegments();
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const activeRoute = String((segments as readonly string[])[1] ?? "messages");
  const activeIndex = ROUTES.findIndex((route) => route === activeRoute);

  const settle = (target = 0) => {
    if (reducedMotion) {
      translateX.setValue(target);
      return;
    }
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      damping: 22,
      stiffness: 240,
      mass: 0.72
    }).start();
  };

  const navigate = (direction: -1 | 1) => {
    if (activeIndex < 0) return settle();
    const targetIndex = activeIndex + direction;
    const target = ROUTES[targetIndex];
    if (!target) return settle();
    const exit = direction > 0 ? -42 : 42;
    if (reducedMotion || Platform.OS === "web") {
      translateX.setValue(0);
      router.replace(`/(tabs)/${target}` as never);
      return;
    }
    Animated.timing(translateX, {
      toValue: exit,
      duration: 105,
      useNativeDriver: true
    }).start(() => {
      translateX.setValue(direction > 0 ? 30 : -30);
      router.replace(`/(tabs)/${target}` as never);
      requestAnimationFrame(() => settle(0));
    });
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      if (activeIndex < 0) return false;
      const horizontal = Math.abs(gesture.dx) > 44 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.7;
      if (!horizontal) return false;
      if (gesture.dx > 0 && activeIndex === 0) return false;
      if (gesture.dx < 0 && activeIndex === ROUTES.length - 1) return false;
      return true;
    },
    onPanResponderMove: (_, gesture) => {
      const resistance = 0.28;
      translateX.setValue(Math.max(-34, Math.min(34, gesture.dx * resistance)));
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldMove = Math.abs(gesture.dx) >= TRIGGER_DISTANCE || Math.abs(gesture.vx) >= TRIGGER_VELOCITY;
      if (!shouldMove) return settle();
      navigate(gesture.dx < 0 ? 1 : -1);
    },
    onPanResponderTerminate: () => settle()
  }), [activeIndex, reducedMotion, translateX]);

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.root, { transform: [{ translateX }] }]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
