import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

const ACTION_WIDTH = 94;
const OPEN_THRESHOLD = 54;

export function SwipeableConversationRow({ children, enabled, onDelete, onHide }: { children: React.ReactNode; enabled: boolean; onDelete: () => void; onHide: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const snap = (value: number) => Animated.spring(translateX, { toValue: value, useNativeDriver: true, damping: 20, stiffness: 230, mass: 0.72 }).start();
  const close = () => snap(0);

  const deleteOpacity = translateX.interpolate({
    inputRange: [0, 18, ACTION_WIDTH],
    outputRange: [0, 0.15, 1],
    extrapolate: "clamp"
  });
  const hideOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, -18, 0],
    outputRange: [1, 0.15, 0],
    extrapolate: "clamp"
  });
  const deleteScale = translateX.interpolate({ inputRange: [0, ACTION_WIDTH], outputRange: [0.82, 1], extrapolate: "clamp" });
  const hideScale = translateX.interpolate({ inputRange: [-ACTION_WIDTH, 0], outputRange: [1, 0.82], extrapolate: "clamp" });

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => enabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onMoveShouldSetPanResponderCapture: (_, gesture) => enabled && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > OPEN_THRESHOLD || gesture.vx > 0.42) snap(ACTION_WIDTH);
      else if (gesture.dx < -OPEN_THRESHOLD || gesture.vx < -0.42) snap(-ACTION_WIDTH);
      else close();
    },
    onPanResponderTerminate: close
  }), [enabled, translateX]);

  if (!enabled) return <>{children}</>;

  return (
    <View style={styles.stage}>
      <Animated.View pointerEvents="box-none" style={[styles.actionRail, styles.deleteRail, { opacity: deleteOpacity, transform: [{ scale: deleteScale }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Supprimer la conversation" onPress={() => { close(); onDelete(); }} style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.actionPressed]}>
          <Ionicons name="trash-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Supprimer</Text>
        </Pressable>
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.actionRail, styles.hideRail, { opacity: hideOpacity, transform: [{ scale: hideScale }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Masquer la conversation" onPress={() => { close(); onHide(); }} style={({ pressed }) => [styles.actionButton, styles.hideButton, pressed && styles.actionPressed]}>
          <Ionicons name="eye-off-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Masquer</Text>
        </Pressable>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={[styles.foreground, { transform: [{ translateX }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative", overflow: "hidden", borderRadius: 22 },
  foreground: { zIndex: 2 },
  actionRail: { position: "absolute", top: 2, bottom: 10, width: ACTION_WIDTH, justifyContent: "center", zIndex: 1 },
  deleteRail: { left: 0, alignItems: "flex-start", paddingLeft: 5 },
  hideRail: { right: 0, alignItems: "flex-end", paddingRight: 5 },
  actionButton: { width: ACTION_WIDTH - 10, minHeight: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1 },
  deleteButton: { backgroundColor: "rgba(167,42,61,0.92)", borderColor: "rgba(255,123,134,0.55)" },
  hideButton: { backgroundColor: "rgba(36,48,77,0.96)", borderColor: "rgba(139,160,210,0.30)" },
  actionPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  actionText: { color: colors.white, fontSize: 10, fontWeight: "900" }
});
