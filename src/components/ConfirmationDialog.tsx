import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, spacing, typography } from "../theme";

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  icon = "alert-circle-outline",
  onCancel,
  onConfirm
}: ConfirmationDialogProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityRole="none" onPress={onCancel} style={styles.backdrop}>
        <Pressable accessibilityRole="alert" onPress={() => undefined} style={styles.cardHitbox}>
          <LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={[styles.iconShell, destructive && styles.iconShellDanger]}>
              <Ionicons name={icon} size={25} color={destructive ? colors.danger : colors.violet} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={({ pressed }) => [styles.button, destructive ? styles.dangerButton : styles.confirmButton, pressed && styles.pressed]}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  cardHitbox: { width: "100%", maxWidth: 420 },
  card: {
    width: "100%",
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(8,18,38,0.98)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24
  },
  iconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(107,79,234,0.15)",
    borderWidth: 1,
    borderColor: "rgba(107,79,234,0.34)",
    alignItems: "center",
    justifyContent: "center"
  },
  iconShellDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(255,123,134,0.35)"
  },
  title: { ...typography.heading2, color: colors.text, marginTop: spacing.md },
  message: { ...typography.body, color: colors.textMuted, marginTop: 8 },
  actions: { marginTop: spacing.lg, flexDirection: "row", gap: 10 },
  button: { flex: 1, minHeight: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  cancelButton: { backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft },
  confirmButton: { backgroundColor: colors.primary },
  dangerButton: { backgroundColor: colors.danger },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "900" },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }
});
