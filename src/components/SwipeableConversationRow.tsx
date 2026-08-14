import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

const ACTION_WIDTH = 74;
const OPEN_THRESHOLD = 44;

export function SwipeableConversationRow({
  children,
  enabled,
  onDelete,
  onHide
}: {
  children: React.ReactNode;
  enabled: boolean;
  onDelete: () => void;
  onHide: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const snap = (value: number) =>
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      damping: 22,
      stiffness: 250,
      mass: 0.7
    }).start();
  const close = () => snap(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          enabled &&
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderMove: (_, gesture) =>
          translateX.setValue(
            Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, gesture.dx))
          ),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > OPEN_THRESHOLD) snap(ACTION_WIDTH);
          else if (gesture.dx < -OPEN_THRESHOLD) snap(-ACTION_WIDTH);
          else close();
        },
        onPanResponderTerminate: close
      }),
    [enabled, translateX]
  );

  if (!enabled) return <>{children}</>;

  return (
    <View style={styles.stage}>
      <View style={[styles.actionRail, styles.deleteRail]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer la conversation"
          onPress={() => {
            close();
            onDelete();
          }}
          style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={19} color={colors.danger} />
          <Text style={[styles.actionText, styles.deleteText]}>Supprimer</Text>
        </Pressable>
      </View>
      <View style={[styles.actionRail, styles.hideRail]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Masquer la conversation"
          onPress={() => {
            close();
            onHide();
          }}
          style={({ pressed }) => [styles.actionButton, styles.hideButton, pressed && styles.pressed]}
        >
          <Ionicons name="eye-off-outline" size={19} color={colors.textSecondary} />
          <Text style={styles.actionText}>Masquer</Text>
        </Pressable>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative", overflow: "hidden", borderRadius: 22 },
  actionRail: {
    position: "absolute",
    top: 4,
    bottom: 12,
    width: ACTION_WIDTH,
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  deleteRail: { left: 0, alignItems: "flex-start", paddingLeft: 4 },
  hideRail: { right: 0, alignItems: "flex-end", paddingRight: 4 },
  actionButton: {
    width: 66,
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  deleteButton: {
    backgroundColor: "rgba(53,21,30,0.94)",
    borderColor: "rgba(255,123,134,0.32)",
    shadowColor: colors.danger
  },
  hideButton: {
    backgroundColor: "rgba(17,28,52,0.96)",
    borderColor: colors.borderSoft,
    shadowColor: colors.primary
  },
  actionText: { color: colors.textSecondary, fontSize: 9, fontWeight: "900" },
  deleteText: { color: colors.danger },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] }
});
