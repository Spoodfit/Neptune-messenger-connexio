import { router, useSegments } from "expo-router";
import { type PropsWithChildren, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions } from "react-native";

import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { useReducedMotion } from "../hooks/useReducedMotion";

const CALLS_AVAILABLE = env.mockMode || capabilitiesForBackendContract(env.backendContract).calls;
const ROUTES = CALLS_AVAILABLE
  ? ["messages", "highlights", "calls", "settings"] as const
  : ["messages", "highlights", "settings"] as const;
const TRIGGER_VELOCITY = 0.5;

export function SwipeTabShell({ children }: PropsWithChildren) {
  const segments = useSegments();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const navigatingRef = useRef(false);
  const activeRoute = String((segments as readonly string[])[1] ?? "messages");
  const activeIndex = ROUTES.findIndex((route) => route === activeRoute);
  const triggerDistance = Math.max(54, Math.min(92, width * 0.18));

  const settle = () => {
    if (reducedMotion) {
      translateX.setValue(0);
      return;
    }
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 21,
      stiffness: 250,
      mass: 0.72
    }).start();
  };

  const navigate = (direction: -1 | 1) => {
    if (navigatingRef.current || activeIndex < 0) return settle();
    const target = ROUTES[activeIndex + direction];
    if (!target) return settle();
    navigatingRef.current = true;
    if (reducedMotion || Platform.OS === "web") {
      translateX.setValue(0);
      router.replace(`/(tabs)/${target}` as never);
      navigatingRef.current = false;
      return;
    }

    const exit = direction > 0 ? -width : width;
    Animated.timing(translateX, {
      toValue: exit,
      duration: 165,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      router.replace(`/(tabs)/${target}` as never);
      translateX.setValue(direction > 0 ? Math.min(width * 0.11, 48) : -Math.min(width * 0.11, 48));
      requestAnimationFrame(() => {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 155,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start(() => { navigatingRef.current = false; });
      });
    });
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      if (activeIndex < 0 || navigatingRef.current) return false;
      const absX = Math.abs(gesture.dx);
      const absY = Math.abs(gesture.dy);
      if (absX < 12 || absX <= absY * 1.3) return false;
      if (gesture.dx > 0 && activeIndex === 0) return false;
      if (gesture.dx < 0 && activeIndex === ROUTES.length - 1) return false;
      return true;
    },
    onPanResponderMove: (_, gesture) => {
      const limit = width * 0.58;
      translateX.setValue(Math.max(-limit, Math.min(limit, gesture.dx * 0.92)));
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldMove = Math.abs(gesture.dx) >= triggerDistance || Math.abs(gesture.vx) >= TRIGGER_VELOCITY;
      if (!shouldMove) return settle();
      navigate(gesture.dx < 0 ? 1 : -1);
    },
    onPanResponderTerminate: settle,
    onShouldBlockNativeResponder: () => false
  }), [activeIndex, reducedMotion, translateX, triggerDistance, width]);

  return <Animated.View {...responder.panHandlers} style={[styles.root, { transform: [{ translateX }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
