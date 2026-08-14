import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, spacing, typography } from "../theme";

interface ConnexioConfirmDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConnexioConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
  onCancel
}: ConnexioConfirmDialogProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer la confirmation"
        onPress={onCancel}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityRole="alert"
          onPress={() => undefined}
          style={styles.cardShell}
        >
          <LinearGradient colors={gradients.glass} style={styles.card}>
            <View style={[styles.iconShell, destructive && styles.iconShellDanger]}>
              <Ionicons
                name={destructive ? "trash-outline" : "help-circle-outline"}
                size={23}
                color={destructive ? colors.danger : colors.violet}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.button,
                  destructive ? styles.confirmDanger : styles.confirm,
                  pressed && styles.pressed
                ]}
              >
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
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(1,4,12,0.78)",
    alignItems: "center",
    justifyContent: "center"
  },
  cardShell: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 26,
    padding: 1,
    backgroundColor: "rgba(125,97,255,0.48)",
    shadowColor: colors.violet,
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20
  },
  card: {
    borderRadius: 25,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(8,18,38,0.96)"
  },
  iconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 13,
    backgroundColor: "rgba(107,79,234,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  iconShellDanger: { backgroundColor: colors.dangerSoft },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  body: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8
  },
  actions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 20 },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  cancel: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border
  },
  confirm: { backgroundColor: colors.primary },
  confirmDanger: { backgroundColor: "#9F273C" },
  cancelText: { color: colors.textSecondary, fontWeight: "900" },
  confirmText: { color: colors.white, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }
});
