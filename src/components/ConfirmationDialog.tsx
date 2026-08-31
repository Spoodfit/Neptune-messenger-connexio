import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { colors, spacing, typography } from "../theme";

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
  const theme = useAppTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel} statusBarTranslucent>
      <Pressable accessibilityRole="none" onPress={onCancel} style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityRole="alert" onPress={() => undefined} style={styles.cardHitbox}>
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <View style={[styles.iconShell, { backgroundColor: destructive ? theme.dangerSoft : theme.violetSoft, borderColor: destructive ? theme.danger : theme.violet }]}>
              <Ionicons name={icon} size={25} color={destructive ? theme.danger : theme.violet} />
            </View>
            <Text style={[styles.title, { color: theme.pageText }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.pageTextMuted }]}>{message}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} style={({ pressed }) => [styles.button, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }, pressed && styles.pressed]}>
                <Text style={[styles.cancelText, { color: theme.pageTextSecondary }]}>{cancelLabel}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={({ pressed }) => [styles.button, { backgroundColor: destructive ? theme.danger : colors.primary, borderColor: destructive ? theme.danger : colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: spacing.lg, alignItems: "center", justifyContent: "center" },
  cardHitbox: { width: "100%", maxWidth: 420 },
  card: { width: "100%", padding: spacing.lg, borderRadius: 28, borderWidth: 1, shadowOpacity: 0.18, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 24 },
  iconShell: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, marginTop: spacing.md },
  message: { ...typography.body, marginTop: 8 },
  actions: { marginTop: spacing.lg, flexDirection: "row", gap: 10 },
  button: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  cancelText: { fontSize: 14, fontWeight: "900" },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }
});
