import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAppTheme } from "../providers/ThemeProvider";
import { spacing, typography } from "../theme";

interface ActionConfirmationOverlayProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ActionConfirmationOverlay({ visible, title, message, icon = "checkmark" }: ActionConfirmationOverlayProps) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.86);
      translateY.setValue(12);
      return;
    }
    if (reducedMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 220, mass: 0.7, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 17, stiffness: 210, mass: 0.75, useNativeDriver: true })
    ]).start();
  }, [opacity, reducedMotion, scale, translateY, visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View accessibilityRole="alert" style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Animated.View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow, opacity, transform: [{ scale }, { translateY }] }]}>
          <View style={[styles.iconShell, { backgroundColor: theme.successSoft, borderColor: theme.success }]}><Ionicons name={icon} size={32} color={theme.success} /></View>
          <Text style={[styles.title, { color: theme.pageText }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: theme.pageTextMuted }]}>{message}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 360, padding: spacing.lg, borderRadius: 26, borderWidth: 1, alignItems: "center", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 20 },
  iconShell: { width: 66, height: 66, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, marginTop: spacing.md, textAlign: "center" },
  message: { ...typography.bodySmall, marginTop: 6, textAlign: "center" }
});
