import { router, usePathname } from "expo-router";
import { useMemo } from "react";
import { PanResponder, Platform, StyleSheet, View } from "react-native";

export function EdgeSwipeBackGesture() {
  usePathname();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 26,
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.pageX <= 34 &&
          gesture.dx > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dx >= 58 &&
            Math.abs(gesture.dy) <= 72 &&
            router.canGoBack()
          ) {
            router.back();
          }
        }
      }),
    []
  );

  if (Platform.OS !== "android" || !router.canGoBack()) return null;

  return <View {...panResponder.panHandlers} style={styles.edge} />;
}

const styles = StyleSheet.create({
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 26,
    zIndex: 999
  }
});
