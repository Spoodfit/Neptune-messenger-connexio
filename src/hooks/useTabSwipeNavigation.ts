import { router } from "expo-router";
import { useMemo } from "react";
import { PanResponder } from "react-native";

import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";

export type MainTabName = "messages" | "highlights" | "calls" | "settings";

export function useTabSwipeNavigation(current: MainTabName) {
  const callsAvailable = env.mockMode || capabilitiesForBackendContract(env.backendContract).calls;
  return useMemo(() => {
    const routes: MainTabName[] = callsAvailable
      ? ["messages", "highlights", "calls", "settings"]
      : ["messages", "highlights", "settings"];
    const currentIndex = routes.indexOf(current);
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 32 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
      onPanResponderRelease: (_, gesture) => {
        const deliberate = Math.abs(gesture.dx) >= 80 || (
          Math.abs(gesture.dx) >= 38 && Math.abs(gesture.vx) >= 0.65
        );
        if (!deliberate || currentIndex < 0) return;
        const targetIndex = gesture.dx < 0 ? currentIndex + 1 : currentIndex - 1;
        const target = routes[targetIndex];
        if (!target) return;
        router.replace(`/(tabs)/${target}` as const);
      }
    }).panHandlers;
  }, [callsAvailable, current]);
}
