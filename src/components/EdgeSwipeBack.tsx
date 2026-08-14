import { router, useSegments } from "expo-router";
import { type PropsWithChildren, useMemo, useRef } from "react";
import { Animated, PanResponder, Platform, StyleSheet } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";

const EDGE_WIDTH = 24;
const TRIGGER_DISTANCE = 76;
const TRIGGER_VELOCITY = 0.55;

export function EdgeSwipeBack({ children }: PropsWithChildren) {
  const segments = useSegments();
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const onTabRoot = segments[0] === "(tabs)";
  const onPublicRoot = segments[0] === "sign-in";
  const enabled = Platform.OS !== "web" && !onTabRoot && !onPublicRoot;

  const reset = () => {
    if (reducedMotion) return translateX.setValue(0);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 23,
      stiffness: 245,
      mass: 0.74
    }).start();
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      if (!enabled || gesture.x0 > EDGE_WIDTH || gesture.dx <= 16) return false;
      return gesture.dx > Math.abs(gesture.dy) * 1.65;
    },
    onPanResponderMove: (_, gesture) => {
      translateX.setValue(Math.max(0, Math.min(52, gesture.dx * 0.38)));
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldBack = gesture.dx >= TRIGGER_DISTANCE || gesture.vx >= TRIGGER_VELOCITY;
      if (!shouldBack || !router.canGoBack()) return reset();
      if (reducedMotion) {
        translateX.setValue(0);
        router.back();
        return;
      }
      Animated.timing(translateX, {
        toValue: 72,
        duration: 100,
        useNativeDriver: true
      }).start(() => {
        translateX.setValue(0);
        router.back();
      });
    },
    onPanResponderTerminate: reset
  }), [enabled, reducedMotion, translateX]);

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
