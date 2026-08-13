import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

const ACTION_WIDTH = 92;

export function SwipeableConversationRow({ children, enabled, onDelete, onHide }: { children: React.ReactNode; enabled: boolean; onDelete: () => void; onHide: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const snap = (value: number) => Animated.spring(translateX, { toValue: value, useNativeDriver: true, damping: 20, stiffness: 230, mass: 0.72 }).start();
  const close = () => snap(0);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => enabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 54) snap(ACTION_WIDTH);
      else if (gesture.dx < -54) snap(-ACTION_WIDTH);
      else close();
    },
    onPanResponderTerminate: close
  }), [enabled, translateX]);

  if (!enabled) return <>{children}</>;

  return (
    <View style={styles.stage}>
      <View style={[styles.actionRail, styles.deleteRail]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Supprimer la conversation" onPress={() => { close(); onDelete(); }} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Supprimer</Text>
        </Pressable>
      </View>
      <View style={[styles.actionRail, styles.hideRail]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Masquer la conversation" onPress={() => { close(); onHide(); }} style={styles.actionButton}>
          <Ionicons name="eye-off-outline" size={20} color={colors.white} />
          <Text style={styles.actionText}>Masquer</Text>
        </Pressable>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative", overflow: "hidden", borderRadius: 22 },
  actionRail: { position: "absolute", top: 0, bottom: 8, width: ACTION_WIDTH, justifyContent: "center" },
  deleteRail: { left: 0, backgroundColor: colors.danger },
  hideRail: { right: 0, backgroundColor: colors.surfaceMuted },
  actionButton: { flex: 1, minHeight: 70, alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { color: colors.white, fontSize: 10, fontWeight: "900" }
});
